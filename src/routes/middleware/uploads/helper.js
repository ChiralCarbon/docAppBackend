const DPI = require('../../../utils/DPI')
const { Readable, PassThrough } = require('stream')
const Busboy = require('busboy')
const { logger } = require('../../../utils/logger')

exports._handleStream = async ({
    Bucket,
    Key,
    req,
    fileSize = null,
    validMimeTypeFn = ({ mimetype }) => true,
    fileNameFn,
    maxFiles = null
}) => {
    try {
        //Keep track of huge files
        const hugeFileSize = []
        //Keep track of files with wrong mimetypes
        const invalidFileTypes = []
        // 6MB size limit, abort upload if file is over 6MB limit by default
        const busboy = new Busboy({
            headers: req.headers,
            limits: {
                fileSize: fileSize ? fileSize : 6 * 1024 * 1024, // maxFileSize in Bytes
            },
        })
        // Promises array for files that are being uploaded.
        const uploadInProgress = []

        //keep track of when file finishes and saved in the disk, busboy is a tricky module
        let counter = 0

        //keeping track of all files uploaded, so that later they get resided, don't have to apply to
        //your case
        const filenames = []

        //The JSON body object being made the form fields
        const body = {}

        //Non upload fields must be first in the upload form or there could be issues
        //with busboy if you want to include other input fields in the upload form, they have to
        //be before the upload field or you will have issue accessing them
        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
            //add checks for field names and extract those values
            logger.debug('Encountered field : ', { fieldname, val })
            body[fieldname] = val
        })

        //assuming that vehicleId is not null, already processed.
        busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
            //validate against empty file fields

            if ((filename.length > 0) && (maxFiles === null || filenames.length < maxFiles)) {
                // validate file mimetype
                if (!validMimeTypeFn({ mimetype })) {
                    //keeping track of invalid files, N/A
                    invalidFileTypes.push({ filename })
                    logger.debug('Encountered file with invalid mime type: ', { filename, mimetype })

                    //Ignore the upload, move on to next one
                    file.resume()
                } else {
                    /*
                     * As soon as the max size limit is reached, the rest of the data is skipped hence,
                     * uploading 50 GB would never be possible because after 2.1 MB no more data
                     * is read and the stream is saved as is and consequently deleted.
                     *
                     */

                    const _customFileName = fileNameFn({ filename, mimetype })

                    // Used to connect the busboy stream to the S3 upload fn as
                    // a stream
                    const passToS3 = new PassThrough()
                    //Reads the stream sent from busboy
                    const fileReadStream = new Readable({
                        read(size) {
                            if (!size) this.push(null)
                            else this.push()
                        },
                    })

                    //Just keeps track of file uploads (how many uploaded).
                    counter++
                    logger.debug(`Encountered file : ${filename}`)

                    //Just keeps track of names of files uploaded, for later resizing purpose.
                    filenames.push({
                        filename,
                        customFileName: _customFileName,
                    })

                    file.on('limit', function () {
                        hugeFileSize.push(filename)
                        //if the file was large in size then decrement the counter as it will be deleted anyways
                        counter--
                        fileReadStream.push(null)
                        logger.debug(`File ${filename} exceeds the max size of ${fileSize} Bytes`)
                        //delete the file that is large in size
                        // delete uploaded S3 file
                        // todo
                    })

                    file.on('data', async data => {
                        fileReadStream.push(data)
                    })

                    file.on('end', () => {
                        fileReadStream.push(null)
                    })

                    passToS3.on('close', function () {
                        //file saved in disk, so decrement.
                        counter--
                    })

                    uploadInProgress.push(
                        sendToS3({ Bucket, Key, filename: _customFileName, passToS3, mimetype, encoding })
                    )

                    fileReadStream.pipe(passToS3)
                }
            } else {
                file.resume()
            }
        })

        const busboyFinish = () => {
            return new Promise((resolve, reject) => {
                busboy.on('finish', async function () {
                    // If busboy has finished reading the stream,
                    // wait for the upload to complete
                    logger.debug('Busboy completed stream, waiting for upload to complete')
                    try {
                        const uploadedInfo = await Promise.all(uploadInProgress)
                        resolve(uploadedInfo)
                    } catch (error) {
                        reject(error)
                    }

                })
            })
        }

        req.pipe(busboy)

        const uploadedInfo = await busboyFinish()
        const result = { uploadedInfo, invalidFileTypes, filenames, hugeFileSize, body }

        logger.debug('Upload completed, results : \n', result)

        return result
    } catch (error) {
        logger.error({
            eventType: '',
            payload: { Bucket, Key, fileSize, validMimeTypeFn, fileNameFn },
            error,
            message: 'Failed in /middlewares/uploads/index.js',
        })

        return Promise.reject(error)
    }
}

const sendToS3 = async ({ passToS3, Bucket, Key, filename, mimetype, encoding }) => {
    try {

        if (process.env.NODE_ENV === 'localhost') Key = "localhost/" + Key

        const metaData = await DPI.get('S3Manager')._uploadFileToS3({
            params: {
                Bucket,
                Key: Key + filename,
                Body: passToS3,
                ContentType: mimetype,
                Encoding: encoding,
            },
        })

        return metaData
    } catch (error) {
        logger.error({
            eventType: 'sendToS3',
            payload: { Bucket, Key, mimetype, encoding, filename },
            error,
            message: 'Failed in /middlewares/uploads/index.js',
        })

        return Promise.reject(error)
    }
}
