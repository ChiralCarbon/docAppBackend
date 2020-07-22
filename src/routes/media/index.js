const { Router } = require('express')
const authRouter = Router()
const controller = require('./controller')

/**
 * @url POST /api/v1/me/media/image/upload 
 */
authRouter.post('/image/upload', controller.uploadImage)

/**
 * @url delete /api/v1/me/media/image
 */
authRouter.delete('/image', controller.deleteImage)

exports.authRouter = authRouter