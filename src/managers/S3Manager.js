const { BaseManager } = require('./BaseManager')
const AWS = require('aws-sdk')
const config = require('config')

const configAWSPath = 'aws'

class S3Manager extends BaseManager {
    constructor() {
        super()
        this.AWS = AWS
        this.AWS.config.update({
            accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
            region: 'us-east-1',
        })

        this.S3 = new AWS.S3({ apiVersion: '2006-03-01' })
        this.candidateConfig = {
            resumeStorage: {
                prefix: {
                    unidentified: 'candidate/unidentified/resumes',
                    identified: ({ candidateId }) => `candidate/${candidateId}/resumes`,
                },
            },
        }
    }

    /**
     * Function not to be used outside the class
     * Docs -> https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
     */
    async _uploadFileToS3(payload) {
        return new Promise((resolve, reject) => {

            const { params, options } = payload

            if (!options) {
                this.S3.upload(params, function (error, data) {
                    if (error) return reject(error)
                    else return resolve(data)
                })
            } else {
                this.S3.upload(params, options, function (error, data) {
                    if (error) return reject(error)
                    else return resolve(data)
                })
            }
        })
    }

    async copyObject(params) {
        try {
            return await new Promise((resolve, reject) => {
                this.S3.copyObject(params, (err, data) => {
                    if (err) {
                        reject(err)
                    }
                    resolve(data)
                })
            })
        } catch (error) {
            this.logError({
                error,
                eventType: 'copyObject',
                payload: params,
            })
            return Promise.reject(error)
        }
    }

    fetchBucketAndKeyFromURL({ link }) {
        let linkSplit = link.split('.s3.amazonaws.com/')

        const Bucket = linkSplit[0].split('https://')[1]
        let Key = linkSplit[1].split('/')
        const fileName = Key.splice(-1)[0]
        Key = Key.join('/')
        return {
            Bucket,
            Key,
            fileName,
        }
    }

    async deleteObject(params) {
        try {
            return await new Promise((resolve, reject) => {
                this.S3.deleteObject(params, (err, data) => {
                    if (err) {
                        reject(err)
                    }
                    resolve(data)
                })
            })
        } catch (error) {
            this.logError({
                error,
                eventType: 'deleteObject',
                payload: params,
            })
            return Promise.reject(error)
        }
    }

    /**
     * Used to upload images to S3.
     * Default Access Control Level is public-read
     * Key path should be /:userId/:folderName/{(optional):subFolderName(s)}/:fileName
     */
    async uploadImageToS3(payload) {
        const params = {
            Bucket: config.get(`${configAWSPath}.assetsBucket`),
            ...payload.params,
        }

        if (payload.params['ContentType'].split('/')[0] != 'image') {
            //MIME Type is not image
            const { Body, ...filteredPayload } = payload
            return Promise.reject(
                new this.ValidationError({
                    msg: 'INVALID_MIME_TYPE: Mime Type is not of an image',
                    payload: filteredPayload,
                    eventType: 'uploadImageToS3',
                })
            )
        }

        const uploadResult = await this._uploadFileToS3({
            params,
            options: null,
        })

        return uploadResult
    }
}

exports.S3Manager = new S3Manager()
