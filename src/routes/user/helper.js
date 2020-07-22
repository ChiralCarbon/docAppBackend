const mime = require('mime')

exports.pictureFileNameFn = ({ filename, mimetype }) => "profilePicture." + mime.getExtension(mimetype)
exports.pictureValidMimeTypeFn = ({ mimetype }) => {
    switch (mimetype) {
        case mime.getType("png"):
        case mime.getType("jpeg"):
        case mime.getType("jpg"):
        case mime.getType("svg"):
            return true
        default:
            return false
    }
}