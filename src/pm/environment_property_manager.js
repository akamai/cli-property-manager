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
const EdgeHostnameManager = require('../edgehostname_manager').EdgeHostnameManager;

const errors = require("../errors");

const ActivationType = require('../enums/ActivationType');
const Network = require('../enums/Network');
const Status = require('../enums/Status');

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
                projectInfo.productId, projectInfo.contractId, envInfo.groupId, null, createPipelineInfo.propertyId, createPipelineInfo.propertyVersion);
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

    async importProperty(createPipelineInfo) {
        let envInfo = {
            name: this.name,
            propertyId: createPipelineInfo.propertyId,
            propertyName: this.propertyName,
            groupId: createPipelineInfo.groupId,
            isSecure: createPipelineInfo.secureOption || false
        };
        logger.info(`Checking latest version of '${this.propertyName}'`);
        let versionInfo = await this.getPAPI().latestPropertyVersion(envInfo.propertyId);
        envInfo.latestVersionInfo = helpers.clone(versionInfo.versions.items[0]);
        logger.info("envInfo: ", envInfo);
        //
        this.storeEnvironmentInfo(envInfo);
        this.createHostnamesFile();
        this.update(envInfo.isSecure);

    }
    /**
     * update the environment info and hostname using PAPI
     * @param {boolean} isSecure - The secure field is from ruletree, which is retrieved from elsewhere
     * @returns {Promise.<void>}
     */
    async update(isSecure) {
        await this.checkPromotions();
        await this.updateEnvInfo(isSecure);

        let envInfo = this.getEnvironmentInfo();

        let hostnameResponse = await this.getPAPI().getPropertyVersionHostnames(envInfo.propertyId, envInfo.latestVersionInfo.propertyVersion);
        let hostnames = hostnameResponse.hostnames.items;

        let mgr = new EdgeHostnameManager(this);
        mgr.cleanHostnameIds(hostnames);
        this.project.storeEnvironmentHostnames(this.name, hostnames);


    }

    /**
     * Deactivate environment to Akamai network by deactivating the underlying property
     * @param propertyId {string} active property to be deactivated
     * @param propertyVersion active version of the property to be deactivated
     * @param network {string} needs to be exactly "STAGING" or "PRODUCTION"
     * @param emails {list<string>} list of email addresses
     * @param message {string} promotion message sent to the activation backend
     * @return {Promise.<{envInfo: *, pending: {network: *, activationId: Number}}>}
     */
    async deactivate(network, emails, message, activationType = ActivationType.DEACTIVATE) {
        this.checkValidNetwork(network);
        let envInfo = this.getEnvironmentInfo();
        await this.checkPromotions();
        this._checkForPending(envInfo, network);

        let propertyId = envInfo.propertyId;
        let result = await this.getPAPI().getPropertyInfo(propertyId);
        let propertyVersion;
        if (network === "STAGING") {
            propertyVersion = result.properties.items[0].stagingVersion;
        } else if (network === "PRODUCTION") {
            propertyVersion = result.properties.items[0].productionVersion;
        }
        // propertyVersion undefined implies papi didn't return the expected output
        if (propertyVersion === undefined) {
            throw new errors.UndefinedVariableError("Active property version is undefined", "undefined_active_version");
        }
        // propertyVersion null implies there is no active version of the property on the network
        if (propertyVersion === null) {
            throw new errors.NotActiveError(`No version of the property with id = ${propertyId} is active on ${network} network`,
                "no_property_active_error");
        }
        logger.info(`Deactivating property with id = ${propertyId} and version = ${propertyVersion} on ${network} network`);

        let data = await this.getPAPI().activateProperty(propertyId,
            propertyVersion, network, Array.from(emails), message, activationType);

        let activationId = Environment._extractActivationId(data);
        if (envInfo.latestVersionInfo.propertyVersion === propertyVersion) {
            if (network === Network.STAGING) {
                envInfo.latestVersionInfo.stagingStatus = Status.PENDING;
            } else {
                envInfo.latestVersionInfo.productionStatus = Status.PENDING;
            }
        }

        if (!_.isObject(envInfo.pendingActivations)) {
            envInfo.pendingActivations = {};
        }
        envInfo.pendingActivations[network] = activationId;
        let otherNetwork = Environment.getOtherNetwork(network);
        let activeInOther = envInfo["activeIn_" + otherNetwork + "_Info"];
        if (activeInOther && activeInOther.propertyVersion === propertyVersion) {
            if (network === Network.STAGING) {
                envInfo["activeIn_" + otherNetwork + "_Info"].stagingStatus = Status.PENDING;
            } else {
                envInfo["activeIn_" + otherNetwork + "_Info"].productionStatus = Status.PENDING;
            }
        }

        this.storeEnvironmentInfo(envInfo);
        return {
            envInfo: helpers.clone(envInfo),
            pending: {
                network,
                activationId
            }
        };
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