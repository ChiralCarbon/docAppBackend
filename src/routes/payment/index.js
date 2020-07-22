const { Router } = require('express')
const router = Router()
const controller = require('./controller')

router.post("/order", controller.createOrder)
router.put("/order", controller.validatePaidOrder)

exports.router = router