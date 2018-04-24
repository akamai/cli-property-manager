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

const helpers = require('./helpers');
const errors = require('./errors');
const logger = require("./logging")
    .createLogger("devops-prov.template");

/**
 * This should be called TemplateFactory or similar.
 * Creates template files and variable definitions based on PAPI formatted pmData and
 * converter data file.
 */
class Template {
    constructor(pmData, converterData, productId, isForNewProperty = true) {
        this.pmData = helpers.clone(pmData);
        this.converterData = this._prepareConverterData(converterData, productId);
        this.templates = {};
        this.variables = {
            "definitions": {}
        };
        this.envVariables = {};
        this.isForNewProperty = isForNewProperty || false;
    }

    _prepareConverterData(converterData, productId) {
        let productConverterData = converterData.generic;
        if (_.isObject(converterData.productOverrides[productId])) {
            productConverterData = helpers.deepMerge(productConverterData, converterData.productOverrides[productId]);
        }
        return productConverterData;
    }

    resolvePath(path) {
        let pathparts = path.split("/");
        let tempData = this.pmData;
        let prevData, prev2Data;
        for (let part of pathparts) {
            if (part === "#") {
                continue;
            }
            prev2Data = prevData;
            prevData = tempData;
            if (_.isObject(tempData)) {
                tempData = tempData[part];
            } else if (_.isArray(tempData)) {
                tempData = tempData[parseInt(part)];
            } else {
                throw new errors.UnknownTypeError(`Unknown type: ${tempData}`, tempData);
            }
            if (!tempData) {
                return [prev2Data, prevData, part];
            }
        }
    }

    processError(error) {
        if (error.type.endsWith("attribute_required") || error.type.endsWith("option_empty")) {
            logger.info(`processing error with location: ${error.errorLocation}`);
            let [behavior, options, optionName] = this.resolvePath(error.errorLocation);
            logger.info(`replacing ${optionName} of behavior ${behavior.name}`);
            let varDefinition = this.converterData.behaviorMapping[behavior.name];
            if (!varDefinition) {
                logger.warn(`can't find variable specification for behavior ${behavior.name}`);
                return;
            }
            let replacement = varDefinition[optionName];
            if (!replacement) {
                logger.warn(`can't find replacement specification for option ${optionName}`);
                return;
            }
            options[optionName] = replacement.value;
            if (replacement.useVariable) {
                let varDef = {
                    "type": replacement.type,
                    "default": null
                };
                if (replacement.defaultValue) {
                    varDef.default = replacement.defaultValue;
                }
                this.variables.definitions[replacement.name] = varDef;
                this.envVariables[replacement.name] = replacement.overrideValue;
            }
        }
    }

    /**
     * this might need more work, we might want to replace things like quotes and other special characters
     * @param ruleName
     */
    findIncludeNameFor(ruleName) {
        let includeName = ruleName.replace(/\s/g, '_');
        return includeName + ".json";
    }


    processRules() {
        let childRules = this.pmData.rules.children;
        for (let i = 0; i < childRules.length; i++) {
            let ruleName = childRules[i].name;
            logger.info(`looking at rule: ${ruleName}`);
            let includeName = this.converterData.ruleMapping[ruleName];
            if (!includeName) {
                includeName = this.findIncludeNameFor(ruleName);
            }
            this.templates[includeName] = childRules[i];
            childRules[i] = "#include:" + includeName;
        }
    }

    processBehaviors(rule) {
        if (_.isArray(rule.behaviors)) {
            for (let behavior of rule.behaviors) {
                let varDefinition = this.converterData.behaviorMapping[behavior.name];
                if (!_.isObject(varDefinition)) {
                    continue;
                }

                for (let optionName of _.keys(behavior.options)) {
                    let replacement = varDefinition[optionName];
                    if (!replacement) {
                        continue;
                    }
                    behavior.options[optionName] = replacement.value;
                    if (replacement.useVariable) {
                        let varDef = {
                            "type": replacement.type,
                            "default": null
                        };
                        if (replacement.defaultValue) {
                            varDef.default = replacement.defaultValue;
                        }
                        this.variables.definitions[replacement.name] = varDef;
                        this.envVariables[replacement.name] = replacement.overrideValue;
                    }
                }
            }
        }
        if (_.isArray(rule.children)) {
            for (let child of rule.children) {
                this.processBehaviors(child);
            }
        }
    }

    process() {
        let errors = this.pmData.errors;
        if (this.isForNewProperty && _.isArray(errors)) {
            for (let err of errors) {
                this.processError(err);
            }
        } else {
            this.processBehaviors(this.pmData.rules)
        }
        this.processRules();
        return {
            "main": {
                "rules": this.pmData.rules
            },
            "templates": this.templates,
            "variables": this.variables,
            "envVariables": this.envVariables
        };
    }
}

module.exports = Template;