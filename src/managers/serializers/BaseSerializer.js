const { ObjectId } = require('mongoose').Types

class BaseSerializer {
    isPopulated(document, field) {
        if (document.populated) {
            return !!document.populated(field) //returns true if the document has that field populated
        }

        let obj = get(document, field)

        if (isArray(obj) && obj.length > 0) {
            //Incase the field is an array, pick the first element of the array
            obj = obj[0]
        }
        return !(obj instanceof ObjectId) //tells you if the id property was replaced with an object. If it was replaced then the id was populated.
    }

    isObjectId(element) {
        return element instanceof ObjectId
    }

    prePopulate(data) {
        const isObjectId = data ? this.isObjectId(data) : null
        if (isObjectId === null) return undefined
        return isObjectId
            ? { _id: data.toString(), isPopulated: false }
            : { _id: data._id.toString(), isPopulated: false }
    }
}

exports.BaseSerializer = BaseSerializer
