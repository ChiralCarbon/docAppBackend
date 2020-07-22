const mongoose = require('mongoose')

const authSchema = new mongoose.Schema({
    accessCode: String
}, {
    timestamps: false
})

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    password: String,
    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: false,
        unique: true
    },
    authentication: {
        type: authSchema
    },
    creatorId: { // Will be referenced everywhere the role is that of a creator
        type: mongoose.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    status: {
        type: String,
        enum: ["enabled", "disabled", "pendingEmailVerification", "onboarding"]
    },
    username: {
        type: String
    },
    shortened_url: {
        type: String
    },
    social_links: {
        facebook: String,
        twitter: String,
        youtube: String,
        dribble: String
    },
    profile: {
        imageURL: String,
        bio: String
    },
    payment_details: {
        upi: String,
        minSupportAmt: String,
        supportTokenName: {
            type: String,
            enum: ['coffee', 'chocolate', 'bouquet'],
            default: 'coffee'
        },
        supporters: Number,
        totalAmtRecieved: Number,
        supportMessage: String,
    },
    featured_images: [String]
}, {
    timestamps: true
})

module.exports = new mongoose.model('users', UserSchema)