const { Router } = require('express')
const authRouter = Router()
const publicRouter = Router()
const controller = require('./controller')
/**
 * @route GET /api/v1/me/user
 */
authRouter.get("/", controller.getUser)
/**
 * @route PUT /api/v1/me/user
 */
authRouter.put("/", controller.updateUser)
/**
 * @route POST /api/v1/me/user
 */
authRouter.put("/profile/picture", controller.uploadProfilePicture)
/**
 * @route GET /api/v1/user/username/available
 */
publicRouter.get("/username/available", controller.isUserNameAvailable)

publicRouter.get("/:username", controller.getPublicUser)

exports.authRouter = authRouter
exports.publicRouter = publicRouter