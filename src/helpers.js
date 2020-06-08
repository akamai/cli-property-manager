//  Copyright 2020. Akamai Technologies, Inc
//  
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  
//      http://www.apache.org/licenses/LICENSE-2.0
//  
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.


const _ = require('underscore');
const crypto = require('crypto');
const errors = require('./errors');

class HashMaker {
    constructor() {
        this.hash = crypto.createHash('sha256');
    }

    update(content) {
        this.hash.update(JSON.stringify(content));
    }

    digest() {
        return this.hash.digest('hex');
    }
}

const allowedModes = ["default", "no-var", "user-var-value"];
const allowedModesImportUpdateLocal = ["no-var", "user-var-value"];



const INTEGER = /^(0|[1-9][0-9]*)$/;

const parseInteger = function(intString) {
    if (INTEGER.test(intString)) {
        return parseInt(intString)
    }
    return NaN;
};

//copies everything with respect to keys
//while copying arrays index is treated as keys and only the respective values are replaced
//without disturbing the other elements in the array
const deepMerge = function(obj1, obj2) {
    _.each(obj2, function(value, key) {
        if (_.isObject(obj1[key]) && _.isObject(value)) {
            obj1[key] = deepMerge(obj1[key], value);
        } else {
            obj1[key] = value;
        }
    });
    return obj1;
};

const parseNumericResourceId = function(id, prefix, idName, errorId) {
    let parsedValue = id;
    if (_.isString(id) && _.isString(prefix) && id.startsWith(prefix)) {
        parsedValue = id.slice(prefix.length);
    }
    parsedValue = parseInteger(parsedValue);
    if (_.isNaN(parsedValue)) {
        throw new errors.ArgumentError(`'${id}' does not look like a valid ${idName}.`, errorId, id);
    }
    return parsedValue;
};

const parsePrefixableNumeric = function(prefix) {
    return function(id) {
        let parsedValue = id;
        if (_.isString(prefix) && id.startsWith(prefix)) {
            parsedValue = id.slice(prefix.length);
        }
        parsedValue = parseInteger(parsedValue);
        if (_.isNaN(parsedValue)) {
            parsedValue = null;
        }
        return parsedValue;
    };
};

const prefixeableString = function(prefix) {
    return function(id) {
        let parsedValue = id;
        if (_.isString(prefix) && id.startsWith(prefix)) {
            parsedValue = id.slice(prefix.length);
        }
        return parsedValue;
    };
};

module.exports = {
    parseInteger: parseInteger,

    allowedModes: allowedModes,

    allowedModesImportUpdateLocal: allowedModesImportUpdateLocal,

    repeatable: function(parseFunction) {
        return function(value, memo) {
            memo.push(parseFunction(value));
            return memo;
        }
    },

    isArrayWithData: function(arrayData) {
        return _.isArray(arrayData) && arrayData.length > 0;
    },

    parseGroupId: function(groupId) {
        return parseNumericResourceId(groupId, "grp_", "groupId", "illegal_group_id");
    },

    parsePrefixableNumeric: parsePrefixableNumeric,

    prefixeableString: prefixeableString,

    parsePropertyId: function(propertyId) {
        return parseNumericResourceId(propertyId, "prp_", "propertyId", "illegal_property_id");
    },

    parseActivationId: function(activationId) {
        return parseNumericResourceId(activationId, "atv_", "activationId", "illegal_activation_id");
    },

    parseEdgehostnameId: function(edgehostnameId) {
        return parseNumericResourceId(edgehostnameId, "ehn_", "edgehostnameId", "illegal_edgehostname_id");
    },

    parsePropertyVersion: function(versionNum) {
        return parseNumericResourceId(versionNum, null, "property version", "illegal_property_version");
    },

    /**
     * create sha256 hex has from an object.
     * @param object
     */
    createHash: function(...objects) {
        const hash = crypto.createHash('sha256');
        for (let obj of objects) {
            hash.update(JSON.stringify(obj));
        }
        return hash.digest('hex');
    },

    jsonStringify: function(object) {
        return JSON.stringify(object, null, 4);
    },


    /**
     * Deep clone an object
     * @param object
     */
    clone: function(object) {
        return JSON.parse(JSON.stringify(object))
    },

    /**
     * merge attributes from obj2 into obj1. If attribute exists in obj1 it will be overwritten.
     * for now Object.assign can do the job, but we might want to merge nested objects later on.
     * @param obj1
     * @param obj2
     */
    mergeObjects: function(obj1, obj2) {
        return Object.assign({}, obj1, obj2);
    },

    deepMerge: deepMerge,
    HashMaker: HashMaker

};