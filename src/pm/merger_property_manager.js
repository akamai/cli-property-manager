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
const _ = require("underscore");

const errors = require("../errors");
const helpers = require('../helpers');
const Merger = require('../merger');

const logger = require("../logging")
    .createLogger("snippets.merger");
/**
 * Class representing merge operation.
 */
class MergerPropertyManager extends Merger {
    constructor(project, environment, dependencies) {
        super(project, environment, dependencies);
        this.errorString = `Can't load config snippet include: `;
        super.errorString = this.errorString;
        this.errorId = "cannot_load_config_snippet";
        super.errorId = this.errorId;
    }

    __createEL(variableDefinitions, loadFunction) {
        if (variableDefinitions) {
            //this check is so we can use default source IF the file exists
            let defaultValues = _.mapObject(variableDefinitions.resource.definitions, function(value) {
                return value.default;
            });

            let defaultSource = {
                resource: {
                    "env": defaultValues
                },
                resourcePath: variableDefinitions.resourcePath
            };
            return this.getEL(defaultSource, null, loadFunction);
        } else {
            return this.getEL(null, null, loadFunction);
        }
    }

    /**
     * merge template with variables
     * @param filename
     * @returns {*}
     */
    merge(filename) {
        //load variable definitions if the file exists, if not pass on the null
        let variableDefinitions = null;
        try {
            variableDefinitions = this.project.loadVariableDefinitions();
        } catch (exception) {
            logger.info("No variable Definitions, ignore it");
        }

        let hashMaker = new helpers.HashMaker();
        if (variableDefinitions !== null) {
            hashMaker.update(variableDefinitions.resource);
            this.checkVariables(variableDefinitions);
        }
        let template = this.project.loadTemplate(filename);
        hashMaker.update(template.resource);
        let el = this.__createEL(variableDefinitions, name => {
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
        //load variable definitions if the file exists, if not pass on the null
        let variableDefinitions = null;
        try {
            variableDefinitions = this.project.loadVariableDefinitions();
        } catch (exception) {
            logger.info("No variable Definitions, ignore it");
        }
        let template = this.project.loadTemplate(filename);

        let el = this.__createEL(variableDefinitions, name => {
            try {
                return this.project.loadTemplate(name);
            } catch (error) {
                throw new errors.DependencyError(this.errorString + `'${name}'`, this.errorId, name);
            }
        });

        return el.resolvePath(path, template);
    }

    checkVariables(variableDefinitionsResources) {
        //this needed to change since we aren't using a variables.json file anymore
        let variableDefinitions = variableDefinitionsResources.resource.definitions;
        let definitionsFile = variableDefinitionsResources.resourcePath;
        let unused = _.filter(_.keys(variableDefinitions), function(key) {
            let value = variableDefinitions[key].default;
            return value === null || value === undefined;
        });

        if (unused.length > 0) {
            throw new errors.UnusedVariableError(`Variables '${unused.join("', '")}' declared in '${definitionsFile}' without default ` +
                `value`, "unused_variable", ...unused);
        }

        return true;
    }


}

module.exports = MergerPropertyManager;