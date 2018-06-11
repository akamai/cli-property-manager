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
const logger = require("./logging")
    .createLogger("devops-prov.envionment");

const errors = require("./errors");

const Network = {
    STAGING: "STAGING",
    PRODUCTION: "PRODUCTION"
};

const Status = {
    ACTIVE: "ACTIVE",
    PENDING: "PENDING",
    FAILED: "FAILED",
    ABORTED: "ABORTED"
};

/**
 * Manages creation and lookup of Edgehostnames.
 * This class is considered private and isn't exported.
 *
 */
class EdgeHostnameManager {
    constructor(environment) {
        this.project = environment.project;
        this.projectInfo = this.project.getProjectInfo();
        this.environment = environment;
        this.papi = environment.getPAPI();
        this.hostnamesCreated = [];
        this.hostnamesFound = [];
        this.errors = [];
        this.existingEdgehostnames = null;
    }

    /**
     * create hostnames associated with property hostnames
     * @returns {Promise.<void>}
     */
    async createEdgeHostnames(hostnames) {
        for (let hostname of hostnames) {
            try {
                if (hostname.edgeHostnameId) {
                    logger.info(`cnameId for '${hostname.cnameFrom}' is already set to: ${hostname.edgeHostnameId}`);
                    continue;
                }
                await this.createEdgeHostname(hostname)
            } catch (error) {
                this.errors.push(error);
            }
        }
        if (this.hostnamesCreated.length > 0 || this.hostnamesFound.length > 0) {
            //we found or created edgehostnames, so let's write the edgehostname ids to disk
            this.environment.storeHostnames(hostnames);
        }
        let envInfo = this.environment.getEnvironmentInfo();
        envInfo.lastSaveHostnameErrors = this.errors;
        this.environment.storeEnvironmentInfo(envInfo);
        return {
            hostnamesCreated: this.hostnamesCreated,
            hostnamesFound: this.hostnamesFound,
            errors: this.errors
        };
    }

    async createEdgeHostname(hostname) {
        if (!_.isObject(this.existingEdgehostnames)) {
            this.existingEdgehostnames = {};
            let edgehostnames = await this.papi.listEdgeHostnames(this.projectInfo.contractId, this.projectInfo.groupId);
            for (let item of edgehostnames.edgeHostnames.items) {
                this.existingEdgehostnames[item.edgeHostnameDomain] = item;
            }
        }

        let foundEdgehostname = this.existingEdgehostnames[hostname.cnameTo];
        if (_.isObject(foundEdgehostname)) {
            hostname.edgeHostnameId = helpers.parseEdgehostnameId(foundEdgehostname.edgeHostnameId);
            hostname.ipVersionBehavior = foundEdgehostname.ipVersionBehavior;
            this.hostnamesFound.push({
                name: hostname.cnameTo,
                id: hostname.edgeHostnameId
            });
            return;
        }

        if (!hostname.cnameTo.endsWith(".edgesuite.net")) {
            this.errors.push({
                message: `'${hostname.cnameTo}' is not a supported edge hostname for creation, needs to be under 'edgesuite.net' domain`,
                messageId: "unsupported_edgehostname",
                edgehostname: hostname.cnameTo
            });
            return;
        }

        let prefix = hostname.cnameTo.slice(0, hostname.cnameTo.length - ".edgesuite.net".length);

        let createReq = {
            productId: this.projectInfo.productId,
            ipVersionBehavior: "IPV6_COMPLIANCE",
            domainPrefix: prefix,
            domainSuffix: "edgesuite.net" //TODO: allow for other domains as well.
        };
        let result = await this.papi.createEdgeHostname(this.projectInfo.contractId, this.projectInfo.groupId, createReq);
        logger.info("Got create edgehostname result:", result);
        hostname.edgeHostnameId = Environment._extractEdgeHostnameId(result);
        this.hostnamesCreated.push({
            name: hostname.cnameTo,
            id: hostname.edgeHostnameId
        });
    }
}

/**
 * represents environment in a devops pipeline
 */
class Environment {
    /**
     * @constructor
     * @param {string} envName - Name of environment
     * @param {object} dependencies - project, getPapi, getTemplate, getMerger are mandatory and envInfo optional
     */
    constructor(envName, dependencies) {
        this.project = dependencies.project;
        this.name = envName;
        this.getPAPI = dependencies.getPAPI;
        this.getTemplate = dependencies.getTemplate;
        this.getMerger = dependencies.getMerger;
        this.shouldProcessPapiErrors = dependencies.shouldProcessPapiErrors || false;
        this.propertyName = envName + "." + this.project.getName();
        this.__envInfo = null;
    }

    /**
     * Creates the property associated with this environment using PAPI
     * and stores the information in $DEVOPS_PROJECT_HOME/<pipeline_name>/<environment_name>/envInfo.json
     * @param {boolean} isInRetryMode - true if in retry mode.
     * @returns {Promise.<void>}
     */
    async create(isInRetryMode) {
        let envInfo = this.getEnvironmentInfo();
        if (!envInfo) {
            envInfo = {
                name: this.name,
                propertyName: this.propertyName
            };
        }
        if (isInRetryMode && envInfo.propertyId) {
            logger.info(`property '${this.propertyName}' already exists and is tied to environment '${this.name}'`);
        } else {
            logger.info(`creating property '${this.propertyName}' tied to environment '${this.name}'`);
            let projectInfo = this.project.getProjectInfo();
            //TODO: handle case where create property worked but we never got the data back.
            let propData = await this.getPAPI().createProperty(this.propertyName,
                projectInfo.productId, projectInfo.contractId, projectInfo.groupId);
            logger.info("propData: ", propData);
            envInfo.propertyId = Environment._extractPropertyId(propData);
        }
        if (!_.isObject(envInfo.latestVersionInfo)) {
            logger.info(`Checking latest version of '${this.propertyName}'`);
            let versionInfo = await this.getPAPI().latestPropertyVersion(envInfo.propertyId);
            envInfo.latestVersionInfo = helpers.clone(versionInfo.versions.items[0]);
            logger.info("envInfo: ", envInfo);
            this.project.storeEnvironmentInfo(envInfo);
        }
    }

    /**
     * extracts property ID out of a create property response object.
     **/
    static _extractPropertyId(item) {
        let propertyLink = item.propertyLink;
        let propIdRegex = /\/papi\/v0\/properties\/(prp_)?(\d+)\?.*/;
        let results = propIdRegex.exec(propertyLink);
        logger.info("results: ", results);
        return parseInt(results[2]);
    }

    static getOtherNetwork(network) {
        if (network === Network.STAGING) {
            return Network.PRODUCTION;
        } else {
            return Network.STAGING;
        }
    }

    /**
     * extracts actiavtion ID from activation link
     * @param item
     * @returns {Number}
     * @private
     */
    static _extractActivationId(item) {
        let activationLink = item.activationLink;
        let activationRegex = /\/papi\/v0\/properties\/(prp_)?\d+\/activations\/(atv_)?(\d+)/;
        let results = activationRegex.exec(activationLink);
        logger.info("activation regex results: ", results);
        return parseInt(results[3]);
    }

    /**
     * extracts edge hostname ID out of a create edge hostname response object.
     **/
    static _extractEdgeHostnameId(item) {
        let edgeHostnameLink = item.edgeHostnameLink;
        let edgeHostnameRegex = /\/papi\/v0\/edgehostnames\/(ehn_)?(\d+)\?.*/;
        let results = edgeHostnameRegex.exec(edgeHostnameLink);
        logger.info("results: ", results);
        return parseInt(results[2]);
    }

    /**
     * extracts version ID out of a create new version response object.
     **/
    static _extractVersionId(item) {
        let versionLink = item.versionLink;
        let versionRegex = /\/papi\/v0\/properties\/(prp_)?\d+\/versions\/(\d+)/;
        let results = versionRegex.exec(versionLink);
        logger.info("results: ", results);
        return parseInt(results[2]);
    }

    checkValidNetwork(network) {
        if (network !== Network.STAGING && network !== Network.PRODUCTION) {
            throw new errors.ArgumentError(
                `network parameter needs to be either 'STAGING' or 'PRODUCTION' but not ${network}`,
                "illegal_network_name", network);
        }
    }

    isActive(network) {
        this.checkValidNetwork(network);
        let envInfo = this.getEnvironmentInfo();
        return _.isObject(envInfo["activeIn_" + network + "_Info"]);
    }

    isLocked() {
        let latest = this.getEnvironmentInfo().latestVersionInfo;
        if (!_.isObject(latest)) {
            return false;
        }
        return latest.productionStatus === Status.ACTIVE || latest.stagingStatus === Status.ACTIVE ||
            latest.productionStatus === Status.PENDING || latest.stagingStatus === Status.PENDING;
    }

    isPendingPromotion() {
        let pendingActivations = this.getEnvironmentInfo().pendingActivations;
        if (!_.isObject(pendingActivations)) {
            return false;
        }
        return _.isNumber(pendingActivations.STAGING) || _.isNumber(pendingActivations.PRODUCTION);
    }

    isDirty() {
        let hostnamesHash = helpers.createHash(this.getHostnames());
        let envInfo = this.getEnvironmentInfo();
        return ((!envInfo.lastSavedHash || envInfo.lastSavedHash !== envInfo.environmentHash) ||
            (!envInfo.lastSavedHostnamesHash || envInfo.lastSavedHostnamesHash !== hostnamesHash));
    }

    /**
     * Provide env data for JSON conversion
     * @returns {{name: *, propertyName: (string|*), propertyId: (null|*), latestVersionInfo: (null|*)}}
     */
    getEnvironmentInfo() {
        if (!this.__envInfo) {
            this.__envInfo = this.project.loadEnvironmentInfo(this.name);
        }
        return this.__envInfo;
    }

    storeEnvironmentInfo(envInfo) {
        this.project.storeEnvironmentInfo(envInfo);
        this.__envInfo = envInfo;
    }

    /**
     * Loads the rule tree for this environment property from PAPI backend
     * @returns {Promise.<*>}
     */
    async getRuleTree(ruleFormat) {
        try {
            let envInfo = this.getEnvironmentInfo();
            return await this.getPAPI().getPropertyVersionRules(
                envInfo.propertyId, envInfo.latestVersionInfo.propertyVersion, ruleFormat);
        } catch (error) {
            logger.error(error);
        }
    }

    /**
     * Retrieve product specific converter rule to convert PAPI ruletree into template and variable defs.
     * @returns {*}
     */
    loadTemplateConverterRules() {
        return this.project.loadAndSubstituteProjectResourceData("template.converter.data.json", {
            environment: this
        });
    }

    /**
     * Create template from ruleTree
     * @param ruleTree {object}
     * @param isNewProperty {boolean} is this for a new property, defaults to true
     * @param variableValuesOnly {boolean} do we only want variables values but not the definitions (because they already exist)
     */
    createTemplate(ruleTree, isNewProperty = true, variableValuesOnly = false) {
        if (_.isString(ruleTree.ruleFormat) && ruleTree.ruleFormat !== "latest") {
            let envInfo = this.getEnvironmentInfo();
            envInfo.suggestedRuleFormat = ruleTree.ruleFormat;
            this.storeEnvironmentInfo(envInfo);
        }
        let productId = this.project.getProjectInfo().productId;
        let template = this.getTemplate(ruleTree, this.loadTemplateConverterRules(), productId, isNewProperty);
        let templateData = template.process();
        if (!variableValuesOnly) {
            this.project.storeTemplate("main.json", templateData.main);
            _.each(templateData.templates, (value, key) => {
                this.project.storeTemplate(key, value);
            }, this);
            this.project.storeVariableDefinitions(templateData.variables);
        }
        this.project.storeEnvironmentVariableValues(templateData.envVariables, this.name);
    }

    /**
     * Return environment specific variable values
     * @returns {*}
     */
    getVariables() {
        return this.project.loadEnvironmentVariableValues(this.name);
    }

    /**
     * Return environment specific hostnames
     * @returns {*}
     */
    getHostnames() {
        return this.project.loadEnvironmentHostnames(this.name);
    }

    /**
     * Store hostnames into hostnames.json file
     * @param hostnames
     */
    storeHostnames(hostnames) {
        this.project.storeEnvironmentHostnames(this.name, hostnames);
    }

    /**
     * Store ruletree in dist folder
     * @param data
     * @return {string}
     */
    storePropertyData(data) {
        return this.project.storeEnvProperty(this.propertyName + ".papi.json", data);
    }

    /**
     * Load ruletree from dist folder
     * @return {object}
     */
    loadPropertyData() {
        return this.project.loadEnvProperty(this.propertyName + ".papi.json");
    }

    /**
     * does ruletree file already exist?
     * @return {boolean}
     */
    existsPropertyData() {
        return this.project.existsEnvProperty(this.propertyName + ".papi.json");
    }

    createPropertyHash() {
        return helpers.createHash(this.loadPropertyData());
    }

    processPapiErrors(errors) {
        if (!this.shouldProcessPapiErrors) {
            return;
        }
        for (let error of errors) {
            if (error.errorLocation) {
                let path = error.errorLocation.slice(2); //get rid of the '#/' part
                error.errorLocation = this.resolvePath(path);
            }
            if (error.location) {
                let path = error.location.slice(1); //get rid of the '/' part
                error.location = this.resolvePath(path);
            }
        }
    }

    processValidationResults(envInfo, validationResult, results) {
        if (_.isArray(validationResult.warnings) && validationResult.warnings.length > 0) {
            this.processPapiErrors(validationResult.warnings);
            envInfo.lastSaveWarnings = validationResult.warnings;
            results.validationWarnings = validationResult.warnings;
        } else {
            envInfo.lastSaveWarnings = [];
        }
        if (_.isArray(validationResult.errors) && validationResult.errors.length > 0) {
            this.processPapiErrors(validationResult.errors);
            envInfo.lastSaveErrors = validationResult.errors;
            this.storeEnvironmentInfo(envInfo);
            this.checkForLastSavedValidationResults(envInfo, results);
        } else {
            envInfo.lastSaveErrors = [];
        }
    }

    /**
     *
     * @param envInfo {object}
     * @param results {object} optional, if not passed throw exception on validation errors
     */
    checkForLastSavedValidationResults(envInfo, results) {
        if (_.isArray(envInfo.lastSaveErrors) && envInfo.lastSaveErrors.length > 0 && !_.isObject(results)) {
            let validationErrors = helpers.jsonStringify(envInfo.lastSaveErrors);
            throw new errors.ValidationError(`Validation errors are being reported: '${validationErrors}'`,
                "validation_errors_present",
                envInfo.lastSaveErrors);
        }
        if (_.isObject(results)) {
            results.validationWarnings = envInfo.lastSaveWarnings;
            results.validationErrors = envInfo.lastSaveErrors;
        }
    }

    /**
     *
     * @param envInfo {object}
     * @param results {object} optional, if not passed throw exception on validation errors
     */
    checkForLastSavedHostnameErrors(envInfo, results) {
        if (_.isArray(envInfo.lastSaveHostnameErrors) && envInfo.lastSaveHostnameErrors.length > 0 && !_.isObject(results)) {
            let hostnameErrors = helpers.jsonStringify(envInfo.lastSaveHostnameErrors);
            throw new errors.ValidationError(`Hostname related errors present: '${hostnameErrors}'`,
                "hostname_errors_present",
                envInfo.lastSaveHostnameErrors);
        }
        if (_.isObject(results)) {
            results.hostnameErrors = envInfo.lastSaveHostnameErrors;
        }
    }

    /**
     * Merge tempate with environment specific variables.
     * @returns {Promise.<void>}
     */
    async merge(validate = true) {
        logger.info(`Merge environment: '${this.name}' in pipeline: '${this.project.projectName}'`);
        let mergeResult = this.getMerger(this.project, this).merge("main.json");
        let fileName = this.storePropertyData(mergeResult.ruleTree);
        let envInfo = this.getEnvironmentInfo();
        let results = {
            fileName: fileName,
            hash: envInfo.environmentHash,
            changesDetected: false,
            validationPerformed: false
        };
        if (envInfo.environmentHash !== mergeResult.hash || envInfo.lastValidatedHash !== envInfo.environmentHash) {
            if (envInfo.environmentHash !== mergeResult.hash) {
                results.changesDetected = true;
                envInfo.environmentHash = mergeResult.hash;
                results.hash = mergeResult.hash;
                envInfo.ruleTreeHash = mergeResult.ruleTreeHash;
                this.storeEnvironmentInfo(envInfo);
                logger.info("resource hash: ", mergeResult.hash);
            }
            if (validate && envInfo.lastValidatedHash !== envInfo.environmentHash) {
                let latest = await this._checkLatestVersion(envInfo);
                try {
                    let validationResult = await this.getPAPI().validatePropertyVersionRules(envInfo.propertyId,
                        latest.propertyVersion, mergeResult.ruleTree, envInfo.suggestedRuleFormat);
                    results.validationPerformed = true;
                    envInfo.lastValidatedHash = envInfo.environmentHash;
                    this.processValidationResults(envInfo, validationResult, results);
                    this.storeEnvironmentInfo(envInfo);
                } catch (error) {
                    if (error instanceof errors.RestApiError) {
                        this.processValidationResults(envInfo, error.args[1], results);
                        this.storeEnvironmentInfo(envInfo);
                    } else {
                        throw error;
                    }
                }
            }
        } else {
            this.checkForLastSavedValidationResults(envInfo, results);
        }
        return results;
    }

    resolvePath(path) {
        let merger = this.getMerger(this.project, this);
        return merger.resolvePath(path, "main.json");
    }

    /**
     * Check if we need to create a new version because the latest version has a pending activation in either networks or is active in either network
     * @param envInfo {object} environment info
     * @return {Promise.<*|envInfo.latestVersionInfo|{propertyVersion, updatedByUser, updatedDate, productionStatus, stagingStatus, etag, productId, ruleFormat}>}
     * @private
     */
    async _checkLatestVersion(envInfo) {
        let latest = envInfo.latestVersionInfo;
        if (this.isLocked()) {
            this._checkForPending(envInfo, Network.STAGING);
            this._checkForPending(envInfo, Network.PRODUCTION);
            let newVersionData = await this.getPAPI().createNewPropertyVersion(envInfo.propertyId, latest.propertyVersion, latest.etag);
            let versionId = Environment._extractVersionId(newVersionData);
            let versionInfo = await this.getPAPI().getPropertyVersion(envInfo.propertyId, versionId);
            latest = helpers.clone(versionInfo.versions.items[0]);
            envInfo.latestVersionInfo = latest;
            this.storeEnvironmentInfo(envInfo);
        }
        return latest;
    }

    /**
     * Save environment specific rule tree + hostnames. Runs merge first.
     * @returns {Promise.<void>}
     */
    async save() {
        let results = await this.merge(false);
        let envInfo = this.getEnvironmentInfo();
        let ruleTree = this.loadPropertyData();
        const papi = this.getPAPI();
        Object.assign(results, {
            storedRules: false,
            edgeHostnames: {
                hostnamesCreated: [],
                hostnamesFound: []
            },
            storedHostnames: false
        });
        if (this.isDirty()) {
            await this._checkLatestVersion(envInfo);
        }
        if (!envInfo.lastSavedHash || envInfo.lastSavedHash !== envInfo.environmentHash) {
            let response = await papi.storePropertyVersionRules(envInfo.propertyId,
                envInfo.latestVersionInfo.propertyVersion, ruleTree, envInfo.suggestedRuleFormat);
            envInfo.latestVersionInfo.etag = response.etag;
            envInfo.lastSavedHash = envInfo.environmentHash;
            envInfo.lastValidatedHash = envInfo.environmentHash;
            results.storedRules = true;
            this.processValidationResults(envInfo, response, results);
            this.storeEnvironmentInfo(envInfo);
        }
        const hostnames = this.getHostnames();
        let hostnamesHash = helpers.createHash(hostnames);
        if (!envInfo.lastSavedHostnamesHash || envInfo.lastSavedHostnamesHash !== hostnamesHash) {
            results.edgeHostnames = await this.createEdgeHostnames(hostnames);
            this.checkForLastSavedHostnameErrors(envInfo, results);
            if (results.edgeHostnames.errors.length === 0) {
                await papi.storePropertyVersionHostnames(envInfo.propertyId,
                    envInfo.latestVersionInfo.propertyVersion, hostnames);
                results.storedHostnames = true;
            }
            hostnamesHash = helpers.createHash(hostnames);
            envInfo.lastSavedHostnamesHash = hostnamesHash;
            this.storeEnvironmentInfo(envInfo);
        } else {
            this.checkForLastSavedHostnameErrors(envInfo, results);
        }
        return results;
    }

    createEdgeHostnames(hostnames) {
        let mgr = new EdgeHostnameManager(this);
        return mgr.createEdgeHostnames(hostnames);
    }

    /**
     * Check if environment is currently active in provided network
     * @param envInfo {object} environment info
     * @param network {string} "STAGING" or "PRODUCTION"
     * @private
     */
    _checkForActive(envInfo, network) {
        if ((network === Network.STAGING && envInfo.latestVersionInfo.stagingStatus === Status.ACTIVE) ||
            (network === Network.PRODUCTION && envInfo.latestVersionInfo.productionStatus === Status.ACTIVE)) {
            throw new errors.AlreadyActiveError(`Latest version already active in '${network}' network`,
                "already_active_error", network, envInfo.latestVersionInfo.propertyVersion);
        }
    }

    /**
     * Check if environment is currently pending in provided network
     * @param envInfo
     * @param network
     * @private
     */
    _checkForPending(envInfo, network) {
        if (_.isObject(envInfo.pendingActivations) &&
            _.isNumber(envInfo.pendingActivations[network])) {
            throw new errors.PendingActivationError(`Activation for '${network}' network already pending`,
                "activation_pending_error", network, envInfo.pendingActivations[network]);
        }
    }
    /**
     * Promote environment to Akamai network by activating the underlying property
     * @param network {string} needs to be exactly "STAGING" or "PRODUCTION"
     * @param emails {list<string>} list of email addresses
     * @return {Promise.<{envInfo: *, pending: {network: *, activationId: Number}}>}
     */
    async promote(network, emails) {
        this.checkValidNetwork(network);
        let envInfo = this.getEnvironmentInfo();
        this._checkForPending(envInfo, network);
        await this.save();
        this.checkForLastSavedValidationResults(envInfo);
        this.checkForLastSavedHostnameErrors(envInfo);
        this._checkForActive(envInfo, network);

        if (!envInfo.lastSavedHash || envInfo.lastSavedHash !== envInfo.environmentHash) {
            throw new errors.DependencyError("Environment data has changed since last save, please merge and save first",
                "cannot_promote_unexpected_changes");
        }
        const hostnames = this.getHostnames();
        const hostnamesHash = helpers.createHash(hostnames);
        logger.info("hostnames hash: ", hostnamesHash);
        if (!envInfo.lastSavedHostnamesHash || envInfo.lastSavedHostnamesHash !== hostnamesHash) {
            throw new errors.DependencyError("Hostname data has changed since last save, please merge and save first",
                "cannot_promote_unexpected_hostname_changes");
        }

        let result = await this.getPAPI().activateProperty(envInfo.propertyId,
            envInfo.latestVersionInfo.propertyVersion, network, Array.from(emails));
        let activationId = Environment._extractActivationId(result);
        if (network === Network.STAGING) {
            envInfo.latestVersionInfo.stagingStatus = Status.PENDING;
        } else {
            envInfo.latestVersionInfo.productionStatus = Status.PENDING;
        }
        if (!_.isObject(envInfo.pendingActivations)) {
            envInfo.pendingActivations = {};
        }
        envInfo.pendingActivations[network] = activationId;
        let otherNetwork = Environment.getOtherNetwork(network);
        let activeInOther = envInfo["activeIn_" + otherNetwork + "_Info"];
        if (activeInOther && activeInOther.propertyVersion === envInfo.latestVersionInfo.propertyVersion) {
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

    _statusIsFinal(status) {
        return status === Status.ACTIVE || status === Status.FAILED || status === Status.ABORTED;
    }

    getPromotionStatus() {
        let envInfo = this.getEnvironmentInfo();
        let statusData = {
            latestVersion: envInfo.latestVersionInfo.propertyVersion,
            activeInStagingVersion: null,
            activeInProductionVersion: null
        };
        let stagingInfo = envInfo['activeIn_STAGING_Info'];
        if (_.isObject(stagingInfo)) {
            statusData.activeInStagingVersion = stagingInfo.propertyVersion;
        }
        let productionInfo = envInfo['activeIn_PRODUCTION_Info'];
        if (_.isObject(productionInfo)) {
            statusData.activeInProductionVersion = productionInfo.propertyVersion;
        }
        return statusData;
    }

    /**
     * check for any pending promotions and if underlying activation became active change status
     *
     * @return {Promise.<{}>}
     */
    async checkPromotions() {
        let envInfo = this.getEnvironmentInfo();
        let results = {};
        if (_.isObject(envInfo.pendingActivations)) {
            let dirty = false;
            let pendingActivations = helpers.clone(envInfo.pendingActivations);
            let papi = this.getPAPI();
            for (let network of _.keys(pendingActivations)) {
                logger.info("found pending activation in network: ", network);
                let result = await papi.activationStatus(envInfo.propertyId, pendingActivations[network]);
                result = result.activations.items[0];
                results[network] = result;
                if (result.network === network && this._statusIsFinal(result.status)) {
                    dirty = true;
                    let versionInfo = await papi.getPropertyVersion(envInfo.propertyId, result.propertyVersion);
                    versionInfo = helpers.clone(versionInfo.versions.items[0]);
                    if (result.propertyVersion === envInfo.latestVersionInfo.propertyVersion) {
                        envInfo.latestVersionInfo = versionInfo;
                    }
                    if (result.status === Status.ACTIVE) {
                        envInfo["activeIn_" + network + "_Info"] = helpers.clone(versionInfo);
                    }
                    let otherNetworkKey = "activeIn_" + Environment.getOtherNetwork(network) + "_Info";
                    let activeInOther = envInfo[otherNetworkKey];
                    if (activeInOther) {
                        if (activeInOther.propertyVersion === result.propertyVersion) {
                            envInfo[otherNetworkKey] = helpers.clone(versionInfo);
                        } else {
                            //TODO: do we really want to call every time?
                            versionInfo = await papi.getPropertyVersion(envInfo.propertyId, envInfo[otherNetworkKey].propertyVersion);
                            envInfo[otherNetworkKey] = helpers.clone(versionInfo.versions.items[0]);
                        }
                    }
                    delete envInfo.pendingActivations[network];
                }
            }
            if (_.isEmpty(envInfo.pendingActivations)) {
                delete envInfo.pendingActivations;
                dirty = true;
            }
            if (dirty) {
                logger.info("updated envInfo: ", envInfo);
                this.project.storeEnvironmentInfo(envInfo);
            }
        }
        return {
            promotionUpdates: results,
            promotionStatus: this.getPromotionStatus()
        };
    }
}

module.exports = Environment;