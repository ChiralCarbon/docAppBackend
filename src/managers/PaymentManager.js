const { BaseManager } = require('./BaseManager')
const PaymentModel = require('../database/models/payments')
const config = require('config')
const rp = require('request-promise');
const { uuid } = require('uuidv4');

class PaymentManager extends BaseManager {
    constructor() {
        super()
        this.PaymentModel = PaymentModel
    }

    /*
        1. User enters amount 
        2. Frontend sends backend the order amount and other details like creatorId etc. 
        3. Razorpay order created in backend by internally calling Razorpay Orders API with following info: amount, currency, order_id
        4. Razorpay Orders API returns razorpay_order_id,razorpay_payment_id,razorpay_signature
        5. razorpay_order_id is sent to FrontEnd
        6. FrontEnd receives the following mandatory attributes after a succesful payment: razorpay_payment_id, razorpay_order_id, razorpay_signature 
        7. FrontEnd sends these 3 attributes to backend 
        8. Backend verifies signature by generating the same independently using SHA256 and matching it 
        9. After succesful verification, mark order as succesful 
    */

    upsertTransaction(options) {
        return new Promise((resolve, reject) => {
            PaymentModel.findOneAndUpdate(options.queryParams, options.updateParams, { upsert: true }).then((order => {
                resolve(order)
            }))
                .catch(error => {
                    this.logger.error({
                        eventType: "upsertTransaction",
                        error,
                        payload: { queryParams: options.queryParams, updateParams: options.updateParams },
                        message: "Failed in PaymentManager"
                    })
                })
        })
    }

    createOrder(options) {
        return new Promise((resolve, reject) => {
            const transactionId = uuid()
            let razorpayParams = {
                method: 'POST',
                headers: { "Authorization": "Basic " + new Buffer(config.razorpay.api_key + ":" + config.razorpay.api_secret).toString("base64") },
                uri: config.razorpay.orders,
                body: {
                    amount: (options.amount * 100),
                    payment_capture: 1,
                    currency: "INR",
                    notes: { creatorId: options.creatorId }
                },
                json: true // Automatically stringifies the body to JSON
            };
            let that = this // TODO : Update using waterfall

            rp(razorpayParams)
                .then(function (razorpayOrder) {
                    let transactionDetails = {
                        razorpayOrderId: razorpayOrder.id,
                        creatorId: options.creatorId,
                        transactionId: transactionId,
                        amount: options.amount,
                        status: 'razorpayOrderCreated'
                    }
                    that.upsertTransaction({ queryParams: { razorpayOrderId: razorpayOrder.id }, updateParams: transactionDetails }).then((transaction) => {
                        resolve({ razorpay_order_id: razorpayOrder.id }) //front-end would be using underscores
                    })
                        .catch(function (err) {
                            this.logger.error({
                                eventType: "createOrder",
                                error: err,
                                payload: options,
                                message: "Failed in PaymentManager"
                            })
                        });
                })
                .catch(function (err) {
                    this.logger.error({
                        eventType: "createOrder",
                        error: err,
                        payload: options,
                        message: "Failed in PaymentManager"
                    })
                });
        })
    }

    validatePaidOrder(options) {
        return new Promise((resolve, reject) => {
            if (options.status == "success") {
                let generatedSignature = this.generateSignature(options.razorpayOrderId + "|" + options.razorpayPaymentId)

                if (generatedSignature == options.razorpaySignature) {
                    let updateParams = {
                        status: "succesful",
                        razorpayPaymentId: options.razorpayPaymentId,
                        razorpaySignature: options.razorpaySignature
                    }
                    let queryParams = {
                        razorpayOrderId: options.razorpayOrderId
                    }
                    this.upsertTransaction({ queryParams, updateParams }).then((transaction) => {
                        resolve({ razorpay_order_id: options.razorpayOrderId }) //front-end would be using underscores
                    })
                } else {
                    let queryParams = {
                        razorpayOrderId: options.razorpayOrderId
                    }
                    this.upsertTransaction({ queryParams, updateParams: { status: "verificationFailed" } }).then((transaction) => {
                        resolve({ razorpay_order_id: options.razorpayOrderId })
                    })
                }
            } else {
                let queryParams = {
                    razorpayOrderId: options.razorpayOrderId
                }
                this.upsertTransaction({ queryParams, updateParams: { status: "failed" } }).then((transaction) => {
                    resolve({ razorpay_order_id: options.razorpayOrderId })
                })
            }


        })
    }

    generateSignature(data) {
        return require("crypto").createHmac("sha256", config.razorpay.api_secret)
            .update(data)
            .digest("hex");
    }
}

exports.PaymentManager = new PaymentManager()