const mongoose = require('mongoose')
const DPI = require('../../utils/DPI')
const http_status = require('http-status')
const { validateAndUploadStreamAsFile, defaultErrorHandler } = require('../middleware/uploads')
const { pictureFileNameFn, pictureValidMimeTypeFn } = require('./helper')
const config = require('config')

exports.getUser = [
    async (req, res, next) => {
        return res.json({ user: req.user })
    }
]

exports.updateUser = [
    async (req, res, next) => {
        try {

            const queryParams = {
                _id: mongoose.Types.ObjectId(req.user._id)
            }

            let updateParams = {}

            if (req.body.username && !req.user.username) {
                updateParams.username = req.body.username.trim().toLowerCase()
                updateParams.shortened_url = await DPI.get("UserManager")
                .fetchShortenedURL(rupdateParams.username)
            }

            if (req.body.social_links) {
                let { social_links } = req.body
                updateParams.social_links = {
                    facebook: social_links.facebook,
                    twitter: social_links.twitter,
                    youtube: social_links.youtube,
                    dribble: social_links.dribble,
                }
            }

            if (req.body.profile && req.body.profile.bio) {
                updateParams["profile.bio"] = req.body.profile.bio
            }

            if (req.body.payment_details) {
                let payment_details = req.body.payment_details

                if (payment_details.upi)
                    updateParams["payment_details.upi"] = payment_details.upi

                if (payment_details.minSupportAmt)
                    updateParams["payment_details.minSupportAmt"] = payment_details.minSupportAmt

                if (payment_details.supportTokenName)
                    updateParams["payment_details.supportTokenName"] = payment_details.supportTokenName

                if (payment_details.supportMessage)
                    updateParams["payment_details.supportMessage"] = payment_details.supportMessage
            }

            const updatedUser = await DPI.get("UserManager").updateUser({ queryParams, updateParams })

            let banner = null;
            if (updatedUser.profileComplete) {
                banner = {
                    message: 'Please fill up the mandatory details which are required to publish this page of yours',
                    type: 'warning'
                }
            }

            return res.status(http_status.OK).json({ user: updatedUser, banner })

        } catch (error) {
            next(error)
        }
    }
]

exports.isUserNameAvailable = [
    async (req, res, next) => {
        try {
            const username = req.query.q ? req.query.q.trim().toLowerCase() : ""

            const result = await DPI.get("UserManager").isUsernameAvailable({ username })

            return res.status(http_status.OK).json(result)

        } catch (error) {
            next(error)
        }
    }
]


exports.uploadProfilePicture = [
    async (req, res, next) => {
        try {
            const userId = req.user._id
            const Bucket = config.get('aws.s3.default.bucket')

            let Key = `public/users/${userId}/profile/pictures/`

            validateAndUploadStreamAsFile({
                Bucket,
                Key,
                validMimeTypeFn: pictureValidMimeTypeFn,
                fileNameFn: pictureFileNameFn,
            })(req, res, next)

        } catch (error) {
            next(error)
        }
    },
    defaultErrorHandler,
    async (req, res, next) => {
        try {
            const { uploadInfo } = req

            const queryParams = {
                _id: mongoose.Types.ObjectId(req.user._id)
            }

            const url = uploadInfo.uploadedInfo[0].Location

            let updateParams = {
                "profile.imageURL": url
            }

            await DPI.get("UserManager").updateUser({ queryParams, updateParams })

            return res.status(http_status.OK).json({ imageURL: url })
        } catch (error) {
            next(error)
        }
    }
]

exports.getPublicUser = [
    async (req, res, next) => {
        try {
            const { publicUser } = await DPI.get("UserManager")
                .fetchPublicUser({ username: req.params.username.toLowerCase() })
            res.status(http_status.OK).json({ publicUser })
        } catch (error) {
            next(error)
        }
    }
]