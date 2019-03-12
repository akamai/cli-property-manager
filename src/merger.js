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


const _ = require("underscore");

const errors = require("./errors");
const helpers = require('./helpers');

/**
 * Class representing merge operation.
 */
class Merger {
    constructor(project, environment, dependencies) {
        this.project = project;
        this.environment = environment;
        this.getEL = dependencies.getEL;
        this.errorString = `Can't load template include: `;
        this.errorId = "cannot_load_template";
    }

    __createEL(variables, variableDefinitions, loadFunction) {
        let defaultValues = _.mapObject(variableDefinitions.resource.definitions, function(value) {
            return value.default;
        });

        let defaultSource = {
            resource: {
                "env": defaultValues
            },
            resourcePath: variableDefinitions.resourcePath
        };
        let overrideSource = {
            resource: {
                "env": variables.resource
            },
            resourcePath: variables.resourcePath
        };

        return this.getEL(defaultSource, overrideSource, loadFunction);
    }

    /**
     * merge template with variables
     * @param filename
     * @returns {*}
     */
    merge(filename) {
        let variables = this.environment.getVariables();
        let variableDefinitions = this.project.loadVariableDefinitions();
        let hashMaker = new helpers.HashMaker();
        hashMaker.update(variableDefinitions.resource);
        hashMaker.update(variables.resource);
        let template = this.project.loadTemplate(filename);
        hashMaker.update(template.resource);
        this.checkVariables(variables, variableDefinitions);
        let el = this.__createEL(variables, variableDefinitions, name => {
            try {
                let include = this.project.loadTemplate(name);
                hashMaker.update(include.resource);
                return include
            } catch (error) {
                throw new errors.DependencyError(this.errorString + `'${name}'`, this.errorId, name);
            }
        });

        let ruleTree = el.parseObject(template.resource);
        return {
            ruleTree: ruleTree,
            ruleTreeHash: helpers.createHash(ruleTree),
            hash: hashMaker.digest()
        }
    }

    resolvePath(path, filename) {
        let variables = this.environment.getVariables();
        let variableDefinitions = this.project.loadVariableDefinitions();
        let template = this.project.loadTemplate(filename);

        let el = this.__createEL(variables, variableDefinitions, name => {
            try {
                return this.project.loadTemplate(name);
            } catch (error) {
                throw new errors.DependencyError(this.errorString + `'${name}'`, this.errorId, name);
            }
        });

        return el.resolvePath(path, template);
    }

    /**
     * Check if variables are properly declared and have assigned value
     * TODO: check for declared and valued variables that aren't used anywhere
     * TODO: check if variable type agrees with option type (difficult)
     * @param variableValuesResources
     * @param variableDefinitionsResources
     */
    checkVariables(variableValuesResources, variableDefinitionsResources) {
        let variableValues = variableValuesResources.resource;
        let valuesFile = variableValuesResources.resourcePath;
        let variableDefinitions = variableDefinitionsResources.resource.definitions;
        let definitionsFile = variableDefinitionsResources.resourcePath;
        let unused = _.filter(_.keys(variableDefinitions), function(key) {
            let value = variableValues[key];
            return value === null || value === undefined;
        });
        for (let unusedKey of unused) {
            let definition = variableDefinitions[unusedKey];
            if (definition.default === null || definition.default === undefined) {
                throw new errors.UnusedVariableError(`Variable '${unusedKey}' declared in '${definitionsFile}' without default ` +
                    `value and no value given in '${valuesFile}'`, "unused_variable", unusedKey);
            }
        }
        let undef = _.filter(_.keys(variableValues), function(key) {
            return !_.has(variableDefinitions, key);
        });
        if (undef.length > 0) {
            throw new errors.UndefinedVariableError(`Variables '${undef.join("', '")}' not declared in ` +
                `'${definitionsFile}' but value assigned in '${valuesFile}'`,
                "undefined_variables", ...undef);
        }
        return true;
    }
}

module.exports = Merger;