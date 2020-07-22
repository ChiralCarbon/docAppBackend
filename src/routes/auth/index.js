const { Router } = require('express')
const router = Router()
const controller = require('./controller')

router.post("/signup", controller.creatorSignup)
router.post("/login", controller.login)
router.post("/google", controller.googleAuth)
router.get("/validate/email/:OTP", controller.validateEmail)

exports.router = router