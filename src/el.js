//  Copyright 2018. Akamai Technologies, Inc
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

const logger = require("./logging")
    .createLogger("devops-prov.el");

const expression_parser = require("./expression_parser");
const errors = require("./errors");
const helpers = require("./helpers");

const INCLUDE_TOKEN = "#include:";

/**
 * Private class, helper for dealing with default and override variable values.
 */
class ElContext {
    constructor(...resources) {
        this.values = [];
        this.valueFiles = [];
        for (let res of resources) {
            if (res) {
                this.values.push(res.resource);
                this.valueFiles.push(res.resourcePath)
            }
        }
        this.valuesBackup = _.clone(this.values);
        this.sourceFiles = new Set();
    }

    get(key) {
        let returnValue;
        let hasValue = false;
        let sourceFile = null;
        _.each(this.values, function(value, index) {
            value = value[key];
            if (value !== undefined) {
                hasValue = true;
                if (_.isArray(value) || _.isObject(value)) {
                    this.values[index] = value;
                }
                if (value !== null) {
                    returnValue = value;
                    sourceFile = this.valueFiles[index];
                }
            }
        }, this);

        if (!hasValue) {
            throw new errors.ArgumentError(`Undefined variable: '${key}'`);
        }

        this.sourceFileCandidate = sourceFile;
        this.valueCandidate = returnValue;
        return this;
    }

    finalValue() {
        this.values = _.clone(this.valuesBackup);
        this.sourceFiles.add(this.sourceFileCandidate);
        return this.valueCandidate;
    }
}

/**
 * Small expression language parser. Supports:
 *  - loading and inserting JSON snippet from other files
 *  - evaluation of ${...} expressions in string values. Just values, not keys.
 */
class EL {
    constructor(defaultSource, overrideSource, loadFunction) {
        this.defaultSource = defaultSource;
        this.overrideSource = overrideSource;
        this.loadFunction = loadFunction;
    }

    /**
     * Parse the whole JSON object
     * @param obj
     * @returns {*}
     */
    parseObject(obj) {
        if (_.isArray(obj) || _.isObject(obj)) {
            _.each(obj, function(element, index, obj) {
                if (_.isString(element)) {
                    this.parseString(element, result => {
                        obj[index] = result;
                    });
                } else if (_.isObject(element)) {
                    this.parseChild(element, obj, index);
                } else {
                    this.parseObject(element);
                }
            }, this);
        }
        return obj;
    }

    parseChild(child, parent, key) {
        let includeObject = true;
        let includeIf = child["#includeIf"];
        if (includeIf !== undefined) {
            delete child["#includeIf"];
            this.parseString(includeIf, result => {
                logger.info("got result: ", result);
                if (result === false) {
                    includeObject = false;
                }
            })
        }
        if (includeObject) {
            this.parseObject(child);
        } else {
            if (_.isArray(parent)) {
                parent.splice(key, 1);
            } else {
                delete parent[key];
            }
        }
    }

    resolvePath(path, templateInfo) {
        let obj = templateInfo.resource;
        let templateFilename = templateInfo.resourcePath;
        let variableFilenames = [];
        let pathElements = path.split("/");
        let foundElements = [];
        for (let element of pathElements) {
            foundElements.push(element);
            let index = helpers.parseInteger(element);
            if (isNaN(index)) {
                obj = obj[element];
            } else {
                obj = obj[index];
            }
            if (obj === undefined) {
                break;
            }
            if (_.isString(obj)) {
                if (obj.startsWith(INCLUDE_TOKEN) && _.isFunction(this.loadFunction)) {
                    let includeString = obj.slice(INCLUDE_TOKEN.length);
                    //allow for include string to also use expressions.
                    includeString = expression_parser.parse(includeString, {
                        context: new ElContext(this.defaultSource, this.overrideSource)
                    });
                    let includeInfo = this.loadFunction(includeString);
                    obj = includeInfo.resource;
                    templateFilename = includeInfo.resourcePath;
                    foundElements = [];
                } else if (obj !== "") {
                    let context = new ElContext(this.defaultSource, this.overrideSource);
                    obj = expression_parser.parse(obj, {
                        context
                    });
                    variableFilenames = context.sourceFiles;
                }
            }
        }
        if (_.isObject(obj) || _.isArray(obj)) {
            obj = this.parseObject(obj);
        }
        return {
            template: templateFilename,
            variables: Array.from(variableFilenames),
            location: foundElements.join('/'),
            value: obj
        }
    }

    /**
     * Parse String value
     * @param stringValue
     * @param callback
     */
    parseString(stringValue, callback) {
        logger.info(`parsing: ${stringValue}`);
        if (stringValue.startsWith(INCLUDE_TOKEN) && _.isFunction(this.loadFunction)) {
            let includeString = stringValue.slice(INCLUDE_TOKEN.length);
            //allow for include string to also use expressions.
            includeString = expression_parser.parse(includeString, {
                context: new ElContext(this.defaultSource, this.overrideSource)
            });

            let includeInfo = this.loadFunction(includeString);
            callback(this.parseObject(includeInfo.resource));
        } else if (stringValue !== "") {
            let newValue = expression_parser.parse(stringValue, {
                context: new ElContext(this.defaultSource, this.overrideSource)
            });
            if (newValue !== stringValue) {
                logger.info(`Replacing '${stringValue}' with: '${newValue}'`);
                callback(newValue);
            }
        }
    }
}

module.exports = EL;