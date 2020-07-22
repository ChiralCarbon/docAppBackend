const config = require('config')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { BaseManager } = require('./BaseManager')
const { UserSerializer } = require('./serializers/UserSerializer')
const mongoose = require('mongoose')
const { SendGridService } = require('../services/SendGridService')
const crypto = require("crypto")

class AuthManager extends BaseManager {
    constructor() {
        super()
        this.User = require('../database/models/user')
        this.SocialConnectionModel = require('../database/models/social_connections')
        this.OTPModel = require("../database/models/otps")
        this.EMAIL_OTP = 'email.otp'

        this._registerEvents()
    }

    async generatePasswordHash({ password }) {
        return new Promise((resolve, reject) => {
            bcrypt.hash(
                password,
                config.get("default.auth.saltRounds"),
                function (err, hash) {
                    if (err) return reject(err);
                    else return resolve(hash);
                }
            );
        })
    }


    async validateEmail({ otp }) {
        try {

            const otpDoc = await this.OTPModel
                .findOne({ value: otp, verified: false })
                .populate({
                    model: 'users',
                    path: 'entityId',
                })


            if (!otpDoc) {
                return { validated: false }
            }

            otpDoc.verified = true
            otpDoc.entityId.status = 'onboarding'

            let [doc, user] = await Promise.all([
                otpDoc.save(),
                otpDoc.entityId.save()
            ])

            return { validated: true }
        } catch (error) {
            this.logger.error({
                eventType: "validateEmail",
                error,
                payload: { encryptedOTP }
            })
            throw error
        }
    }

    async comparePasswords({ password, hash }) {
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, hash, (error, matches) => {
                if (error) {
                    reject(new this.VError({
                        name: "InternalError",
                        cause: error
                    }, "bcrypt.compare failed in comparePasswords"))
                } else
                    return resolve(matches);
            })

        })
    }

    generateAccessToken({ accessCode }) {
        return jwt.sign({ accessCode }, config.get("jwt.secret"), { expiresIn: '60d' })
    }

    /**
     * Signs up a creator. Currently made for creator sign up.
     * Can be made generic if needed.
     */
    async creatorSignupViaEmail({ email, name, password }) {
        try {
            const encryptedPwd = await this.generatePasswordHash({ password })
            const accessCode = Math.round(Math.random() * 1000)
            const successResponse = { onboarding: { screen: "emailConfirmation" } }

            const payload = {
                email: email.toLowerCase(),
                name,
                password:
                    encryptedPwd,
                authentication: { accessCode },
                status: "pendingEmailVerification"
            }

            let user = new this.User(payload)

            let existingUser = await this.User.findOne({ email })

            if (existingUser) {
                const msg = "A user already exists with this email id"

                if (existingUser.status === 'pendingEmailVerification') {
                    this._generateOTP({
                        entityId: existingUser._id.toString(),
                        to: existingUser.email
                    })
                    return successResponse
                }

                this.logger.info(msg, { email, name })

                throw new this.VError({
                    name: "ValidationError",
                    info: { name, email }
                }, msg)
            }

            user = await user.save()

            this._generateOTP({
                entityId: user._id.toString(),
                to: user.email
            })

            return successResponse
        } catch (error) {
            this.logger.error({
                eventType: "creatorSignup",
                error,
                payload: { name, email }
            })
            throw error
        }
    }

    async _generateOTP({ entityId, type = 'emailVerification', to }) {
        try {
            const otp = {
                entityId: mongoose.Types.ObjectId(entityId),
                type
            }

            const update = {
                $set: {
                    value: Math.round(Math.random() * 100000),
                    verified: false
                }
            }

            const OTP = await this.OTPModel.findOneAndUpdate(otp, update, { upsert: true, new: true })

            //Send email here
            const params = {
                to,
                otp: OTP.value
            }

            this.emit(this.EMAIL_OTP, (params))
        } catch (error) {
            this.logger.error({
                eventType: "_generateOTP",
                error,
                payload: { entityId, type, to }
            })
            throw error
        }
    }

    // Todo: Fix encrypt decrypt
    _encryptOTP({ otp }) {

        const cipher = crypto.createCipher('aes192', config.get("crypto.aes192.password"))

        let encrypted = cipher.update(otp, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return { encrypted }
    }

    _decryptOTP({ encryptedOTP }) {
        const decipher = crypto.createDecipher('aes192', config.get("crypto.aes192.password"))

        let decrypted = decipher.update(encryptedOTP, 'utf8', 'hex');

        return { decrypted }
    }

    async login({ email, password }) {
        try {
            const user = await this.User.findOne({ email })
            email = email.toLowerCase()

            if (!user) {
                throw new this.VError({
                    name: "ValidationError",
                    info: { email }
                }, "This user does not exist.")
            } else if (user.status === 'pendingEmailVerification') {
                throw new this.VError({
                    name: "ValidationError",
                    info: { email }
                }, "Please verify your email address via the link sent to your email address")
            }

            const validPassword = await this.comparePasswords({ password, hash: user.password })

            if (!validPassword) {
                throw new this.VError({
                    name: "ValidationError",
                }, "This password is invalid")
            }
            const accessToken = this.generateAccessToken({ accessCode: user.authentication.accessCode })

            delete user.authentication

            return { user: UserSerializer.serialized({ user }), accessToken }
        } catch (error) {
            this.logger.error({
                eventType: "login",
                error: error,
                payload: { email }
            }, "AuthManager: Login: An error occurred")
            return Promise.reject(error)
        }
    }

    async googleAuth({ accessToken, profile, refreshToken }) {
        try {

            if (profile.emails.length === 0) {
                throw new this.VError({
                    name: "ValidationError",
                    info: { profile }
                }, "A user already exists with the given email address")
            }

            const connection = {
                type: 'google',
                metaData: profile,
                accessToken: accessToken,
                uniqueId: profile.id,
                email: profile.emails[0].value
            }

            const user = {
                name: profile.displayName,
                email: profile.emails[0].value,
                status: 'onboarding'
            }

            const result = await this._socialSignUpFlow({ user, connection })

            return { user: result.user, accessToken: result.accessToken }
        } catch (error) {
            this.logger.error({
                eventType: "googleAuth",
                error: error,
                payload: { accessToken, profile, refreshToken }
            })
            return Promise.reject(error)
        }
    }

    /**
     * Todo: If the user signed up an an account in the pendingEmailVerification state,
     * Change to enabled state
     * @param {*} param0 
     */
    async _socialSignUpFlow({ connection, user }) {
        try {
            const loginStatus = await this._socialLoginFlow(connection);

            if (loginStatus.success) {
                return loginStatus
            }

            const accessCode = Math.round(Math.random() * 1000)
            const userId = mongoose.Types.ObjectId()

            user.authentication = { accessCode }
            user._id = userId
            connection.userId = userId

            let newUser = new this.User(user)
            let newConnection = new this.SocialConnectionModel(connection)

            await Promise.all([newUser.save(), newConnection.save()])

            const accessToken = this.generateAccessToken({ accessCode })

            return { user: UserSerializer.serialized({ user: newUser }), accessToken }
        } catch (error) {
            this.logger.error({
                eventType: "_socialSignUpFlow",
                error: error,
                payload: { connection, user }
            })
            return Promise.reject(error)
        }
    }

    async _socialLoginFlow({ type, uniqueId, email }) {
        try {
            const connection = await this.SocialConnectionModel.findOne({ type, uniqueId });
            let user;

            if (!connection) {
                if (email) user = await this.User.findOne({ email });
                if (!user) return { success: false }
            } else {
                user = await this.User.findOne({ _id: connection.userId })
            }

            const accessToken = this.generateAccessToken({ accessCode: user.authentication.accessCode })

            delete user.authentication

            return { user: UserSerializer.serialized({ user }), accessToken, success: true }

        } catch (error) {
            this.logger.error({
                eventType: "_socialLoginFlow",
                error: error,
                payload: { type, uniqueId, email }
            })
            return Promise.reject(error)
        }
    }
    _registerEvents() {
        this.on(this.EMAIL_OTP, ({ otp, to }) => {
            const hostname = config.get("hostname")
            const _http = config.get("http")
            const link = `${_http}${hostname}/api/v1/auth/validate/email/${otp}`

            const email = {
                to,
                subject: "Fandome: Your OTP",
                text: `Welcome to Fandome,\nyour link is ${link} \nIt is valid only for the next 12 hours.\nYou can request a new one by signing up via email\n\nCheers,\nFandome`
            }

            SendGridService.sendBareEmail(email)
        })
    }
}

exports.AuthManager = new AuthManager()