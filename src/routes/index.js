const passport = require('passport')

exports.init = (app) => {
    const baseRoute = "/api/v1"

    const authRoute = `${baseRoute}/me`
    //TODO update the authenticate to be called inside a middleware
    app.use(`${authRoute}`, passport.authenticate('jwt', { session: false }))

    app.use("/api/v1/auth", require('./auth').router)

    app.use(`${authRoute}/user`, require('./user').authRouter)
    app.use(`${baseRoute}/user`, require('./user').publicRouter)

    //payments
    app.use(`${baseRoute}/payment`, require('./payment').router)

    app.use(`${authRoute}/media`, require('./media').authRouter)
}