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
const logger = require("./logging")
    .createLogger("devops-prov.envionment");
const EdgeHostnameManager = require('./edgehostname_manager').EdgeHostnameManager;
const errors = require("./errors");

const Network = require('./enums/Network');
const Status = require('./enums/Status');

const EdgeDomains = require('./edgehostname_manager').EdgeDomains;


/**
 * represents environment in a Akamai PD pipeline
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
        this.getMerger = dependencies.getMerger;
        this.shouldProcessPapiErrors = dependencies.shouldProcessPapiErrors || false;
        let projectInfo = this.project.getProjectInfo();
        if (_.isBoolean(projectInfo.customPropertyName) && projectInfo.customPropertyName) {
            this.propertyName = envName;
        } else {
            this.propertyName = envName + "." + this.project.getName();
        }
        this.__envInfo = null;
        this.mergeLoggingWording = `Merge environment: '${this.name}' in pipeline: '${this.project.projectName}'`;
    }

    /**
     * Creates the property associated with this environment using PAPI
     * and stores the information in $AKAMAI_PROJECT_HOME/<pipeline_name>/<environment_name>/envInfo.json
     * @param {boolean} isInRetryMode - true if in retry mode.
     * @returns {Promise.<void>}
     */
    async create(createPipelineInfo) {
        let projectInfo = this.project.getProjectInfo();
        if (projectInfo.customPropertyName !== createPipelineInfo.customPropertyName) {
            logger.error('mismatch in customPropertyName field');
            throw new errors.ArgumentError(
                `customPropertyName mismatch`,
                "check_customPropertyName_field", projectInfo.customPropertyName);
        }
        if (projectInfo.associatePropertyName !== createPipelineInfo.associatePropertyName) {
            logger.error('mismatch in associatePropertyName field');
            throw new errors.ArgumentError(
                `associatePropertyName mismatch`,
                "check_associatePropertyName_field", projectInfo.associatePropertyName);
        }
        if (_.isBoolean(projectInfo.associatePropertyName) && projectInfo.associatePropertyName) {
            this.propertyName = this.name;
            logger.info(`associate property name ${this.propertyName} will be used`);

        } else if (_.isBoolean(projectInfo.customPropertyName) && projectInfo.customPropertyName) {
            this.propertyName = this.name;
            logger.info(`custom property name ${this.propertyName} will be used`);
        }
        let envInfo = null;
        try {
            envInfo = this.getEnvironmentInfo();
        } catch (error) {
            // does not exist so create default instead
            envInfo = {
                name: this.name,
                propertyName: this.propertyName,
                groupId: createPipelineInfo.environmentGroupIds[this.name],
                isSecure: createPipelineInfo.secureOption || false
            };
        }

        if (createPipelineInfo.isInRetryMode && envInfo.propertyId) {
            logger.warn(`property '${this.propertyName}' already exists and is tied to environment '${this.name}'`);

        } else if (_.isBoolean(createPipelineInfo.associatePropertyName) && createPipelineInfo.associatePropertyName) {
            logger.info(`associating property '${this.propertyName}' tied to environment '${this.name}'`);
            let results = await this.getPAPI().findProperty(this.propertyName);
            if (results.versions.items.length === 0) {
                throw new errors.ArgumentError(`Can't find any version of property '${this.propertyName}'`,
                    "property_does_not_exist_on_server", this.propertyName);
            }
            let propertyId = results.versions.items[0].propertyId;

            let latestVersion = 0;
            for (let i = 0; i < results.versions.items.length; i++) {
                if (latestVersion < results.versions.items[i].propertyVersion) {
                    latestVersion = results.versions.items[i].propertyVersion;
                }
            }
            logger.info("Current latest version: ", latestVersion);
            let latestResult = await this.getPAPI().createNewPropertyVersion(propertyId, latestVersion);
            logger.info("Creating version: ", latestResult);
            envInfo.propertyId = propertyId;

        } else {
            logger.info(`creating property '${this.propertyName}' tied to environment '${this.name}'`);
            let projectInfo = this.project.getProjectInfo();
            //TODO: handle case where create property worked but we never got the data back.
            let propData = await this.getPAPI().createProperty(this.propertyName,
                projectInfo.productId, projectInfo.contractId, envInfo.groupId, createPipelineInfo.ruleFormat, createPipelineInfo.propertyId, createPipelineInfo.propertyVersion);
            logger.info("propData: ", propData);
            envInfo.propertyId = Environment._extractPropertyId(propData);
        }
        if (!_.isObject(envInfo.latestVersionInfo)) {
            logger.info(`Checking latest version of '${this.propertyName}'`);
            let versionInfo = await this.getPAPI().latestPropertyVersion(envInfo.propertyId);
            envInfo.latestVersionInfo = helpers.clone(versionInfo.versions.items[0]);
            delete envInfo['latestVersionInfo']['etag'];
            logger.info("envInfo: ", envInfo);
            this.storeEnvironmentInfo(envInfo);
        }
        this.createHostnamesFile();
    }

    createHostnamesFile() {
        const domain = this.project.projectName;
        const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

        let projectInfo = this.project.getProjectInfo();
        let cnameFrom, cnameTo;
        if (_.isBoolean(projectInfo.customPropertyName) && projectInfo.customPropertyName) {
            cnameFrom = this.name;
            cnameTo = this.name + edgeDomain;
        } else {
            cnameFrom = this.name + "." + domain;
            cnameTo = this.name + "." + domain + edgeDomain;
        }
        let hostnames = [{
            "cnameFrom": cnameFrom,
            "cnameTo": cnameTo,
            "cnameType": "EDGE_HOSTNAME",
            "edgeHostnameId": null
        }];

        this.project.storeEnvironmentHostnames(this.name, hostnames);
    }

    /**
     * extracts property ID out of a create property response object.
     **/
    static _extractPropertyId(item) {
        let propertyLink = item.propertyLink;
        let propIdRegex = /\/papi\/v[0-1]\/properties\/(prp_)?(\d+)\?.*/;
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
        let activationRegex = /\/papi\/v[0-1]\/properties\/(prp_)?\d+\/activations\/(atv_)?(\d+)/;
        let results = activationRegex.exec(activationLink);
        logger.info("activation regex results: ", results);
        return parseInt(results[3]);
    }

    /**
     * extracts version ID out of a create new version response object.
     **/
    static _extractVersionId(item) {
        let versionLink = item.versionLink;
        let versionRegex = /\/papi\/v[0-1]\/properties\/(prp_)?\d+\/versions\/(\d+)/;
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
        //if its pending, obviously its not active
        //if there is no activeIn or latest version, then nothing is active
        if (this.isPendingPromotion(network) ||
            !_.isObject(envInfo["activeIn_" + network + "_Info"]) ||
            !_.isObject(envInfo.latestVersionInfo)) {
            return false;
        }

        //The 'latest info' and 'active in' objects should match
        return (_.isEqual(envInfo["activeIn_" + network + "_Info"], envInfo.latestVersionInfo));
    }

    isLocked() {
        let latest = this.getEnvironmentInfo().latestVersionInfo;
        if (!_.isObject(latest)) {
            return false;
        }
        return latest.productionStatus !== Status.INACTIVE || latest.stagingStatus !== Status.INACTIVE;
    }

    isPendingPromotion(network) {
        let pendingActivations = this.getEnvironmentInfo().pendingActivations;
        if (!_.isObject(pendingActivations)) {
            return false;
        }
        if (!network) {
            return _.isNumber(pendingActivations.STAGING) || _.isNumber(pendingActivations.PRODUCTION);
        } else {
            this.checkValidNetwork(network);
            return _.isNumber(pendingActivations[network]);
        }
    }

    isDirty() {
        let hostnamesHash = helpers.createHash(this.getHostnames());
        let envInfo = this.getEnvironmentInfo();
        //need to make the hash of the environment, to be sure we are checking against the latest "saved"
        this.merge(false);
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

    setupEnvRuleFormat(ruleTree) {
        let envInfo = this.getEnvironmentInfo();
        if (_.isString(ruleTree.ruleFormat) && ruleTree.ruleFormat !== "latest") {
            envInfo.suggestedRuleFormat = ruleTree.ruleFormat;
            this.storeEnvironmentInfo(envInfo);
        }
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
            if (error.added) {
                for (let added of error.added) {
                    if (added.location) {
                        let path = added.location.slice(2); //get rid of the '#/' part
                        added.location = this.resolvePath(path);
                    }
                }
            }
            if (error.removed) {
                for (let removed of error.removed) {
                    if (removed.location) {
                        let path = removed.location.slice(2); //get rid of the '#/' part
                        removed.location = this.resolvePath(path);
                    }
                }
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
        //TODO this shouldn't be the same method for both assigning the results object and for doing a check
        if (_.isArray(envInfo.lastSaveHostnameErrors) && envInfo.lastSaveHostnameErrors.length > 0 && !_.isObject(results)) {
            let hostnameErrors = helpers.jsonStringify(envInfo.lastSaveHostnameErrors);
            throw new errors.ValidationError(`Hostname related errors present: '${hostnameErrors}'`,
                "hostname_errors_present",
                envInfo.lastSaveHostnameErrors);
        }
        if (_.isObject(results)) {
            results.hostnameErrors = envInfo.lastSaveHostnameErrors;
            results.hostnameWarnings = envInfo.lastSaveHostnameWarnings;
        }
    }

    /**
     * Merge template with environment specific variables.
     * @returns {Promise.<void>}
     */
    async merge(validate = true) {
        logger.info(this.mergeLoggingWording);
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
                    if (error instanceof errors.RestApiError && error.args[1]["type"] !== undefined && error.args[1]["type"].includes("json-schema-invalid")) {
                        results.validationPerformed = true;
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
     * @return {Promise.<*|envInfo.latestVersionInfo|{propertyVersion, updatedByUser, updatedDate, productionStatus, stagingStatus, productId, ruleFormat}>}
     * @private
     */
    async _checkLatestVersion(envInfo) {
        let latest = envInfo.latestVersionInfo;
        if (this.isLocked()) {
            let newVersionData = await this.getPAPI().createNewPropertyVersion(envInfo.propertyId, latest.propertyVersion);
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
            try {
                let response = await papi.storePropertyVersionRules(envInfo.propertyId,
                    envInfo.latestVersionInfo.propertyVersion, ruleTree, envInfo.suggestedRuleFormat);
                envInfo.lastSavedHash = envInfo.environmentHash;
                envInfo.lastValidatedHash = envInfo.environmentHash;
                results.storedRules = true;
                this.processValidationResults(envInfo, response, results);
                this.storeEnvironmentInfo(envInfo);
            } catch (error) {
                if (error instanceof errors.RestApiError && error.args[1]["type"] !== undefined && error.args[1]["type"].includes("json-schema-invalid")) {
                    this.processValidationResults(envInfo, error.args[1], results);
                    this.storeEnvironmentInfo(envInfo);
                } else {
                    throw error;
                }
            }
        }
        const hostnames = this.getHostnames();
        let hostnamesHash = helpers.createHash(hostnames);
        if (!envInfo.lastSavedHostnamesHash || envInfo.lastSavedHostnamesHash !== hostnamesHash) {
            results.edgeHostnames = await this.createEdgeHostnames(hostnames);
            this.checkForLastSavedHostnameErrors(envInfo, results);
            if (results.edgeHostnames.errors.length === 0) {
                let versionHostnamesResponse = await papi.storePropertyVersionHostnames(envInfo.propertyId,
                    envInfo.latestVersionInfo.propertyVersion, hostnames, this.project.getProjectInfo().contractId, envInfo.groupId, true);
                //unless a 400 or 500 is thrown, it will always save/store to the version.
                results.storedHostnames = true;
                envInfo.lastSaveHostnameErrors = [];
                envInfo.lastSaveHostnameWarnings = [];
                results.hostnameErrors = [];
                results.hostnameWarnings = [];
                if (_.isArray(versionHostnamesResponse.errors) && versionHostnamesResponse.errors.length > 0) {
                    envInfo.lastSaveHostnameErrors = versionHostnamesResponse.errors;
                    results.hostnameErrors = envInfo.lastSaveHostnameErrors;
                }
                if (_.isArray(versionHostnamesResponse.warnings) && versionHostnamesResponse.warnings.length > 0) {
                    envInfo.lastSaveHostnameWarnings = versionHostnamesResponse.warnings;
                    results.hostnameWarnings = envInfo.lastSaveHostnameWarnings;
                }
                let hostnamesResponse = versionHostnamesResponse.hostnames.items;
                let mgr = new EdgeHostnameManager(this);
                mgr.cleanHostnameIds(hostnamesResponse);
                this.storeHostnames(hostnamesResponse);
            }
            hostnamesHash = helpers.createHash(hostnames);
            envInfo.lastSavedHostnamesHash = hostnamesHash;
            this.storeEnvironmentInfo(envInfo);
        } else {
            this.checkForLastSavedHostnameErrors(envInfo, results);
        }
        return results;
    }

    /**
     * Change rule format for a pipeline or an environment.
     * @returns {Promise.<void>}
     */
    async changeRuleFormat(envName, ruleFormat) {
        let results = await this.merge(false);
        let envInfo = this.getEnvironmentInfo();
        let ruleTree = this.loadPropertyData();
        if (_.isString(ruleFormat)) {
            try {
                let response = await this.getPAPI().storePropertyVersionRules(envInfo.propertyId,
                    envInfo.latestVersionInfo.propertyVersion, ruleTree, ruleFormat);
                envInfo.lastSavedHash = envInfo.environmentHash;
                envInfo.lastValidatedHash = envInfo.environmentHash;
                results.storedRules = true;
                console.log("Updated rule format for", envName, ":", response.ruleFormat);
                envInfo.latestVersionInfo.ruleFormat = response.ruleFormat;
                this.processValidationResults(envInfo, response, results);
                this.storeEnvironmentInfo(envInfo);
            } catch (error) {
                if (error instanceof errors.RestApiError && error.args[1]["type"] !== undefined && error.args[1]["type"].includes("json-schema-invalid")) {
                    this.processValidationResults(envInfo, error.args[1], results);
                    this.storeEnvironmentInfo(envInfo);
                } else if (error instanceof errors.RestApiError && error.args[1]["type"] !== undefined && error.args[1]["type"].includes("unsupported-media-type")) {
                    throw new errors.RestApiError(error, `invalid_ruleformat`,
                        "invalid rule format is passed");
                } else {
                    throw error;
                }
            }
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

    _checkEnvInfo(envInfo) {
        if (!envInfo.lastSavedHash || envInfo.lastSavedHash !== envInfo.environmentHash) {
            throw new errors.DependencyError("Environment data has changed since last save, please merge and save first",
                "cannot_promote_unexpected_changes");
        }
    }
    /**
     * Promote environment to Akamai network by activating the underlying property
     * @param network {string} needs to be exactly "STAGING" or "PRODUCTION"
     * @param emails {list<string>} list of email addresses
     * @param message {string} promotion message sent to the activation backend
     * @return {Promise.<{envInfo: *, pending: {network: *, activationId: Number}}>}
     */
    async promote(network, emails, message) {
        this.checkValidNetwork(network);
        let envInfo = this.getEnvironmentInfo();
        await this.checkPromotions();
        this._checkForPending(envInfo, network);
        await this.save();
        this.checkForLastSavedValidationResults(envInfo);
        this.checkForLastSavedHostnameErrors(envInfo);
        this._checkForActive(envInfo, network);
        this._checkEnvInfo(envInfo);

        const hostnames = this.getHostnames();
        const hostnamesHash = helpers.createHash(hostnames);
        logger.info("hostnames hash: ", hostnamesHash);
        if (!envInfo.lastSavedHostnamesHash || envInfo.lastSavedHostnamesHash !== hostnamesHash) {
            throw new errors.DependencyError("Hostname data has changed since last save, please merge and save first",
                "cannot_promote_unexpected_hostname_changes");
        }

        let result = await this.getPAPI().activateProperty(envInfo.propertyId,
            envInfo.latestVersionInfo.propertyVersion, network, Array.from(emails), message);
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
        delete envInfo['latestVersionInfo']['etag'];
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
        return status === Status.ACTIVE || status === Status.FAILED ||
            status === Status.ABORTED || status === Status.DEACTIVATED || status === Status.INACTIVE;
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
                    if (result.status === Status.ACTIVE && result.activationType === "ACTIVATE") {
                        envInfo["activeIn_" + network + "_Info"] = helpers.clone(versionInfo);
                    }
                    if (result.status === Status.ACTIVE && result.activationType === "DEACTIVATE") {
                        delete envInfo["activeIn_" + network + "_Info"];
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
                delete envInfo['latestVersionInfo']['etag'];
                logger.info("updated envInfo: ", envInfo);
                this.project.storeEnvironmentInfo(envInfo);
            }
        }
        return {
            promotionUpdates: results,
            promotionStatus: this.getPromotionStatus()
        };
    }

    async updateEnvInfoVersions(envInfo, versionNum, versionType) {
        let versionMap = {
            staging: {
                replaceVersionInfo: "activeIn_STAGING_Info",
                statusField: "stagingStatus"
            },
            production: {
                replaceVersionInfo: "activeIn_PRODUCTION_Info",
                statusField: "productionStatus"
            },
            latest: {
                replaceVersionInfo: "latestVersionInfo",

            }
        }

        let replaceVersionInfo = versionMap[versionType].replaceVersionInfo;


        if (versionMap[versionType] === undefined) {
            throw new errors.UnknownTypeError("Unknown property version type being updated in envInfo.json.  Should be staging, production, or latest.", "unknown_version_type");
        }

        if (_.isNumber(versionNum)) {
            let info = await this.getPAPI().getPropertyVersion(envInfo.propertyId, versionNum);
            info = helpers.clone(info.versions.items[0]);
            let statusField = versionMap[versionType].statusField;

            if (versionType === "latest" || (statusField !== undefined && info[statusField] === Status.ACTIVE)) {
                envInfo[replaceVersionInfo] = helpers.clone(info);
            }
        } else if (versionNum === null || versionNum === undefined) {
            //there IS no staging version, make sure to remove staging from the active
            delete envInfo[replaceVersionInfo];
        }

    }

    async updateEnvInfo(isSecure) {
        let envInfo = this.getEnvironmentInfo();
        if (isSecure !== undefined && _.isBoolean(isSecure)) {
            envInfo.isSecure = isSecure;
        }
        logger.info("Getting property info");
        let actualPropertyInfo = await this.getPAPI().getPropertyInfo(envInfo.propertyId);
        let activations = await this.getPAPI().propertyActivateStatus(envInfo.propertyId);

        let stagingVersion, productionVersion, latestVersion;
        stagingVersion = actualPropertyInfo.properties.items[0].stagingVersion;
        productionVersion = actualPropertyInfo.properties.items[0].productionVersion;
        latestVersion = actualPropertyInfo.properties.items[0].latestVersion;

        logger.info("getting latest staging info");
        await this.updateEnvInfoVersions(envInfo, stagingVersion, "staging");

        logger.info("getting latest production info");
        await this.updateEnvInfoVersions(envInfo, productionVersion, "production");

        logger.info("getting latest version info");
        await this.updateEnvInfoVersions(envInfo, latestVersion, "latest");

        envInfo.pendingActivations = {};
        for (let activation of activations.activations.items) {
            if (activation.status === Status.PENDING &&
                helpers.parsePropertyId(activation.propertyId) === envInfo.propertyId &&
                activation.propertyVersion === envInfo.latestVersionInfo.propertyVersion) {

                envInfo.pendingActivations[activation.network] = helpers.parseActivationId(activation.activationId);
            }
        }

        if (_.isEmpty(envInfo.pendingActivations)) {
            delete envInfo.pendingActivations;
        }

        this.storeEnvironmentInfo(envInfo);
    }

}


module.exports = Environment;