const mongoose = require('mongoose')

const ConnectionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["google"]
    },
    uniqueId: {
        type: String,
        unique: true
    },
    accessToken: String,
    metaData: mongoose.Schema.Types.Mixed,
    userId: { // Will be referenced everywhere the role is that of a user
        type: mongoose.Types.ObjectId,
        ref: 'users'
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('social_connections', ConnectionSchema)