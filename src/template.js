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
    constructor(pmData, converterData, productId) {
        this.pmData = helpers.clone(pmData);
        this.converterData = Template._prepareConverterData(converterData, productId);
        this.templates = {};
        this.variables = {
            "definitions": {}
        };
        this.envVariables = {};
        this.isSecure = this.pmData.rules.options.is_secure || false;
    }

    static _prepareConverterData(converterData, productId) {
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

    processError(errors) {
        if (_.isArray(errors)) {
            for (let error of errors) {
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
        }
    }

    /**
     * this might need more work, we might want to replace things like quotes and other special characters
     * @param ruleName
     */
    static findIncludeNameFor(ruleName) {
        let includeName = ruleName.replace(/[\s/;,|&:]+/g, '_');
        includeName = includeName.replace(/(^\.)|(\.$)/g, '');
        return includeName + ".json";
    }


    processRules() {
        let childRules = this.pmData.rules.children;
        let ruleCounter = {};
        for (let i = 0; i < childRules.length; i++) {
            let ruleName = childRules[i].name;
            logger.info(`looking at rule: ${ruleName}`);
            let includeName = this.converterData.ruleMapping[ruleName];
            if (!includeName) {
                includeName = Template.findIncludeNameFor(ruleName);
            }
            let count = ruleCounter[includeName];
            if (count === undefined) {
                ruleCounter[includeName] = 1;
            } else {
                count++;
                ruleCounter[includeName] = count;
                includeName = includeName.slice(0, includeName.length - 5) + "_" + count + ".json"
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
                if (behavior.name === "origin" && this.isSecure) {
                    //new properties are created by default non secure.
                    //adding default origin options required for secure properties
                    //they might exist if rule tree comes from existing property
                    //we don't want to override the option, only add if not exist.
                    let options = behavior.options;
                    if (!_.isNumber(options.httpsPort)) {
                        options.httpsPort = 443;
                    }
                    if (!_.isBoolean(options.originSni)) {
                        options.originSni = true;
                    }
                    if (!_.isString(options.verificationMode)) {
                        options.verificationMode = "PLATFORM_SETTINGS"
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

    processUserVariables() {
        //This is blank.  We do not normally process user variables.
    }

    doNothing() {

    }

    doProcessUserVariableValues() {
        //replacing the variables value with an environment variable
        //environment variable placed in the variableDefinitions
        let variables = this.pmData.rules.variables;
        if (_.isArray(variables)) {
            for (let i = 0; i < variables.length; i++) {
                let varDef = {
                    "type": "userVariableValue",
                    "default": null
                };
                let varName = variables[i].name;
                let varValue = variables[i].value;
                varDef.default = varValue;
                this.variables.definitions[`${varName}_value`] = varDef;
                this.envVariables[`${varName}_value`] = null;
                variables[i].value = `\${env.${varName}_value}`;
            }
        }
    }

    process(mode = helpers.allowedModes[0]) {
        this.loadMode(mode);
        this.processError(this.pmData.errors);
        this.processBehaviors(this.pmData.rules);
        this.processUserVariables();
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

    loadMode(mode) {
        //Determines how the template will process behaviors and user variables
        if (mode === helpers.allowedModes[0]) {
            //default - Everything is setup to do this already
        } else if (mode === helpers.allowedModes[1]) {
            //no variables
            this.processError = this.doNothing;
            this.processBehaviors = this.doNothing;

        } else if (mode === helpers.allowedModes[2]) {
            //user variable values only
            this.processError = this.doNothing;
            this.processBehaviors = this.doNothing;
            this.processUserVariables = this.doProcessUserVariableValues
        }
    }
}

module.exports = Template;