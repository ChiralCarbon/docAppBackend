const mongoose = require('mongoose')
const ms = require('ms')

const OTPSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["emailVerification"]
    },
    value: String, // OTP value
    verified: {
        type: Boolean,
        default: 0
    },
    entityId: mongoose.SchemaTypes.ObjectId,
    expiresBy: {
        type: Date,
        expires: Math.round(ms('12h') / 1000)
    }
}, { timestamps: true })

module.exports = new mongoose.model("otps", OTPSchema)