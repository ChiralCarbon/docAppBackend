const { BaseManager } = require('./BaseManager')
const UserModel = require('../database/models/user')
const { UserSerializer } = require('./serializers/UserSerializer')
const mongoose = require('mongoose')
const rp = require('request-promise');
const config = require('config')

class UserManager extends BaseManager {
    constructor() {
        super()
        this.UserModel = UserModel
        this.UserSerializer = UserSerializer
    }

    async fetchShortenedURL(username) {
        try {
            let rebrandlyParams = {
                method: 'POST',
                headers: { 
                    "apikey": config.rebrandly.API_KEY,
                    "workspace": config.rebrandly.WORKSPACE_ID},
                uri: config.rebrandly.shorten_url,
                body: {
                    destination: `${config.get("http")}${config.get("clients.web.hostname")}/${username}`,
                    domain: {fullName : "rebrand.ly"}
                },
                json: true // Automatically stringifies the body to JSON
            };
            const response = await rp(rebrandlyParams)
            return response.shortUrl
        }
        catch (err) {
          this.logger.error({
            eventType: "fetchShortenedURL",
            error,
            payload: { username: username },
            message: "Failed in UserManager"
        })
          return Promise.reject(error)
        }
      }

    async updateUser({ queryParams, updateParams }) {
        try {

            let user = await this.UserModel.findOneAndUpdate(queryParams, updateParams, { new: true })

            return this.UserSerializer.serialized({ user })

        } catch (error) {
            this.logger.error({
                eventType: "updateUser",
                error,
                payload: { queryParams, updateParams },
                message: "Failed in UserManager"
            })

            return Promise.reject(error)
        }
    }


    async isUsernameAvailable({ username }) {
        try {
            const result = await this.UserModel.countDocuments({ username: username.toLowerCase() })

            return { username, isAvailable: result === 0 }
        } catch (error) {
            this.logger.error({
                eventType: "isUsernameAvailable",
                error,
                payload: { queryParams, updateParams },
                message: "Failed in UserManager"
            })

            return Promise.reject(error)
        }
    }

    async fetchPublicUser({ username }) {
        try {
            const user = await this.UserModel.findOne({ username })
            return { publicUser: UserSerializer.publicView({ user }) }
        } catch (error) {
            this.logger.error({
                eventType: "fetchPublicUser",
                error,
                payload: { username },
                message: "Failed in UserManager"
            })

            return Promise.reject(error)
        }
    }

    async deleteFeaturedImage({ userId, url }) {
        try {

            const queryParams = {
                _id: mongoose.Types.ObjectId(userId)
            }

            const updateParams = {
                $pull: { featured_images: url }
            }
            const { Bucket, Key, fileName } = this.DPI.get("S3Manager")
                .fetchBucketAndKeyFromURL({ link: url })
            const params = { Bucket, Key: Key + '/' + fileName }

            await Promise.all([
                this.DPI.get("S3Manager").deleteObject(params),
                this.updateUser({ queryParams, updateParams })
            ])

            return true

        } catch (error) {
            this.logger.error({
                eventType: "deleteFeaturedImage",
                error,
                payload: { userId, url },
                message: "Failed in UserManager"
            })

            return Promise.reject(error)
        }
    }

}

exports.UserManager = new UserManager()