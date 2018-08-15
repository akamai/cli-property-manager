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
const path = require('path');

const edgerc = require('./edgegrid/edgerc');
const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging").createLogger("devops-prov");
const emailValidator = require("email-validator");

/**
 * Class representing high-level functionality within the SDK.
 */
class DevOps {
    constructor(devopsSettings, dependencies) {
        this.devopsSettings = devopsSettings;
        this.devopsHome = devopsSettings.devopsHome;
        this.getProject = dependencies.getProject;
        this.getPAPI = dependencies.getPAPI;
        this.utils = dependencies.getUtils();
        this.version = dependencies.version;
        this.pollingIntervalMs = 60000;
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
            if (!createPipelineInfo.contractId) {
                createPipelineInfo.contractId = propertyInfo.contractId;
            }
            if (!createPipelineInfo.productId) {
                createPipelineInfo.productId = propertyInfo.productId;
            }
            if (!_.isBoolean(createPipelineInfo.secureOption)) {
                createPipelineInfo.secureOption = ruleTree.rules.options.is_secure;
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
        await project.setupPropertyTemplate(ruleTree);
        return project;
    }

    /**
     * Create project template based on newly created properties (uses first environment property).
     * Uses PAPI formatted rule try to generate template.
     * @param createPipelineInfo
     * @returns {Promise.<void>}
     */
    setupTemplate(createPipelineInfo) {
        let project = this.getProject(createPipelineInfo.projectName);
        return project.setupPropertyTemplate(createPipelineInfo.propertyId, createPipelineInfo.version);
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
        logger.info("updating devops settings");
        let devopsConfig = path.join(this.devopsHome, "devopsSettings.json");
        let settings = {};
        if (this.utils.fileExists(devopsConfig)) {
            settings = this.utils.readJsonFile(devopsConfig);
        }
        settings = helpers.deepMerge(settings, update);
        this.utils.writeJsonFile(devopsConfig, settings);
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

    /**
     * Promote environment of a project
     * @param projectName {String}
     * @param environmentName {String}
     * @param network {String} "STAGING" or "PRODUCTION"
     * @param emails {Array<String>}
     */
    promote(projectName, environmentName, network, emails, message, force) {
        const project = this.getProject(projectName);
        let emailSet = new Set([]);
        if (_.isString(emails) && emails.length > 0) {
            for (let e of emails.split(',')) {
                emailSet.add(e);
            }
        }
        logger.info("this.devopsSettings: ", this.devopsSettings);
        if (_.isArray(this.devopsSettings.emails)) {
            for (let e of this.devopsSettings.emails) {
                emailSet.add(e)
            }
        }
        this.checkEmails(emailSet);
        logger.info("emails for promote: ", emailSet);

        return project.promote(environmentName, network, emailSet, message, force);
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
}

module.exports = DevOps;