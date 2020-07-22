const { BaseError } = require('./BaseError')

class ValidationError extends BaseError {
    constructor(payload) {
        super({
            name: 'ValidationError',
            msg: payload.msg,
            data: payload.data,
            eventType: payload.eventType ? payload.eventType : undefined,
        })
    }
}

exports.ValidationError = ValidationError
