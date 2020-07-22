const managerList = [
    'UserManager',
    'AuthManager',
    'S3Manager'
]
const { logger } = require('../utils/logger').winston
const DPI = require('../utils/DPI')
/**
 *
 * WHY: To follow the singleton design pattern, where one instance is used wherever needed.
 *  Caching of modules in Node will ensure that only the first require call initilises the functions
 *
 * Loads each manager in managerList
 * Inistiliases each manager and adds it to the exportedObject
 *
 */

try {
    let managerElement
    for (let manager of managerList) {
        managerElement = require(`./${manager}`)[`${manager}`]
        DPI.factory(manager, () => {
            return managerElement
        })
    }
} catch (error) {
    logger.error({
        eventType: 'initialiseManager',
        error,
    })
    throw error
}
