const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
    amount: {
        type: Number
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum : ['pending','razorpayOrderCreated','succesful','failed','verificationFailed'], //Maintain a separate status for failed verification
        default: 'pending'
    },
    transactionId: { 
        type: String
    },
    creatorId: {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    }
}, {
    timestamps: true
})


paymentSchema.index({
    creatorId: 1
});


module.exports = new mongoose.model('payments', paymentSchema)