const { VError } = require('@netflix/nerror')
const { logger } = require('../utils/logger')
const { EventEmitter } = require('events')

class BaseManager extends EventEmitter {
    constructor() {
        super();
        this.VError = VError
        this.logger = logger
        this.DPI = require("../utils/DPI")
    }
}

exports.BaseManager = BaseManager