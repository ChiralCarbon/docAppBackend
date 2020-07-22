const uploadConfigs = require('config').get('uploads')
const { _handleStream } = require('./helper')
const { logger } = require('../../../utils/logger')
const { ValidationError } = require('../../../utils/errors')
const http_status = require('http-status')

/**
 * @description Global utility middleware to handle uploads effeciently.
 * @important When dealing with large data sets, ALWAYS USE STREAMS unless
 * unavoidable. Streams reduce the memory usage of the server drastically, enabling a faster, lighter scalable server
 */

/**
 * @description Validates a file based on content-type and size, and uploads it to S3
 */
exports.validateAndUploadStreamAsFile = ({
    Bucket,
    Key,
    fileNameFn = ({ filename, mimetype }) => `${filename}`,
    validMimeTypeFn,
    fileSize = uploadConfigs.maxFileSize,
    maxFiles = null
}) => async (req, res, next) => {
    // Parameters to validate the field by
    try {
        logger.debug('Validate and upload file triggered...')

        req.uploadInfo = await _handleStream({ Bucket, Key, req, fileNameFn, validMimeTypeFn, fileSize, maxFiles })

        return next()
    } catch (error) {
        return next(error)
    }
}

exports.defaultErrorHandler = (req, res, next) => {
    const {
        uploadInfo: { invalidFileTypes, hugeFileSize },
    } = req

    let errorFiles = ''
    if (invalidFileTypes.length > 0) {
        for (let i = 0; i < invalidFileTypes.length; i++) {
            if (i === 0) errorFiles = invalidFileTypes[i].filename
            else errorFiles += ', ' + invalidFileTypes[i].filename
        }

        return next(new ValidationError({ msg: `The following files had an invalid mime type: ${errorFiles}` }))
    }

    if (hugeFileSize.length > 0) {
        for (let i = 0; i < hugeFileSize.length; i++) {
            if (i === 0) errorFiles = hugeFileSize[i].filename
            else errorFiles += ', ' + hugeFileSize[i].filename
        }

        return next(
            new ValidationError({ msg: `The following files are larger than the max allowed size: `, errorFiles })
        )
    }

    next()
}