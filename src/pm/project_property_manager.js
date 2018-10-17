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

const errors = require('../errors');

const logger = require("../logging").createLogger("pm-cli.project");
const project = require("../project");

/**
 * Represents the data model of the property manager property
 * responsible for all storage operations within the property/project.
 */
class ProjectPropertyManager extends project {
    /**
     * @param projectName
     * @param dependencies devops: mandatory DevOps instance, elClass, utilsClass are optional.
     *
     */
    constructor(projectName, dependencies) {
        super(projectName, dependencies)
    }

    createProjectFolders(createProjectInfo) {
        logger.info("creating property %s", this.projectFolder);
        this.__createProjectFolders();
        this.createProjectSettings(createProjectInfo);
    }

    __createProjectFolders() {
        this.utils.mkdir(this.projectFolder);
        const folders = ["cache", "dist", "config-snippets"];
        _.each(folders, function(name) {
            this.utils.mkdir(path.join(this.projectFolder, name));
        }, this);
    }
    createEnvironments() {
        //Overwrite project to do nothing..  No environment folders should exist
    }

    checkEnvironmentName() {
        //Do nothing, no need to check environment names!  Right!?
    }

    /*
     * overwriting the check for environment names
     */
    validateEnvironmentNames() {}

    /*
     *  overwriting new location of envInfo.json
     */
    storeEnvironmentInfo(environmentInfo) {
        let infoPath = path.join(this.projectFolder, "envInfo.json");
        this.utils.writeJsonFile(infoPath, environmentInfo);
    }

    /*
     *  loading new location of envInfo.json
     */
    loadEnvironmentInfo() {
        let infoPath = path.join(this.projectFolder, "envInfo.json");
        if (this.utils.fileExists(infoPath)) {
            return this.utils.readJsonFile(infoPath);
        }
        return null;
    }

    /*
     *  loading new location of hostname.json
     */
    loadEnvironmentHostnames() {
        let hostNames = path.join(this.projectFolder, "hostnames.json");
        return this.utils.readJsonFile(hostNames);
    }

    /*
     *  overwriting new location of hostname.json
     */
    storeEnvironmentHostnames(envName, hostnames) {
        let hostNames = path.join(this.projectFolder, "hostnames.json");
        return this.utils.writeJsonFile(hostNames, hostnames);
    }

    /*
     *  overwriting new location of "config-snippets"
     */
    storeTemplate(name, template) {
        let configSnippetsPath = path.join(this.projectFolder, "config-snippets", name);
        this.utils.writeJsonFile(configSnippetsPath, template);
        return configSnippetsPath;
    }
    /*
     *  loading new location of the "config-snippets"
     */
    loadTemplate(name) {
        let configSnippetsPath = path.join(this.projectFolder, "config-snippets", name);
        return {
            resource: this.utils.readJsonFile(configSnippetsPath),
            resourcePath: path.join("config-snippets", name)
        }
    }

    /*
     *  Don't store variable definitions for PM.  Overwriting to do nothing
     */
    storeVariableDefinitions() {}

    /*
     *  Don't load variable definitions for PM.  Overwriting to do nothing
     */
    loadVariableDefinitions() {}

    /*
     *  Don't store variables for PM.  Overwriting to do nothing
     */
    storeEnvironmentVariableValues() {}

    checkInfoPath(infoPath) {
        if (!this.utils.fileExists(infoPath)) {
            throw new errors.DependencyError(`projectInfo file: ${infoPath} does not exist!`,
                "missing_pm_cli_info_file", infoPath);
        }
    }


    /*
     *  Don't load variables for snippets.  Overwriting to do nothing
     */
    loadEnvironmentVariableValues() {}

    /**
     * Setup templates.  We can "use" a conversion file but as of right now we don't want any variables.
     * @returns {Promise.<void>}
     */
    async setupPropertyTemplate(ruleTree, variableMode) {
        let suggestedRuleFormat;
        let projectInfo = this.getProjectInfo();
        let createTemplates = true;

        let env = this.getEnvironment(this.getProjectInfo().name);
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
        env.setupEnvRuleFormat(ruleTree);
        let productId = projectInfo.productId;
        let resourceData = this.loadAndSubstituteProjectResourceData("snippets.converter.data.json", {
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

        }

        createTemplates = false;

        if (_.isString(suggestedRuleFormat)) {
            await this.dependencies.getPAPI().setRuleFormat(suggestedRuleFormat);
        }
    }

    /**
     * Overwriting this one, since there is no concept of "previous" environment
     */
    getPreviousEnvironment() {

    }

    createProjectSettings(createProjectInfo) {
        this.projectInfo = {
            productId: createProjectInfo.productId,
            contractId: createProjectInfo.contractId,
            groupId: createProjectInfo.groupId,
            version: this.version,
            isSecure: createProjectInfo.secureOption || false
        };
        if (_.isObject(this.devopsSettings) &&
            _.isObject(this.devopsSettings.edgeGridConfig) &&
            _.isString(this.devopsSettings.edgeGridConfig.section)) {
            this.projectInfo.edgeGridConfig = {
                section: this.devopsSettings.edgeGridConfig.section
            };
        }
        this.projectInfo.name = this.projectName;
        //todo: what other stuff can go here?
        let infoPath = path.join(this.projectFolder, "projectInfo.json");
        this.utils.writeJsonFile(infoPath, this.projectInfo);
    }

    /**
     * Promote changes to the project
     * @param projectName
     * @param network
     * @param emails
     * @param message
     * @returns {Promise<Promise<*>|Promise<{envInfo: *, pending: {network: *, activationId: Number}}>|*>}
     */
    async promote(projectName, network, emails, message) {
        logger.info(`Activating property '${projectName}' on network '${network}'`);
        return this.getEnvironment(projectName).promote(network, emails, message);
    }
}

module.exports = ProjectPropertyManager;