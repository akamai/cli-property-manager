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


const path = require('path');
const _ = require('underscore');

const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging")
    .createLogger("devops-prov.project");

/**
 * Represents the data model of the the pipeline (devops provisioning pipeline)
 * responsible for all storage operations within the pipeline.
 */
class Project {
    /**
     * @param projectName
     * @param dependencies devops: mandatory DevOps instance, elClass, utilsClass are optional.
     *
     */
    constructor(projectName, dependencies) {
        this.projectName = projectName;
        this.devops = dependencies.devops;
        this.devopsHome = this.devops.devopsHome;
        this.projectFolder = path.normalize(path.join(this.devopsHome, projectName));
        this.utils = dependencies.getUtils();
        this.devopsSettings = dependencies.devopsSettings || {};
        this.dependencies = dependencies;
        this.__projectInfo = null;
    }

    /**
     * @returns Project Name
     */
    getName() {
        return this.projectName;
    }

    /**
     * Does this project exist on the filesystem.
     * @return {boolean}
     */
    exists() {
        return this.utils.fileExists(this.projectFolder);
    }

    __validateEnvironmentNames(environmentNames) {
        if (!_.isArray(environmentNames)) {
            throw new errors.ArgumentError(`Expecting array of environment names, but got '${environmentNames}'`,
                "malformed_environment_data", environmentNames);
        }
        if (environmentNames.length < 2) {
            throw new errors.ArgumentError(`Expecting at least 2 environment names`, "need_more_env_names");
        }
        if (environmentNames.length > 10) {
            throw new errors.ArgumentError(`Number of environments should not exceed 10`, "too_many_env_names");
        }
        let envNameSet = new Set();
        for (let name of environmentNames) {
            if (envNameSet.has(name)) {
                throw new errors.ArgumentError(`Duplicate environment name in argument list: ${name}`,
                    "duplicate_env_name", name);
            } else {
                envNameSet.add(name);
            }
        }
    }

    /**
     * Setup pipeline and environments folders
     * @param productId
     * @param contractId
     * @param groupId
     * @param environmentNames
     */
    createProjectFolders(createProjectInfo) {
        let environmentNames = createProjectInfo.environments;
        this.__validateEnvironmentNames(environmentNames);
        if (this.exists()) {
            if (createProjectInfo.isInRetryMode) {
                logger.info(`Project folder '${this.projectFolder}' already exists, ignore`);
                return;
            }
            throw new errors.ArgumentError(`Project folder '${this.projectFolder}' already exists`,
                "project_folder_already_exists", this.projectFolder);
        }
        logger.info("creating pipeline %s, with environments: %s", this.projectFolder, environmentNames.join(", "));
        this.__createProjectFolders();
        this.createProjectSettings(createProjectInfo);
        this.createEnvironments(environmentNames);
    }

    __createProjectFolders() {
        this.utils.mkdir(this.projectFolder);
        const folders = ["cache", "dist", "environments", "templates"];
        _.each(folders, function(name) {
            this.utils.mkdir(path.join(this.projectFolder, name));
        }, this);
    }

    /**
     * Setup projectInfo.json file
     */
    createProjectSettings(createProjectInfo) {
        this.projectInfo = {
            productId: createProjectInfo.productId,
            contractId: createProjectInfo.contractId,
            groupId: createProjectInfo.groupId,
            environments: createProjectInfo.environments
        };
        if (_.isObject(this.devopsSettings) &&
            _.isObject(this.devopsSettings.edgeGridConfig) &&
            _.isString(this.devopsSettings.edgeGridConfig.section)) {
            this.projectInfo.edgeGridConfig = {
                section: this.devopsSettings.edgeGridConfig.section
            }
        }

        this.projectInfo.name = this.projectName;
        //todo: what other stuff can go here?
        let infoPath = path.join(this.projectFolder, "projectInfo.json");
        this.utils.writeJsonFile(infoPath, this.projectInfo);
    }

    createEnvironments(envs) {
        const domain = this.projectName;

        _.each(envs, function(name) {
            let environmentFolder = path.join(this.projectFolder, "environments", name);
            this.utils.mkdir(environmentFolder);
            let hostnames = [{
                "cnameFrom": name + "." + domain,
                "cnameTo": name + "." + domain + ".edgesuite.net",
                "cnameType": "EDGE_HOSTNAME",
                "edgeHostnameId": null
            }];
            this.utils.writeJsonFile(path.join(environmentFolder, "hostnames.json"), hostnames);
        }, this);
    }

    getProjectInfo() {
        if (!this.__projectInfo) {
            let infoPath = path.join(this.projectFolder, "projectInfo.json");
            if (!this.utils.fileExists(infoPath)) {
                throw new errors.DependencyError(`projectInfo file: ${infoPath} does not exist!`,
                    "missing_pipeline_info_file", infoPath);
            }
            this.__projectInfo = this.utils.readJsonFile(infoPath);
            //overriding global edgeGridConfig with project specific settings.
            //If a project was created with a specific edgeGridConfig, we want keep using it whenever we use the project.
            if (this.__projectInfo.edgeGridConfig) {
                logger.info("Overriding edgegrid config with project default: ", this.__projectInfo.edgeGridConfig);
                this.devopsSettings.edgeGridConfig =
                    helpers.mergeObjects(this.devopsSettings.edgeGridConfig, this.__projectInfo.edgeGridConfig);
            }

        }
        return this.__projectInfo;
    }

    /**
     * Get the project status, it retrieves project and environment details
     */
    async getStatus() {
        let projectdata = this.getProjectInfo();
        let environmentData = [];
        for (let environmentVariable of projectdata.environments) {
            let environment = this.getEnvironment(environmentVariable);
            await environment.checkPromotions();
            let envInfo = environment.getEnvironmentInfo();
            let envData = {
                envName: environment.name,
                propertyName: environment.propertyName,
                latestVersion: envInfo.latestVersionInfo.propertyVersion,
                ruleFormat: envInfo.latestVersionInfo.ruleFormat
            };
            let promotionStatus = environment.getPromotionStatus();
            envData.stagingVersion = promotionStatus.activeInStagingVersion;
            envData.productionVersion = promotionStatus.activeInProductionVersion;
            environmentData.push(envData);
        }
        return environmentData;
    }

    storeEnvironmentInfo(environmentInfo) {
        let infoPath = path.join(this.projectFolder, "environments", environmentInfo.name, "envInfo.json");
        this.utils.writeJsonFile(infoPath, environmentInfo);
    }

    loadEnvironmentInfo(envName) {
        let infoPath = path.join(this.projectFolder, "environments", envName, "envInfo.json");
        if (this.utils.fileExists(infoPath)) {
            return this.utils.readJsonFile(infoPath);
        }
        return null;
    }

    storeTemplate(name, template) {
        let infoPath = path.join(this.projectFolder, "templates", name);
        this.utils.writeJsonFile(infoPath, template);
        return infoPath;
    }

    loadTemplate(name) {
        let infoPath = path.join(this.projectFolder, "templates", name);
        return {
            resource: this.utils.readJsonFile(infoPath),
            resourcePath: path.join("templates", name)
        }
    }

    storeEnvProperty(name, data) {
        let simplified = path.join(this.projectFolder, "dist", name);
        this.utils.writeJsonFile(simplified, data);
        return simplified;
    }

    loadEnvProperty(name) {
        let simplified = path.join(this.projectFolder, "dist", name);
        return this.utils.readJsonFile(simplified);
    }

    existsEnvProperty(name) {
        let simplified = path.join(this.projectFolder, "dist", name);
        return this.utils.fileExists(simplified);
    }

    loadEnvironmentHostnames(envName) {
        let infoPath = path.join(this.projectFolder, "environments", envName, "hostnames.json");
        return this.utils.readJsonFile(infoPath);
    }

    storeEnvironmentHostnames(envName, hostnames) {
        let infoPath = path.join(this.projectFolder, "environments", envName, "hostnames.json");
        return this.utils.writeJsonFile(infoPath, hostnames);
    }

    getEnvironment(environmentName) {
        if (!this.getProjectInfo().environments.includes(environmentName)) {
            throw new errors.ArgumentError(`'${environmentName}' is not a valid environment in` +
                ` pipeline ${this.projectName}`, "invalid_env_name", environmentName, this.projectName);
        }
        return this.dependencies.getEnvironment(environmentName, this);
    }

    /**
     * Setup templates and variable definitions based on a conversion instruction file
     * Each product needs its own set of rules.
     * @returns {Promise.<void>}
     */
    async setupPropertyTemplate(ruleTree) {
        let isNewProperty = true;
        let suggestedRuleFormat;
        if (_.isObject(ruleTree)) {
            isNewProperty = false;
        }
        let createTemplates = true;
        for (let envName of this.getProjectInfo().environments) {
            let env = this.getEnvironment(envName);
            if (!_.isObject(ruleTree)) {
                let clientSettings = await this.dependencies.getPAPI().getClientSettings();
                ruleTree = await env.getRuleTree(clientSettings.ruleFormat);
                if (_.isArray(ruleTree.warnings)) {
                    for (let warning of ruleTree.warnings) {
                        if (warning.type === "https://problems.luna.akamaiapis.net/papi/v0/unstable_rule_format") {
                            suggestedRuleFormat = warning.suggestedRuleFormat;
                            //see comment above, same reason.
                            ruleTree = await env.getRuleTree(warning.suggestedRuleFormat);
                            break;
                        }
                    }
                }
            }
            //only need to create templates based on first environment.
            //templates are stripped of any env based information.
            env.createTemplate(ruleTree, isNewProperty, createTemplates);
            createTemplates = false;
        }
        if (_.isString(suggestedRuleFormat)) {
            await this.dependencies.getPAPI().setRuleFormat(suggestedRuleFormat);
        }
    }

    async getRuleTree(environmentName) {
        let environment = this.getEnvironment(environmentName);
        return await environment.getRuleTree();
    }

    async getPropertyRuleTree(propertyId, version) {
        let papi = this.dependencies.getPAPI();
        let suggestedRuleFormat;
        let clientSettings = await papi.getClientSettings();
        if (!_.isNumber(version)) {
            let versionInfo = await papi.latestPropertyVersion(propertyId);
            version = versionInfo.versions.items[0].propertyVersion;
        }
        let ruleTree = await papi.getPropertyVersionRules(propertyId, version, clientSettings.ruleFormat);
        if (_.isArray(ruleTree.warnings)) {
            for (let warning of ruleTree.warnings) {
                if (warning.type === "https://problems.luna.akamaiapis.net/papi/v0/unstable_rule_format") {
                    suggestedRuleFormat = warning.suggestedRuleFormat;
                    //we want to get the rule tree converted to the suggested rule format.
                    //so that we don't build the template with an unstable rule format.
                    ruleTree = await papi.getPropertyVersionRules(propertyId, version, warning.suggestedRuleFormat);
                    break;
                }
            }
        }
        if (_.isString(suggestedRuleFormat)) {
            await papi.setRuleFormat(suggestedRuleFormat);
        }
        return ruleTree
    }

    loadAndSubstituteProjectResourceData(fileName, context) {
        let resourcePath = path.join(__dirname, "..", "resources", fileName);
        let jsonResource = this.utils.readJsonFile(resourcePath);
        let el = this.dependencies.getEL({
            resource: context,
            resourcePath: "dummy"
        }, null, null); //resolver null, so we don't try to resolve includes
        return el.parseObject(jsonResource);
    }

    storeVariableDefinitions(variables) {
        let resourcePath = path.join(this.projectFolder, "environments", "variableDefinitions.json");
        this.utils.writeJsonFile(resourcePath, variables);
        return resourcePath;
    }

    loadVariableDefinitions() {
        let resourcePath = path.join(this.projectFolder, "environments", "variableDefinitions.json");
        return {
            resource: this.utils.readJsonFile(resourcePath),
            resourcePath: path.join("environments", "variableDefinitions.json")
        }
    }

    storeEnvironmentVariableValues(variableValues, envName) {
        let resourcePath = path.join(this.projectFolder, "environments", envName, "variables.json");
        this.utils.writeJsonFile(resourcePath, variableValues);
        return resourcePath;
    }

    loadEnvironmentVariableValues(envName) {
        let resourcePath = path.join(this.projectFolder, "environments", envName, "variables.json");
        return {
            resource: this.utils.readJsonFile(resourcePath),
            resourcePath: path.join("environments", envName, "variables.json")
        }
    }

    getPreviousEnvironment(envName) {
        let prevEnv;
        for (let env of this.getProjectInfo().environments) {
            if (env === envName) {
                if (_.isString(prevEnv)) {
                    return this.getEnvironment(prevEnv);
                }
            }
            prevEnv = env;
        }
    }

    async promote(envName, network, emails) {
        logger.info(`promoting environment '${envName} on network '${network}'`);
        let prevEnv = this.getPreviousEnvironment(envName);
        if (_.isObject(prevEnv)) {
            logger.info(`checking promotional status of '${prevEnv.name}'`);
            if (prevEnv.isPendingPromotion()) {
                logger.info(`promotion pending in at least one network for '${prevEnv.name}'`);
                await prevEnv.checkPromotions();
            }
            if (!prevEnv.isActive(network) || prevEnv.isDirty()) {
                throw new errors.ValidationError(
                    `Environment '${prevEnv.name}' needs to be active without any pending changes`,
                    "precursor_environment_not_active");
            }
        }
        return this.getEnvironment(envName).promote(network, emails);
    }
}

module.exports = Project;