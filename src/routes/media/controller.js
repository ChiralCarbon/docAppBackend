const config = require('config')
const http_status = require('http-status')
const mongoose = require('mongoose')
const DPI = require('../../utils/DPI')

const { pictureFileNameFn, pictureValidMimeTypeFn } = require('./helper')
const { validateAndUploadStreamAsFile, defaultErrorHandler } = require('../middleware/uploads')

exports.uploadImage = [
    async (req, res, next) => {
        try {
            const userId = req.user._id
            const Bucket = config.get('aws.s3.default.bucket')

            let Key = `public/users/${userId}/creator/media/pictures/`

            validateAndUploadStreamAsFile({
                Bucket,
                Key,
                validMimeTypeFn: pictureValidMimeTypeFn,
                fileNameFn: pictureFileNameFn,
                maxFiles: 1
            })(req, res, next)

        } catch (error) {
            next(error)
        }
    },
    defaultErrorHandler,
    async (req, res, next) => {
        try {
            const { uploadInfo } = req
            const url = uploadInfo.uploadedInfo[0].Location

            const queryParams = {
                _id: mongoose.Types.ObjectId(req.user._id)
            }

            const updateParams = {
                $push: { 'featured_images': url }
            }

            const updatedUser = await DPI.get("UserManager").updateUser({ queryParams, updateParams })

            return res.status(http_status.OK).json({ url })
        } catch (error) {
            next(error)
        }
    }
]

exports.deleteImage = [
    async (req, res, next) => {
        const { url } = req.body

        await DPI.get("UserManager").deleteFeaturedImage({ userId: req.user._id, url })

        return res.sendStatus(http_status.OK)
    }
]