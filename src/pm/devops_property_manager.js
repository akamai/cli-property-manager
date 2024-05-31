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
const errors = require('../errors');
const helpers = require('../helpers');
const logger = require("../logging").createLogger("pm-cli");
const Devops = require("../devops");

/**
 * Class representing high-level functionality within the SDK.
 */
class DevopsPropertyManager extends Devops {
    constructor(devopsSettings, dependencies) {
        super(devopsSettings, dependencies);
        this.promoteEmailString = "emails for activation: ";
    }

    async createPipeline() {
        //Overwrite the super class to do nothing
    }
    /**
     * Creates a whole new Property. Async since a bunch of REST calls are being made
     *
     * @param createPropertyInfo
     * @returns {Promise.<*>}
     */
    async createProperty(createPropertyInfo) {
        logger.info("creating new property with info:", helpers.jsonStringify(createPropertyInfo));
        let ruleTree;
        let project = this.getProject(createPropertyInfo.projectName, false);
        if (project.exists()) {
            if (createPropertyInfo.isInRetryMode) {
                logger.info(`Property folder '${project.projectFolder}' already exists, ignore`);
            } else {
                throw new errors.ArgumentError(`Property folder '${project.projectFolder}' already exists`,
                    "property_folder_already_exists", project.projectFolder);
            }
        }
        project.validateEnvironmentNames(createPropertyInfo.environments);
        if (_.isString(createPropertyInfo.propertyName) && !_.isNumber(createPropertyInfo.propertyId)) {
            let results = await this.getPAPI().findProperty(createPropertyInfo.propertyName);
            if (results.versions.items.length === 0) {
                throw new errors.ArgumentError(`Can't find any versions for property '${createPropertyInfo.propertyName}'`);
            }
            createPropertyInfo.propertyId = helpers.parsePropertyId(results.versions.items[0].propertyId);
        }
        if (_.isNumber(createPropertyInfo.propertyId)) {
            logger.info(`Attempting to load rule tree for property id: ${createPropertyInfo.propertyId} and version: ${createPropertyInfo.propertyVersion}`);
            let propertyInfo = await project.getPropertyInfo(createPropertyInfo.propertyId, createPropertyInfo.propertyVersion);
            ruleTree = await project.getPropertyRuleTree(createPropertyInfo.propertyId, propertyInfo.propertyVersion);
            if (!createPropertyInfo.groupId) {
                let defaultGroupId = helpers.parseGroupId(propertyInfo.groupId);
                createPropertyInfo.groupId = defaultGroupId;
            }
            if (!createPropertyInfo.contractId) {
                createPropertyInfo.contractId = propertyInfo.contractId;
            }
            if (!createPropertyInfo.productId) {
                createPropertyInfo.productId = propertyInfo.productId;
            }
            if (!_.isBoolean(createPropertyInfo.secureOption)) {
                createPropertyInfo.secureOption = ruleTree.rules.options.is_secure;
            }
            if (!createPropertyInfo.propertyVersion) {
                createPropertyInfo.propertyVersion = propertyInfo.propertyVersion;
            }
        } else {
            createPropertyInfo.secureOption = createPropertyInfo.secureOption || false;
        }
        logger.info('Creating new PM CLI property with data: ', helpers.jsonStringify(createPropertyInfo));

        if (createPropertyInfo.noLocalFolders) {
            logger.info('Creating new PM CLI property without local folders');
            let results = await this.getPAPI().createProperty(project.projectName,
                createPropertyInfo.productId, createPropertyInfo.contractId, createPropertyInfo.groupId, null, createPropertyInfo.propertyId, createPropertyInfo.propertyVersion);
            return results;
        }
        if (!project.exists()) {
            project.createProjectFolders(createPropertyInfo);
        }

        //Creating "environment"
        let env = project.getEnvironment(project.getName());
        await env.create(createPropertyInfo);

        await project.setupPropertyTemplate(ruleTree, createPropertyInfo.variableMode);
        return project;
    }


    /**
     * Imports Property from Property Manager. Async since a bunch of REST calls are being made
     *
     * @param createPropertyInfo
     * @returns {Promise.<*>}
     */
    async importProperty(createPropertyInfo) {
        //validate property name
        if (!_.isString(createPropertyInfo.propertyName)) {
            throw new errors.ArgumentError(`Property name '${createPropertyInfo.propertyName}' is not a string`,
                "property_name_not_string", createPropertyInfo.propertyName);
        }
        //check if property already exists locally
        let project = this.getProject(createPropertyInfo.propertyName, false);
        if (project.exists()) {
            throw new errors.ArgumentError(`Property folder '${createPropertyInfo.propertyName}' already exists locally`,
                "property_folder_already_exists", createPropertyInfo.propertyName);
        }
        //check if property exists on server
        let results = await this.getPAPI().findProperty(createPropertyInfo.propertyName);
        if (results.versions.items.length === 0) {
            throw new errors.ArgumentError(`Can't find any version of property '${createPropertyInfo.propertyName}'`,
                "property_does_not_exist_on_server", createPropertyInfo.propertyName);
        }
        createPropertyInfo.propertyId = helpers.parsePropertyId(results.versions.items[0].propertyId);
        let propertyInfo = await project.getPropertyInfo(createPropertyInfo.propertyId, createPropertyInfo.propertyVersion, createPropertyInfo.network);

        project.propertyVersion = propertyInfo.propertyVersion;
        createPropertyInfo.propertyVersion = propertyInfo.propertyVersion;
        logger.info(`Attempting to load rule tree for property id: ${createPropertyInfo.propertyId} and version: ${createPropertyInfo.propertyVersion}`);
        let ruleTree = await project.getPropertyRuleTree(createPropertyInfo.propertyId, createPropertyInfo.propertyVersion);
        createPropertyInfo.groupId = helpers.parseGroupId(propertyInfo.groupId);
        createPropertyInfo.contractId = helpers.prefixeableString('ctr_')(propertyInfo.contractId);
        createPropertyInfo.productId = helpers.prefixeableString('prd_')(propertyInfo.productId);
        createPropertyInfo.secureOption = ruleTree.rules.options.is_secure;
        createPropertyInfo.variableMode = createPropertyInfo.variableMode || helpers.allowedModes[1];

        logger.info('Importing existing property with data: ', helpers.jsonStringify(createPropertyInfo));

        //Creating project folder
        if (!project.exists()) {
            project.createProjectFolders(createPropertyInfo);
        }

        //Creating "environment"
        let env = project.getEnvironment(project.getName());
        await env.importProperty(createPropertyInfo);
        await project.setupPropertyTemplate(ruleTree, createPropertyInfo.variableMode, true);
        return project;


    }
    async updateProperty(createPropertyInfo) {
        logger.info("Updating property with info:", helpers.jsonStringify(createPropertyInfo));
        let ruleTree;
        let project = this.getProject(createPropertyInfo.projectName, false);

        if (!project.exists()) {
            throw new errors.ArgumentError(`Property folder '${createPropertyInfo.projectName}' does not exist`,
                "property_folder_does_not_exist", createPropertyInfo.projectName);
        }
        let envInfo = project.loadEnvironmentInfo();

        if (_.isString(envInfo.propertyName) && !_.isNumber(envInfo.propertyId)) {
            let results = await this.getPAPI().findProperty(envInfo.propertyName);
            if (results.versions.items.length === 0) {
                throw new errors.ArgumentError(`Can't find any versions for property '${envInfo.propertyName}'`);
            }
            envInfo.propertyId = helpers.parsePropertyId(results.versions.items[0].propertyId);
        }
        let propertyInfo = await project.getPropertyInfo(envInfo.propertyId, createPropertyInfo.propertyVersion, createPropertyInfo.network);

        project.propertyVersion = propertyInfo.propertyVersion
        ruleTree = await project.getPropertyRuleTree(envInfo.propertyId, propertyInfo.propertyVersion);
        let projectInfo = project.getProjectInfo();
        let isSecure = ruleTree.rules.options.is_secure;
        projectInfo.secureOption = isSecure;
        project.createProjectSettings(projectInfo);

        logger.info('Updating PM CLI property with data: ', helpers.jsonStringify(createPropertyInfo));

        let env = project.getEnvironment(project.getName());
        //Creating "environment"
        await env.update(isSecure);

        await project.setupPropertyTemplate(ruleTree, createPropertyInfo.variableMode, true);
        return project;
    }

    async checkActivations(propertyId, activationId) {
        let result = await this.getPAPI().activationStatus(propertyId, activationId);
        return result.activations.items[0];
    }


    /**
     * Extract the desired project name either from devopsSettings.json file or
     * from the -p [project name] command line option
     * @param options
     * @param useDefault
     * @returns {null}
     */
    extractProjectName(options) {
        let projectName = options ? options.property : null;
        if (!_.isString(projectName)) {
            projectName = this.getDefaultProjectName();
        }
        return projectName;
    }

    /**
     * retrieve default property name from file.
     * @returns {*}
     */
    getDefaultProjectName() {
        let projectName = this.devopsSettings.defaultProject;
        if (!projectName) {
            throw new errors.DependencyError("Can't read default property name from snippetsSettings.json " +
                "and no property name provided per -p <property name> option",
                "missing_default_property_file");
        }
        return projectName;
    }


    /**
     * Merge config snippets into a merged rule tree for passed project name
     * @param projectName {string}
     * @param validate {boolean} send ruletree to validation endpoint?
     */
    merge(projectName, validate = true) {
        return this.getEnvironment(projectName).merge(validate)
    }

    /**
     * Create Environment instance.  Manages low level calls.  Only 1 "environment" per property
     * @param projectName
     * @param environmentName
     */
    getEnvironment(projectName) {
        const project = this.getProject(projectName);
        return project.getEnvironment(projectName);
    }


    /**
     * Sets the default property in snippetsSettings.json
     * @param propertyName {String}
     */
    setDefaultProject(propertyName) {
        let project = this.getProject(propertyName);
        if (!project.exists()) {
            throw new errors.ArgumentError(`PM CLI property with name '${this.projectName}' doesn't exist.`,
                "pm_cli_does_not_exist", this.projectName);
        }
        logger.info(`Setting default property to '${propertyName}`);
        this.devopsSettings.defaultProject = propertyName;
        this.updateDevopsSettings({
            defaultProject: propertyName
        });
    }

    /**
     * Writes update to snippetsSettings.json
     * @param update {object} updated settings
     */
    updateDevopsSettings(update) {
        logger.info("updating PM CLI settings");
        let snippetsConfig = path.join(this.devopsHome, "snippetsSettings.json");
        let settings = {};
        if (this.utils.fileExists(snippetsConfig)) {
            settings = this.utils.readJsonFile(snippetsConfig);
        }
        settings = Object.assign(settings, update);
        this.utils.writeJsonFile(snippetsConfig, settings);
        if (this.devopsSettings.__savedSettings === undefined || this.devopsSettings.__savedSettings === null) {
            this.devopsSettings.__savedSettings = {};
        }
        this.devopsSettings.__savedSettings = Object.assign(this.devopsSettings.__savedSettings, settings);
    }

    /**
     * Deactivate property on a newtwork
     * @param propertyName {String}
     * @param environmentName {String}
     * @param network {String} "STAGING" or "PRODUCTION"
     * @param emails {Array<String>}
     */
    deactivate(propertyName, network, emails, message) {
        const project = this.getProject(propertyName);
        let emailSet = this.createEmailSet(emails);
        return project.deactivate(propertyName, network, emailSet, message);
    }
}

module.exports = DevopsPropertyManager;