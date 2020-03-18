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
const os = require('os');
const _ = require('underscore');

const EdgeGrid = require('./edgegrid/api');
const DevOps = require('./devops');
const DevOpsSnippets = require('./pm/devops_property_manager')
const Project = require('./project');
const PAPI = require('./papi');
const OpenClient = require('./openclient');
const Environment = require('./environment');
const Merger = require('./merger');
const Utils = require('./utils');
const EL = require('./el');
const Template = require('./template');
const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging")
    .createLogger("devops-prov.factory");
const SnippetsProject = require('./pm/project_property_manager');
/**
 *
 * @param devopsSettings
 * @param dependencies
 * @return {{path: *, section: (*|string)}}
 */
const prepareEdgeGridConfig = function(utils, devopsSettings, dependencies) {
    let edgeGridConfig = devopsSettings.edgeGridConfig || {};
    let devopsHomeEdgerc = path.join(devopsSettings.devopsHome, "edgerc.config");
    let userHomeEdgerc = path.join(os.homedir(), ".edgerc");
    let edgegridRc;
    if (edgeGridConfig.path) {
        if (!utils.fileExists(edgeGridConfig.path)) {
            throw new errors.DependencyError(`Can't create edgegrid instance! Credentials file missing: '${edgeGridConfig.path}'`,
                "missing_edgegrid_credentials");
        }
        edgegridRc = edgeGridConfig.path;
    } else if (utils.fileExists(devopsHomeEdgerc)) {
        edgegridRc = devopsHomeEdgerc;
    } else if (utils.fileExists(userHomeEdgerc)) {
        edgegridRc = userHomeEdgerc;
    }
    let sectionName = dependencies.section || edgeGridConfig.section || "papi";

    logger.info(`Using credentials file: '${edgegridRc}', section: '${sectionName}'`);

    if (!utils.fileExists(edgegridRc)) {
        throw new errors.DependencyError("Can't create edgegrid instance! Credentials file missing.",
            "missing_edgegrid_credentials");
    }
    return {
        path: edgegridRc,
        section: sectionName
    };
};

const prepareSettings = function(dependencies, procEnv, utils) {
    //by default devopsHome is the current working directory.
    //This can be overridden by setting the AKAMAI_PROJECT_HOME env variable or
    // passing devopsHome with the dependencies object.
    const devopsHome = dependencies.devopsHome || procEnv["AKAMAI_PROJECT_HOME"] || process.cwd();
    let devopsSettings = {};

    if (procEnv["HOME"]) {
        let devopsConfig;
        if (dependencies.devOpsClass === DevOpsSnippets) {
            devopsConfig = path.resolve(procEnv["HOME"], ".snippetsSettings.json");
        } else {
            devopsConfig = path.resolve(procEnv["HOME"], ".devopsSettings.json");
        }
        if (utils.fileExists(devopsConfig)) {
            devopsSettings = utils.readJsonFile(devopsConfig);
        }
    }

    if (devopsHome) {
        let devopsConfig;
        if (dependencies.devOpsClass === DevOpsSnippets) {
            devopsConfig = path.join(devopsHome, "snippetsSettings.json");
        } else {
            devopsConfig = path.join(devopsHome, "devopsSettings.json");
        }
        if (utils.fileExists(devopsConfig)) {
            let savedSettings = utils.readJsonFile(devopsConfig);
            devopsSettings = helpers.mergeObjects(devopsSettings, savedSettings);
            devopsSettings.__savedSettings = savedSettings;
        }
        devopsSettings.devopsHome = devopsHome;
    }

    devopsSettings.outputFormat = dependencies.outputFormat || devopsSettings.outputFormat || "table";

    if (!devopsSettings.devopsHome) {
        throw new errors.DependencyError("Need to know location of devopsHome folder. Please set AKAMAI_PROJECT_HOME environment variable.",
            "property_home_env_var_missing");
    }

    devopsSettings.edgeGridConfig = prepareEdgeGridConfig(utils, devopsSettings, dependencies);

    return devopsSettings;
};

/**
 * Somewhat unsatisfying "do your own dependency injection scheme"
 *
 * EXTREMELY unsatisfying.  The logger breaks because of when depencies are "injected"
 * @param devopsHome
 * @param dependencies
 * @returns factory object
 */
const createDevOps = function(dependencies = {}) {
    const devOpsClass = dependencies.devOpsClass || DevOps;
    const projectClass = dependencies.projectClass || Project;
    const procEnv = dependencies.procEnv || {};
    const papiClass = dependencies.papiClass || PAPI;
    const openClientClass = dependencies.openClientClass || OpenClient;
    const environmentClass = dependencies.environmentClass || Environment;
    const mergerClass = dependencies.mergerClass || Merger;
    const utilsClass = dependencies.utilsClass || Utils;
    const elClass = dependencies.elClass || EL;
    const templateClass = dependencies.templateClass || Template;
    const clientType = dependencies.clientType || "regular";
    const version = dependencies.version || "Version Information Missing";
    const utils = getUtils();
    const devopsSettings = prepareSettings(dependencies, procEnv, utils);
    const shouldProcessPapiErrors = _.isBoolean(devopsSettings.processPapiErrors) ?
        devopsSettings.processPapiErrors : true;
    const cache = {};

    const devops = new devOpsClass(devopsSettings, {
        getProject,
        getPAPI,
        getUtils,
        version
    });

    /**
     * do we really need this if we just cache papi, since every other component
     * depends on calling context.
     * @param name
     * @param createFunction
     * @returns {*}
     */
    function getOrCreate(name, createFunction) {
        let resource = cache[name];
        if (!_.isObject(resource)) {
            logger.info(`need to create ${name}`);
            resource = createFunction(); //create function has access to calling fn's namespace
            cache[name] = resource;
        }
        return resource;
    }

    function getUtils() {
        return new utilsClass();
    }

    /**
     * Create and return Project instance.
     * Throws error if expectExists === true but pipeline/property doesn't exist.
     * @param projectName
     * @param expectExists
     * @returns {*}
     */
    function getProject(projectName, expectExists = true) {
        let project = new projectClass(projectName, {
            devops,
            getUtils,
            getEL,
            getEnvironment,
            getTemplate,
            getPAPI,
            devopsSettings,
            version
        });
        if (expectExists) {
            if (project.exists()) {
                project.checkMigrationStatus(version);
            } else {
                if (project instanceof SnippetsProject) {
                    throw new errors.DependencyError(`PM CLI property '${projectName}' doesn't exist!`, "unknown_pm_cli_property",
                        projectName);
                } else {
                    throw new errors.DependencyError(`Akamai pipeline '${projectName}' doesn't exist!`, "unknown_pipeline",
                        projectName);
                }

            }
        }
        return project;
    }

    function getEdgeGrid() {
        let config = devopsSettings.edgeGridConfig;
        return new EdgeGrid(config);
    }

    function getAccountSwitchKey() {
        return devopsSettings.accountSwitchKey;
    }

    function getOpenClient() {

        const defaultHeaders = (devOpsClass === DevOpsSnippets) ? {
            "X-User-Agent": `Akamai-PD; Version=${version};pm-cli;`
        } : {
            "X-User-Agent": `Akamai-PD; Version=${version}`
        };
        if (clientType === "regular") {
            return new openClientClass({
                getEdgeGrid,
                defaultHeaders,
                getAccountSwitchKey
            });
        } else {
            throw new errors.ArgumentError(`unknown clientType: ${clientType}`, "unknown_client_type", clientType);
        }
    }

    function getPAPI() {
        return getOrCreate("papi", () => {
            return new papiClass(getOpenClient());
        });
    }

    function getEnvironment(envName, project, envInfo) {
        return new environmentClass(envName, {
            project,
            getPAPI,
            envInfo,
            getMerger,
            shouldProcessPapiErrors
        });
    }

    function getEL(defaultSource, overrideSource, includeResolver) {
        return new elClass(defaultSource, overrideSource, includeResolver);
    }

    function getTemplate(pmData, converterData, productId) {
        return new templateClass(pmData, converterData, productId);
    }

    function getMerger(project, environment) {
        return new mergerClass(project, environment, {
            getEL
        });
    }

    return devops;
};

module.exports = createDevOps;