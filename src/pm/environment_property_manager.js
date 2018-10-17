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

const helpers = require('../helpers');
const logger = require("../logging")
    .createLogger("pm-cli.envionment");

const Environment = require('../environment');

const EdgeDomains = require('../edgehostname_manager').EdgeDomains;

const errors = require("../errors");
/**
 * low level calls for Property Manager property
 */
class EnvironmentPropertyManager extends Environment {
    /**
     * @constructor
     * @param {string} envName - this is an unused property...
     * @param {object} dependencies - project, getPapi, getTemplate, getMerger are mandatory and envInfo optional
     */
    constructor(envName, dependencies) {
        super(envName, dependencies);
        this.propertyName = this.project.getName();
        this.mergeLoggingWording = `Merging property: '${this.project.projectName}'`;

    }

    /**
     * Creates the property associated with this environment using PAPI
     * and stores the information in $AKAMAI_PROJECT_HOME/<project_name>/envInfo.json
     * @param {boolean} isInRetryMode - true if in retry mode.
     * @returns {Promise.<void>}
     */
    async create(createPipelineInfo) {
        let envInfo = this.getEnvironmentInfo();
        if (!envInfo) {
            envInfo = {
                name: this.name,
                propertyName: this.propertyName,
                groupId: createPipelineInfo.groupId,
                isSecure: createPipelineInfo.secureOption || false
            };
        }
        if (createPipelineInfo.isInRetryMode && envInfo.propertyId) {
            logger.info(`property '${this.propertyName}' already exists`);
        } else {
            logger.info(`creating property '${this.propertyName}`);
            let projectInfo = this.project.getProjectInfo();
            //TODO: handle case where create property worked but we never got the data back.
            let propData = await this.getPAPI().createProperty(this.propertyName,
                projectInfo.productId, projectInfo.contractId, envInfo.groupId);
            logger.info("propData: ", propData);
            envInfo.propertyId = Environment._extractPropertyId(propData);
        }
        if (!_.isObject(envInfo.latestVersionInfo)) {
            logger.info(`Checking latest version of '${this.propertyName}'`);
            let versionInfo = await this.getPAPI().latestPropertyVersion(envInfo.propertyId);
            envInfo.latestVersionInfo = helpers.clone(versionInfo.versions.items[0]);
            logger.info("envInfo: ", envInfo);
            this.storeEnvironmentInfo(envInfo);
        }
        this.createHostnamesFile();
    }

    createHostnamesFile() {
        const domain = this.project.projectName;
        const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

        let hostnames = [{
            "cnameFrom": domain,
            "cnameTo": domain + edgeDomain,
            "cnameType": "EDGE_HOSTNAME",
            "edgeHostnameId": null
        }];
        this.project.storeEnvironmentHostnames(this.name, hostnames);
    }

    _checkEnvInfo(envInfo) {
        if (!envInfo.lastSavedHash || envInfo.lastSavedHash !== envInfo.environmentHash) {
            throw new errors.DependencyError("Property data has changed since last save, please merge and save first",
                "cannot_promote_unexpected_changes");
        }
    }

}

module.exports = EnvironmentPropertyManager;