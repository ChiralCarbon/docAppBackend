/**
 * Used to validate app/code level validations, not related to routing
 */
const { ValidationError } = require('../errors')
const _valueExists = ({ value, key }) => {
    const type = typeof value

    const _errorResult = (currentVal) => {
        error: new ValidationError({
            msg: `${key} is a required.`,
            data: {
                key,
                value: currentVal,
            }
        })
    }

    switch (type) {
        case 'undefined': {
            return _errorResult(type)
        }
        case 'object': {
            if (value === null) {
                return _errorResult('null')
            } else break;

        }
        case 'string': {
            if (value.trim().length === 0) {
                return _errorResult('""')
            } else break;
        }
    }

    return { error: false }
}

exports.validateFields = ({ schema, object = null }) => {
    const keys = Object.keys(schema)
    let validations, keyName, value;
    for (let i = 0; i < keys.length; i++) {
        keyName = keys[i]
        validations = schema[keyName]
        value = object[keyName]
        if (validations['required']) {
            let { error } = _valueExists({ value, key: keyName })
            if (error) return { error }
        }
    }
    return { error: false }
}