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


const path = require('path');
const _ = require('underscore');

const errors = require('./errors');
const fs = require('fs');
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
        this.version = dependencies.version;
        this.projectFolder = path.normalize(path.join(this.devopsHome, projectName));
        this.utils = dependencies.getUtils();
        this.devopsSettings = dependencies.devopsSettings || {};
        this.dependencies = dependencies;
        this.__projectInfo = null;
    }

    checkMigrationStatus(newVersion) {
        let infoPath = path.join(this.projectFolder, "projectInfo.json");
        let prjInfo = this.utils.readJsonFile(infoPath);
        //before this change was put in there was no version in a projectInfo.file
        //if projectInfo doesn't have a version field, it was created by an earlier version.
        if (!prjInfo.version && prjInfo.groupId) {
            let groupId = prjInfo.groupId;
            prjInfo.groupIds = [prjInfo.groupId];
            delete prjInfo.groupId;
            prjInfo.version = newVersion;
            this.utils.writeJsonFile(infoPath, prjInfo);
            for (let envName of prjInfo.environments) {
                let environment = this.getEnvironment(envName);
                let envInfo = environment.getEnvironmentInfo();
                envInfo.groupId = groupId;
                environment.storeEnvironmentInfo(envInfo);
            }
        }
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

    validateEnvironmentNames(environmentNames) {
        if (!_.isArray(environmentNames)) {
            throw new errors.ArgumentError(`Expecting array of environment names, but got '${environmentNames}'`,
                "malformed_environment_data", environmentNames);
        }
        if (environmentNames.length < 1) {
            throw new errors.ArgumentError(`Expecting at least 1 environment names`, "need_more_env_names");
        }
        if (environmentNames.length > 30) {
            throw new errors.ArgumentError(`Number of environments should not exceed 30`, "too_many_env_names");
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
            groupIds: createProjectInfo.groupIds,
            environments: createProjectInfo.environments,
            version: this.version,
            isSecure: createProjectInfo.secureOption || false
        };
        // this looks like this improperly overrides --section argument
        if (_.isObject(this.devopsSettings) &&
            _.isObject(this.devopsSettings.edgeGridConfig) &&
            _.isString(this.devopsSettings.edgeGridConfig.section)) {
            this.projectInfo.edgeGridConfig = {
                section: this.devopsSettings.edgeGridConfig.section
            };
        }
        if (_.isBoolean(createProjectInfo.customPropertyName) && createProjectInfo.customPropertyName) {
            this.projectInfo.customPropertyName = createProjectInfo.customPropertyName;
        }
        if (_.isBoolean(createProjectInfo.associatePropertyName) && createProjectInfo.associatePropertyName) {
            this.projectInfo.associatePropertyName = createProjectInfo.associatePropertyName;
        }
        this.projectInfo.name = this.projectName;
        //todo: what other stuff can go here?
        let infoPath = path.join(this.projectFolder, "projectInfo.json");
        this.utils.writeJsonFile(infoPath, this.projectInfo);
    }



    createEnvironments(envs) {
        _.each(envs, function(name) {
            let environmentFolder = path.join(this.projectFolder, "environments", name);
            this.utils.mkdir(environmentFolder);
        }, this);
    }

    checkInfoPath(infoPath) {
        if (!this.utils.fileExists(infoPath)) {
            throw new errors.DependencyError(`projectInfo file: ${infoPath} does not exist!`,
                "missing_pipeline_info_file", infoPath);
        }
    }

    getProjectInfo() {
        if (!this.__projectInfo) {
            let infoPath = path.join(this.projectFolder, "projectInfo.json");
            this.checkInfoPath(infoPath);
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
        } else {
            // check env dir exists
            let envPath = path.join(this.projectFolder, "environments", envName);
            if (!fs.existsSync(envPath)) {
                throw new errors.ArgumentError(`Could not open environments directory at '${envPath}'`,
                    "env_parse_error")
            } else {
                throw new errors.ArgumentError(`Could not open envInfo.json at '${infoPath}'`,
                    "env_parse_error")

            }
        }
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
        let hostNames = path.join(this.projectFolder, "environments", envName, "hostnames.json");
        return this.utils.readJsonFile(hostNames);
    }

    storeEnvironmentHostnames(envName, hostnames) {
        let hostNames = path.join(this.projectFolder, "environments", envName, "hostnames.json");
        return this.utils.writeJsonFile(hostNames, hostnames);
    }

    getEnvironment(environmentName) {
        this.checkEnvironmentName(environmentName);
        return this.dependencies.getEnvironment(environmentName, this);
    }

    checkEnvironmentName(environmentName) {
        if (!_.isArray(this.getProjectInfo().environments)) {
            throw new errors.UndefinedVariableError("unable to parse environments", "env_definition_error");
        }
        if (!this.getProjectInfo().environments.includes(environmentName)) {
            throw new errors.ArgumentError(`'${environmentName}' is not a valid environment in` +
                ` pipeline ${this.projectName}`, "invalid_env_name", environmentName, this.projectName);
        }
    }

    /**
     * Setup templates and variable definitions based on a conversion instruction file
     * Each product needs its own set of rules.
     * @returns {Promise.<void>}
     */
    async setupPropertyTemplate(ruleTree, variableMode) {
        let suggestedRuleFormat;
        let projectInfo = this.getProjectInfo();
        let createTemplates = true;
        for (let envName of this.getProjectInfo().environments) {
            let env = this.getEnvironment(envName);
            if (!_.isObject(ruleTree)) {
                let clientSettings = await this.dependencies.getPAPI().getClientSettings();
                ruleTree = await env.getRuleTree(clientSettings.ruleFormat);
                if (_.isArray(ruleTree.warnings)) {
                    for (let warning of ruleTree.warnings) {
                        if (warning.type === "https://problems.luna.akamaiapis.net/papi/v0/unstable_rule_format" ||
                            warning.type === "https://problems.luna.akamaiapis.net/papi/v1/unstable_rule_format") {
                            suggestedRuleFormat = warning.suggestedRuleFormat;
                            //see comment above, same reason.
                            ruleTree = await env.getRuleTree(warning.suggestedRuleFormat);
                            break;
                        }
                    }
                }
            }
            env.setupEnvRuleFormat(ruleTree);
            let productId = projectInfo.productId;
            let resourceData = this.loadAndSubstituteProjectResourceData("template.converter.data.json", {
                environment: env
            });
            ruleTree.rules.options.is_secure = projectInfo.isSecure;
            let template = this.dependencies.getTemplate(ruleTree, resourceData, productId);
            let templateData = template.process(variableMode);
            if (createTemplates) {
                this.storeTemplate("main.json", templateData.main);
                _.each(templateData.templates, (value, key) => {
                    this.storeTemplate(key, value);
                }, this);
                this.storeVariableDefinitions(templateData.variables);
            }
            this.storeEnvironmentVariableValues(templateData.envVariables, env.name);
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

    /**
     * @param propertyId
     * @param version
     * @param network
     * @return {Promise.<*>}
     */

    async getPropertyInfo(propertyId, version, network) {
        let papi = this.dependencies.getPAPI();
        let versionInfo;
        if (!_.isNumber(version)) {
            versionInfo = await papi.latestPropertyVersion(propertyId, network);
        } else {
            versionInfo = await papi.getPropertyVersion(propertyId, version);
        }
        return {
            propertyId: versionInfo.propertyId,
            propertyName: versionInfo.propertyName,
            contractId: versionInfo.contractId,
            groupId: versionInfo.groupId,
            productId: versionInfo.versions.items[0].productId,
            propertyVersion: versionInfo.versions.items[0].propertyVersion
        }
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
                if (warning.type === "https://problems.luna.akamaiapis.net/papi/v0/unstable_rule_format" ||
                    warning.type === "https://problems.luna.akamaiapis.net/papi/v1/unstable_rule_format") {
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
        return ruleTree;
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

    /**
     * Promote changes to provided environment
     * @param envName
     * @param network
     * @param emails
     * @param message
     * @returns {Promise<Promise<*>|Promise<{envInfo: *, pending: {network: *, activationId: Number}}>|*>}
     */
    async promote(envName, network, emails, message, force) {
        this.checkEnvironmentName(envName);
        logger.info(`promoting environment '${envName}' on network '${network}'`);
        let envNamesList = this.getProjectInfo().environments;
        //slicing allows for a copy
        let envNamesCopy = envNamesList.slice(0, envNamesList.indexOf(envName));
        logger.info(`beginning check of each previous environment: ${envNamesCopy}`);
        if (_.isBoolean(force) && force) {
            logger.warn(`Deprecated --force: Previous environment need not be active and can be with any pending changes`);
        }
        return this.getEnvironment(envName).promote(network, emails, message);
    }

    /**
     * change ruleformat for a pipeline or environment of a project
     * @param envName {string}
     * @param ruleFormat {string}
     */
    async changeRuleFormat(envName, ruleFormat) {
        this.checkEnvironmentName(envName);
        return this.getEnvironment(envName).changeRuleFormat(envName, ruleFormat);

    }
}

module.exports = Project;