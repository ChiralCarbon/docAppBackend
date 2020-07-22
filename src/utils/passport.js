const passport = require('passport');
const GoogleTokenStrategy = require('passport-google-token').Strategy;
const config = require('config')
const { AuthManager } = require('../managers/AuthManager')
const JWTStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

const UserModel = require('../database/models/user')
const { UserSerializer } = require("../managers/serializers/UserSerializer")
const logger = require('../utils/logger').logger

passport.use(new GoogleTokenStrategy({
    clientID: config.get("authentication.google.client_id"),
    clientSecret: config.get("authentication.google.client_secret")
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            const result = await AuthManager.googleAuth({ accessToken, profile, refreshToken })
            done(false, result.user, { accessToken: result.accessToken })
        } catch (error) {
            if (error.name === 'ValidationError') {
                return done(false, null, { message: error.message })
            } else {
                done(error, null, null)
            }
        }

    }
));

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.get("jwt.secret"),
    passReqToCallback: true,
}

passport.use(
    new JWTStrategy(opts, async (req, jwtPayload, done) => {
        try {
            const { accessCode } = jwtPayload

            const user = await UserModel.findOne({ "authentication.accessCode": accessCode })

            if (!user) {
                return done(null, null, "This access token is invalid")
            } else {
                return done(null, UserSerializer.serialized({ user }))
            }
        } catch (error) {
            logger.error({
                eventType: "JWTStrategy",
                error,
                jwtPayload
            })
            done(error, null, "An internal server error occured")
        }
    })
)