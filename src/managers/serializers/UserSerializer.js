const { BaseSerializer } = require('./BaseSerializer')

class UserSerializer extends BaseSerializer {
    constructor() { super() }

    serialized({ user }) {
        if (!user) return null
        if (user.$isEmpty()) return null
        if (user.serialized) return user //So we dont serialize a serialized object

        const { social_links, payment_details } = user

        const serialized = {
            _id: user._id.toString(),
            creatorId: user.creatorId.toString(),
            social_links: {
                facebook: social_links.facebook ? social_links.facebook : null,
                twitter: social_links.twitter ? social_links.twitter : null,
                youtube: social_links.youtube ? social_links.youtube : null,
                dribble: social_links.dribble ? social_links.dribble : null,
            },
            profile: {
                imageURL: user.profile.imageURL ? user.profile.imageURL : null,
                bio: user.profile.bio ? user.profile.bio : null
            },
            payment_details: {
                upi: payment_details.upi ? payment_details.upi : null,
                minSupportAmt: payment_details.minSupportAmt ? payment_details.minSupportAmt : null,
                supporters: payment_details.supporters,
                totalAmtRecieved: payment_details.totalAmtRecieved,
                supportTokenName: payment_details.supportTokenName ? payment_details.supportTokenName : null,
                supportMessage: payment_details.supportMessage
            },
            name: user.name,
            shortened_url: user.shortened_url,
            email: user.email,
            status: user.status,
            username: user.username,
            profileComplete: !!user.name && !!payment_details.upi && !!payment_details.minSupportAmt && !!payment_details.supportTokenName,
            featured_images: user.featured_images ? user.featured_images : [],
            serialized: true
        }

        return serialized
    }

    publicView({ user }) {
        let data
        if (!user.serialized) data = this.serialized({ user })
        else data = user

        delete data._id
        delete data.status
        delete data.payment_details.upi
        delete data.payment_details.supporters
        delete data.profileComplete
        return data
    }

}

exports.UserSerializer = new UserSerializer()