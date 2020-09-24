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
const path = require('path');

const fs = require('fs');
const edgerc = require('./edgegrid/edgerc');
const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging").createLogger("devops-prov");
const emailValidator = require("email-validator");
const Environment = require("./environment");

/**
 * Class representing high-level functionality within the SDK.
 */
class DevOps {
    constructor(devopsSettings, dependencies) {
        this.devopsSettings = devopsSettings;
        this.devopsHome = devopsSettings.devopsHome;
        if (!fs.existsSync(devopsSettings.devopsHome)) {
            //file does not exist
            throw new errors.ArgumentError(`Could not open working directory at '${devopsSettings.devopsHome}'`,
                "home_parse_error")
        }
        this.getProject = dependencies.getProject;
        this.getPAPI = dependencies.getPAPI;
        this.utils = dependencies.getUtils();
        this.version = dependencies.version;
        this.pollingIntervalMs = 60000;
        this.promoteEmailString = "emails for promote: ";
    }

    /**
     * retrieve default pipeline name from file.
     * @returns {*}
     */
    getDefaultProjectName() {
        let projectName = this.devopsSettings.defaultProject;
        if (!projectName) {
            throw new errors.DependencyError("Can't read default pipeline name from devopsSettings.json " +
                "and no pipeline name provided per -p <pipeline name> option",
                "missing_default_pipeline_file");
        }
        return projectName;
    }

    /**
     * Extract the desired pipeline name either from devopsSettings.json file or
     * from the -p [pipeline name] command line option
     * @param options
     * @param useDefault
     * @returns {null}
     */
    extractProjectName(options) {
        let projectName = options ? options.pipeline : null;
        if (!_.isString(projectName)) {
            projectName = this.getDefaultProjectName();
        }
        return projectName;
    }


    /**
     * Creates Project instance representing default pipeline
     * @returns {*}
     */
    getDefaultProject() {
        return this.getProject(this.getDefaultProjectName());
    }

    /**
     * Creates a whole new Project (devops pipeline). Async since a bunch of REST calls are being made
     *
     * @param createPipelineInfo
     * @returns {Promise.<*>}
     */
    async createPipeline(createPipelineInfo) {
        logger.info("creating new project with info:", helpers.jsonStringify(createPipelineInfo));
        let ruleTree;
        let project = this.getProject(createPipelineInfo.projectName, false);
        if (project.exists()) {
            if (createPipelineInfo.isInRetryMode) {
                logger.info(`Project folder '${project.projectFolder}' already exists, ignore`);
            } else {
                throw new errors.ArgumentError(`Project folder '${project.projectFolder}' already exists`,
                    "project_folder_already_exists", project.projectFolder);
            }
        }
        project.validateEnvironmentNames(createPipelineInfo.environments);
        if (_.isString(createPipelineInfo.propertyName) && !_.isNumber(createPipelineInfo.propertyId)) {
            let results = await this.getPAPI().findProperty(createPipelineInfo.propertyName);
            if (results.versions.items.length === 0) {
                throw new errors.ArgumentError(`Can't find any versions for property '${createPipelineInfo.propertyName}'`);
            }
            createPipelineInfo.propertyId = helpers.parsePropertyId(results.versions.items[0].propertyId);
        }
        if (_.isNumber(createPipelineInfo.propertyId)) {
            logger.info(`Attempting to load rule tree for property id: ${createPipelineInfo.propertyId} and version: ${createPipelineInfo.propertyVersion}`);
            let propertyInfo = await project.getPropertyInfo(createPipelineInfo.propertyId, createPipelineInfo.propertyVersion);
            ruleTree = await project.getPropertyRuleTree(createPipelineInfo.propertyId, propertyInfo.propertyVersion);
            createPipelineInfo.ruleFormat = ruleTree.ruleFormat;
            if (!_.isArray(createPipelineInfo.groupIds) || createPipelineInfo.groupIds.length === 0) {
                let defaultGroupId = helpers.parseGroupId(propertyInfo.groupId);
                createPipelineInfo.groupIds = [defaultGroupId];
                _.each(createPipelineInfo.environments, function(name) {
                    let groupId = createPipelineInfo.environmentGroupIds[name];
                    if (groupId === undefined) {
                        createPipelineInfo.environmentGroupIds[name] = defaultGroupId;
                    }
                });
            }
            if (_.isBoolean(createPipelineInfo.associatePropertyName) && createPipelineInfo.associatePropertyName) {
                if (!_.isString(createPipelineInfo.propertyName) && !_.isNumber(createPipelineInfo.propertyId)) {
                    throw new errors.ArgumentError(`Must provide template property name with '-e'`,
                        "template_not_provided", this.projectName);
                }
                if (_.isString(createPipelineInfo.contractId) && (helpers.prefixeableString('ctr_')(createPipelineInfo.contractId) !== helpers.prefixeableString('ctr_')(propertyInfo.contractId))) {
                    throw new errors.ArgumentError(`Provided contract ID must match the contract ID of the seed template`,
                        "contractId_mismatch", createPipelineInfo.contractId);
                }
                if (_.isString(createPipelineInfo.productId) && (helpers.prefixeableString('prd_')(createPipelineInfo.productId) !== helpers.prefixeableString('prd_')(propertyInfo.productId))) {
                    throw new errors.ArgumentError(`Provided product ID must match the product ID of the seed template`,
                        "productId_mismatch", createPipelineInfo.contractId);
                }

                for (let envName of createPipelineInfo.environments) {

                    let propertyIdResult = await this.getPAPI().findProperty(envName);
                    if (propertyIdResult.versions.items.length === 0) {
                        throw new errors.ArgumentError(`Can't find any versions for property '${envName}'`);
                    }
                    let propertyId = helpers.parsePropertyId(propertyIdResult.versions.items[0].propertyId);

                    let currentPropertyInfo = await project.getPropertyInfo(propertyId);
                    if (currentPropertyInfo.contractId !== propertyInfo.contractId) {
                        throw new errors.ValidationError(`Contract ID: '${currentPropertyInfo.contractId}' of Property: '${envName} does not match the contract ID: ${propertyInfo.contractId} of seed template`,
                            "contractId_mismatch");
                    }
                    if (currentPropertyInfo.productId !== propertyInfo.productId) {
                        throw new errors.ValidationError(`Product ID: '${currentPropertyInfo.productId}' of Property: '${envName} does not match the productId ID: ${propertyInfo.productId} of seed template`,
                            "productId_mismatch");
                    }
                }
            }
            if (!createPipelineInfo.contractId) {
                createPipelineInfo.contractId = propertyInfo.contractId;
            }
            if (!createPipelineInfo.productId) {
                createPipelineInfo.productId = propertyInfo.productId;
            }
            if (!_.isBoolean(createPipelineInfo.secureOption)) {
                createPipelineInfo.secureOption = ruleTree.rules.options.is_secure;
            }
            if (!createPipelineInfo.propertyVersion) {
                createPipelineInfo.propertyVersion = propertyInfo.propertyVersion;
            }

        } else {
            createPipelineInfo.secureOption = createPipelineInfo.secureOption || false;
        }
        logger.info('Creating new pipeline with data: ', helpers.jsonStringify(createPipelineInfo));

        if (!project.exists()) {
            project.createProjectFolders(createPipelineInfo);
        }
        for (let envName of createPipelineInfo.environments) {
            logger.info(`Creating environment: '${envName}'`);
            let env = project.getEnvironment(envName);
            await env.create(createPipelineInfo);
        }
        await project.setupPropertyTemplate(ruleTree, createPipelineInfo.variableMode);
        return project;
    }

    /**
     * Sets the default pipeline in devopsSettings.json
     * @param projectName {String}
     */
    setDefaultProject(projectName) {
        let project = this.getProject(projectName);
        if (!project.exists()) {
            throw new errors.ArgumentError(`Project with name '${this.projectName}' doesn't exist.`,
                "pipeline_does_not_exist", this.projectName);
        }
        logger.info(`Setting default pipeline to '${projectName}`);
        this.devopsSettings.defaultProject = projectName;
        this.updateDevopsSettings({
            defaultProject: projectName
        });
    }

    /**
     * Sets the default section name of the client credentials file .edgerc
     * @param section
     */
    setDefaultSection(section) {
        let configPath = this.devopsSettings.edgeGridConfig.path;
        edgerc.getSection(configPath, section);
        logger.info(`Setting default client id section to '${section}`);
        this.devopsSettings.edgeGridConfig.section = section;
        this.updateDevopsSettings({
            edgeGridConfig: {
                section: section
            }
        });
    }

    /**
     * Sets the default notification emails passed to backend during promote
     * @param emails
     */
    setDefaultEmails(emails) {
        let emailsArr = emails.split(",");
        this.checkEmails(emailsArr);
        logger.info(`Setting default notification emails to '${emails}'`);
        this.devopsSettings.emails = emailsArr;
        this.updateDevopsSettings({
            emails: emailsArr
        });
    }

    /**
     * Sets the account switch key value to switch the account context
     * @param accountSwitchKey
     */
    setAccountSwitchKey(accountSwitchKey) {
        logger.info(`Setting account switch key to '${accountSwitchKey}'`);
        this.devopsSettings.accountSwitchKey = accountSwitchKey;
        this.updateDevopsSettings({
            accountSwitchKey: accountSwitchKey
        });
    }

    /**
     * Set the default output format, allowed values: table, json
     * @param format
     */
    setDefaultFormat(format) {
        logger.info(`Setting default format to '${format}'`);
        this.devopsSettings.format = format;
        this.updateDevopsSettings({
            outputFormat: format
        });
    }

    /**
     * Writes update to devopsSettings.json
     * @param update {object} updated settings
     */
    updateDevopsSettings(update) {
        logger.info("updating Akamai Pipeline settings");
        let devopsConfig = path.join(this.devopsHome, "devopsSettings.json");
        let settings = {};
        if (this.utils.fileExists(devopsConfig)) {
            settings = this.utils.readJsonFile(devopsConfig);
        }
        settings = Object.assign(settings, update);
        this.utils.writeJsonFile(devopsConfig, settings);
        if (this.devopsSettings.__savedSettings === undefined || this.devopsSettings.__savedSettings === null) {
            this.devopsSettings.__savedSettings = {};
        }
        this.devopsSettings.__savedSettings = Object.assign(this.devopsSettings.__savedSettings, settings);
    }

    /**
     * Sets the prefixes setting on the client settings associated with currently used client id.
     * @param usePrefixes
     * @return {Promise.<*>}
     */
    async setPrefixes(usePrefixes = false) {
        let papi = this.getPAPI();
        let clientSettings = await papi.getClientSettings();
        clientSettings.usePrefixes = usePrefixes;
        return papi.setClientSettings(clientSettings);
    }

    /**
     * Sets default ruleformat in client settings associated with currently used client id.
     * @param ruleformat
     * @return {Promise.<Promise|*>}
     */
    async setRuleFormat(ruleformat = "latest") {
        return this.getPAPI().setRuleFormat(ruleformat);
    }

    /**
     * Create Environment instance.
     * @param projectName
     * @param environmentName
     */
    getEnvironment(projectName, environmentName) {
        const project = this.getProject(projectName);
        return project.getEnvironment(environmentName);
    }

    /**
     * Merge variables with templates to construct the rule tree for passed pipeline and environment name
     * @param projectName {string}
     * @param environmentName {string}
     * @param validate {boolean} send ruletree to validation endpoint?
     */
    merge(projectName, environmentName, validate = true) {
        return this.getEnvironment(projectName, environmentName).merge(validate)
    }

    /**
     * Save ruletree to backend for a particular pipeline and environment name
     * @param projectName {string}
     * @param environmentName {string}
     */
    save(projectName, environmentName) {
        return this.getEnvironment(projectName, environmentName).save()
    }

    createEmailSet(emails) {
        let emailSet = new Set([]);
        if (_.isString(emails) && emails.length > 0) {
            for (let e of emails.split(',')) {
                emailSet.add(e);
            }
        }
        logger.info("Settings file: ", this.devopsSettings);
        if (_.isArray(this.devopsSettings.emails)) {
            for (let e of this.devopsSettings.emails) {
                emailSet.add(e)
            }
        }
        if (emailSet.size === 0 || !emailSet) {
            emailSet.add("noreply@akamai.com");
        }
        this.checkEmails(emailSet);
        logger.info(this.promoteEmailString, emailSet);
        return emailSet;
    }
    /**
     * Promote environment of a project
     * @param projectName {String}
     * @param environmentName {String}
     * @param network {String} "STAGING" or "PRODUCTION"
     * @param emails {Array<String>}
     */
    promote(projectName, environmentName, network, emails, message, force) {

        const project = this.getProject(projectName);
        let emailSet = this.createEmailSet(emails);
        return project.promote(environmentName, network, emailSet, message, force);
    }

    async activateVersion(propertyInfo, network, emails, message) {
        let emailSet = this.createEmailSet(emails);
        let versionInfo = await this.getVersionInfo(propertyInfo);
        let result = await this.getPAPI().activateProperty(versionInfo.propertyId,
            versionInfo.propertyVersion, network, Array.from(emailSet), message);
        let activationId = Environment._extractActivationId(result);
        return {
            "propertyId": versionInfo.propertyId,
            "propertyVersion": versionInfo.propertyVersion,
            "network": network,
            "activationId": activationId
        };
    }

    async deleteProperty(propertyInfo, message) {
        let versionInfo;
        if (_.isNumber(propertyInfo.propertyId)) {
            versionInfo = await this.getPAPI().latestPropertyVersion(propertyInfo.propertyId);
        } else {
            versionInfo = await this.getPropertyVersionInfo(propertyInfo.propertyName);
        }
        return this.getPAPI().deleteProperty(versionInfo.propertyId, versionInfo.contractId, versionInfo.groupId, message);

    }

    async createCpcode(contractId, groupId, cpcodeName, productId) {
        return this.getPAPI().createCpcode(contractId, groupId, cpcodeName, productId);
    }

    /**
     * change ruleformat for a pipeline or environment of a project
     * @param projectName {string}
     * @param environments [List of string]
     * @param ruleFormat {string}
     */
    async changeRuleFormat(projectName, environments, ruleFormat) {
        const project = this.getProject(projectName);
        let projectdata = project.getProjectInfo();
        let results = [];
        if (Array.isArray(environments) && environments.length) {
            for (let envName of environments) {
                logger.info(`Environment: '${envName}'`);
                results.push(await (project.changeRuleFormat(envName, ruleFormat)));
            }
        } else {
            for (let env of projectdata.environments) {
                logger.info(`Environment: '${env}'`);
                results.push(await (project.changeRuleFormat(env, ruleFormat)));
            }
        }
        return results;
    }

    checkEmails(emails) {
        let cleanEmails = [];

        if (_.isSet(emails)) {
            cleanEmails = this.trimEachItem(Array.from(emails));
        } else if (_.isArray(emails)) {
            cleanEmails = this.trimEachItem(emails);
        }

        //this is a useful check...  promote used to do this only
        if (_.isObject(cleanEmails) && cleanEmails.length === 0) {
            throw new errors.ArgumentError("No notification emails provided", "no_email_provided")
        }
        //use an array to track all broken emails
        let invalidEmailArray = [];
        for (let email of cleanEmails) {
            if (!emailValidator.validate(email) && email) {
                invalidEmailArray.push(email);
            }
        }

        let invalidEmails = invalidEmailArray.join(",");
        if (invalidEmails) {
            let invalid_email_message = `The email '${invalidEmails}' is not valid.`;
            if (invalidEmailArray.length > 1) {
                invalid_email_message = `The emails '${invalidEmails}' are not valid.`;
            }
            throw new errors.ArgumentError(invalid_email_message, "invalid_email_addresses")
        }

        return invalidEmailArray.length === 0;
    }

    /*
     * Trim each item in the array
     * @param arry {Array<String>}
     */
    trimEachItem(arry) {
        let cleanArry = [];
        //Clean up extra spaces, and remove "white space only"
        for (let entry of arry) {
            let cleaned = entry.trim();
            if (cleaned !== '') {
                cleanArry.push(cleaned);
            }
        }
        return cleanArry;
    }

    /**
     * Check status of promotion of environment by checking a underlying pending activation.
     * @param projectName {String}
     * @param envionmentName {String}
     * @return {Promise<Object>}
     */
    checkPromotions(projectName, envionmentName) {
        return this.getEnvironment(projectName, envionmentName).checkPromotions();
    }

    /**
     * Try to use existing edge hostnames or create new ones
     * @param projectName {String}
     * @param envionmentName {String}
     * @return {*|Promise.<void>}
     */
    createEdgeHostnames(projectName, envionmentName) {
        let environment = this.getEnvironment(projectName, envionmentName);
        return environment.createEdgeHostnames(environment.getHostnames());
    }

    listContracts() {
        return this.getPAPI().listContracts();
    }

    listProducts(contractId) {
        return this.getPAPI().listProducts(contractId);
    }

    listGroups() {
        return this.getPAPI().listGroups();
    }

    listCpcodes(contractId, groupId) {
        return this.getPAPI().listCpcodes(contractId, groupId);
    }

    listEdgeHostnames(contractid, groupId) {
        return this.getPAPI().listEdgeHostnames(contractid, groupId);
    }

    listProperties(contractId, groupId) {
        return this.getPAPI().listProperties(contractId, groupId);
    }

    listRuleFormats() {
        return this.getPAPI().listRuleFormats();
    }

    async getPropertyRules(propertyInfo) {
        let versionInfo = await this.getVersionInfo(propertyInfo);
        return this.getPAPI().getPropertyVersionRules(versionInfo.propertyId, versionInfo.propertyVersion, null);
    }

    async listPropertyHostnames(propertyInfo, validate) {
        let versionInfo = await this.getVersionInfo(propertyInfo);
        return this.getPAPI().listPropertyHostnames(versionInfo.propertyId, versionInfo.propertyVersion, versionInfo.contractId, versionInfo.groupId, validate);
    }

    async updatePropertyHostnames(propertyInfo, hostnames) {
        let versionInfo = await this.getVersionInfo(propertyInfo);
        return this.getPAPI().storePropertyVersionHostnames(versionInfo.propertyId, versionInfo.propertyVersion, hostnames, versionInfo.contractId, versionInfo.groupId);
    }

    async getVersionInfo(propertyInfo) {
        let versionInfo;
        if (!_.isNumber(propertyInfo.propertyId) && _.isString(propertyInfo.propertyName)) {
            let result = await this.getPropertyVersionInfo(propertyInfo.propertyName);
            propertyInfo.propertyId = helpers.parsePropertyId(result.propertyId);
        }
        if (_.isNumber(propertyInfo.propertyId)) {
            if (propertyInfo.propertyVersion) {
                versionInfo = await this.getPAPI().getPropertyVersion(propertyInfo.propertyId, propertyInfo.propertyVersion);
            } else {
                versionInfo = await this.getPAPI().latestPropertyVersion(propertyInfo.propertyId);
            }
            versionInfo.propertyVersion = versionInfo.versions.items[0].propertyVersion;
        }
        return versionInfo;
    }

    async getPropertyVersionInfo(propertyName) {
        let results = await this.getPAPI().findProperty(propertyName);
        if (results.versions.items.length === 0) {
            throw new errors.ArgumentError(`Can't find any version of property '${propertyName}'`,
                "property_does_not_exist_on_server", propertyName);
        }
        let versionInfo;
        let latestVersion = 0;
        for (let i = 0; i < results.versions.items.length; i++) {
            if (latestVersion < results.versions.items[i].propertyVersion) {
                latestVersion = results.versions.items[i].propertyVersion;
                versionInfo = results.versions.items[i];
            }
        }
        return versionInfo;
    }

    async propertyUpdate(propertyInfo, rules, dryRun) {
        let versionInfo = await this.getVersionInfo(propertyInfo);

        let ruleFormat;
        if (rules.ruleFormat && rules.ruleFormat !== "latest") {
            ruleFormat = rules.ruleFormat;
        }

        if (dryRun) {
            return await this.getPAPI().validatePropertyVersionRules(versionInfo.propertyId,
                versionInfo.propertyVersion, rules, ruleFormat);
        } else {
            let newVersionData = await this.getPAPI().createNewPropertyVersion(versionInfo.propertyId, versionInfo.propertyVersion);
            let propertyVersion = Environment._extractVersionId(newVersionData);
            return await this.getPAPI().storePropertyVersionRules(versionInfo.propertyId,
                propertyVersion, rules, ruleFormat);
        }
    }
}

module.exports = DevOps;