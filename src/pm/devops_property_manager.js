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
        } else {
            createPropertyInfo.secureOption = createPropertyInfo.secureOption || false;
        }
        logger.info('Creating new PM CLI property with data: ', helpers.jsonStringify(createPropertyInfo));

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
}

module.exports = DevopsPropertyManager;