const logger = require('../logger')
const { VError } = require('@netflix/nerror')

class BaseError extends VError {
    constructor(payload) {
        super()
        this.name = payload.name
        this.message = payload.msg
        this.eventType = payload.eventType
        this.data = payload.data
        this.isCustomError = true

        if (payload.cause) {
            this.cause = payload.cause
        }

        this.logError()
    }

    logError() {
        logger.error({
            eventType: this.eventType,
            message: 'Validation Error: ' + this.message,
            payload: this.data,
            cause: {
                name: this.cause.name,
                message: this.cause.message
            }
        })
    }
}

exports.BaseError = BaseError
