const PaymentManager = require('../../managers/PaymentManager').PaymentManager
const http_status = require('http-status')

exports.createOrder = [
    (req, res, next) => {
        try {
            const { amount, creatorId } = req.body
            PaymentManager.createOrder({ amount, creatorId }).then((result) => {
                res.status(http_status.OK).json(result)
            })
        } catch (error) {
            next(error)
        }
    }
]

exports.validatePaidOrder = [
    (req, res, next) => {
        try {
            const paymentDetails = {
                razorpayOrderId: req.body.razorpay_order_id,
                razorpayPaymentId: req.body.razorpay_payment_id,
                razorpaySignature: req.body.razorpay_signature,
                status: 'success'
            }
            PaymentManager.validatePaidOrder(paymentDetails).then((result) => {
                res.status(http_status.OK).json(result)
            })
        } catch (error) {
            next(error)
        }
    }
]