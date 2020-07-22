const AuthManager = require('../../managers/AuthManager').AuthManager
const http_status = require('http-status')
const passport = require('passport')
const config = require('config')

exports.creatorSignup = [
    async (req, res, next) => {
        try {
            const { email, password, name } = req.body

            const result = await AuthManager.creatorSignupViaEmail({ email, password, name })
            res.status(201).json(result)
        } catch (error) {
            next(error)
        }
    }
]

exports.login = [
    async (req, res, next) => {
        try {
            const { email, password } = req.body

            const result = await AuthManager.login({
                email, password
            })
            res.status(http_status.OK).json(result)
        } catch (error) {
            next(error)
        }
    }
]

exports.googleAuth = [
    async (req, res, next) => {
        passport.authenticate('google-token', function (err, user, info) {
            if (err) { return next(err); }
            if (!user) { return res.status(400).json({ error: info.message }); }

            res.status(200).json({ user, accessToken: info.accessToken })
        })(req, res, next);
    }

]

exports.validateEmail = [
    async (req, res, next) => {
        try {
            const { validated } = await AuthManager.validateEmail({
                otp: req.params.OTP
            })

            const redirectTo = `${config.get("http")}${config.get("clients.web.hostname")}/login?validatedEmail=${validated}`

            res.redirect(redirectTo)
        } catch (error) {
            next(error)
        }
    }
]