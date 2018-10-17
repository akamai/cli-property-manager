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

const errors = require("../errors");
const helpers = require('../helpers');
const Merger = require('../merger');

/**
 * Class representing merge operation.
 */
class MergerPropertyManager extends Merger {
    constructor(project, environment, dependencies) {
        super(project, environment, dependencies);
    }

    __createEL(variables, variableDefinitions, loadFunction) {
        return this.getEL(null, null, loadFunction);
    }

    /**
     * merge template with variables
     * @param filename
     * @returns {*}
     */
    merge(filename) {
        let hashMaker = new helpers.HashMaker();
        let template = this.project.loadTemplate(filename);
        hashMaker.update(template.resource);
        let el = this.__createEL(null, null, name => {
            try {
                let include = this.project.loadTemplate(name);
                hashMaker.update(include.resource);
                return include
            } catch (error) {
                throw new errors.DependencyError(`Can't load config snippet include: '${name}'`,
                    "cannot_load_config_snippet", name);
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
        let template = this.project.loadTemplate(filename);

        let el = this.__createEL(null, null, name => {
            try {
                return this.project.loadTemplate(name);
            } catch (error) {
                throw new errors.DependencyError(`Can't load config snippet include: '${name}'`,
                    "cannot_load_config_snippet", name);
            }
        });
        return el.resolvePath(path, template);
    }

}

module.exports = MergerPropertyManager;