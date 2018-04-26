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

const parseEdgeRc = require('./edgegrid/edgerc');
const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging").createLogger("devops-prov");

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
     * @param createProjectInfo
     * @returns {Promise.<*>}
     */
    async createNewProject(createProjectInfo) {
        logger.info(`creating new pipeline '${createProjectInfo.projectName}' ` +
            ` with productId: '${createProjectInfo.productId}', ` +
            `contractId: '${createProjectInfo.contractId}, groupId: '${createProjectInfo.groupId}'`);

        let ruleTree;
        let project = this.getProject(createProjectInfo.projectName, false);
        if (_.isNumber(createProjectInfo.propertyId)) {
            logger.info(`Attempting to load rule tree for property id: ${createProjectInfo.propertyId} and version: ${createProjectInfo.version}`);
            ruleTree = await project.getPropertyRuleTree(createProjectInfo.propertyId, createProjectInfo.version)
        }

        project.createProjectFolders(createProjectInfo);
        for (let name of createProjectInfo.environments) {
            logger.info(`Creating environment: '${name}'`);
            let env = project.getEnvironment(name);
            await env.create(createProjectInfo.isInRetryMode);
        }
        await project.setupPropertyTemplate(ruleTree);
        return project;
    }

    /**
     * Create project template based on newly created properties (uses first environment property).
     * Uses PAPI formatted rule try to generate template.
     * @param createProjectInfo
     * @returns {Promise.<void>}
     */
    setupTemplate(createProjectInfo) {
        let project = this.getProject(createProjectInfo.projectName);
        return project.setupPropertyTemplate(createProjectInfo.propertyId, createProjectInfo.version);
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
        try {
            parseEdgeRc(configPath, section);
        } catch (error) {
            throw new errors.ArgumentError(`No section name '${section}' found in '${configPath}'`,
                "invalid_client_id", section);
        }
        logger.info(`Setting default client id section to '${section}`);
        this.devopsSettings.edgeGridConfig.section = section;
        this.updateDevopsSettings({
            edgeGridConfig: {
                section: section
            }
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
    promote(projectName, environmentName, network, emails) {
        const project = this.getProject(projectName);
        return project.promote(environmentName, network, emails);
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