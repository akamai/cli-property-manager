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
const fs = require('fs');
const os = require('os');
const _ = require('underscore');

const EdgeGrid = require('./edgegrid/api');
const DevOps = require('./devops');
const Project = require('./project');
const PAPI = require('./papi');
const OpenClient = require('./openclient');
const RecordingClient = require('./recordingclient');
const ReplayClient = require('./replayclient');
const Environment = require('./environment');
const Merger = require('./merger');
const Utils = require('./utils');
const EL = require('./el');
const Template = require('./template');
const errors = require('./errors');
const helpers = require('./helpers');
const logger = require("./logging")
    .createLogger("devops-prov.factory");

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

    let sectionName = dependencies.section || edgeGridConfig.section || "credentials";

    logger.info(`Using credentials file: '${edgegridRc}', section: '${sectionName}'`);

    if (!fs.existsSync(edgegridRc)) {
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
    //This can be overridden by setting the AKAMAI_PD_PROJECT_HOME env variable or
    // passing devopsHome with the dependencies object.
    const devopsHome = dependencies.devopsHome || procEnv["AKAMAI_PD_PROJECT_HOME"] || process.cwd();
    let devopsSettings = {};

    if (procEnv["HOME"]) {
        let devopsConfig = path.resolve(procEnv["HOME"], ".devopsSettings.json");
        if (utils.fileExists(devopsConfig)) {
            devopsSettings = utils.readJsonFile(devopsConfig);
        }
    }

    if (devopsHome) {
        let devopsConfig = path.join(devopsHome, "devopsSettings.json");
        if (utils.fileExists(devopsConfig)) {
            devopsSettings = helpers.mergeObjects(devopsSettings, utils.readJsonFile(devopsConfig));
        }
        devopsSettings.devopsHome = devopsHome;
    }

    if (!devopsSettings.devopsHome) {
        throw new errors.DependencyError("Need to know location of devopsHome folder. Please set AKAMAI_PD_PROJECT_HOME environment variable.",
            "devops_pipeline_home_env_var_missing");
    }

    devopsSettings.edgeGridConfig = prepareEdgeGridConfig(utils, devopsSettings, dependencies);

    return devopsSettings;
};

/**
 * Somewhat unsatisfying "do your own dependency injection scheme"
 * @param devopsHome
 * @param dependencies
 * @returns factory object
 */
const createDevOps = function(dependencies = {}) {
    const procEnv = dependencies.procEnv || {};
    const devOpsClass = dependencies.devOpsClass || DevOps;
    const projectClass = dependencies.projectClass || Project;
    const papiClass = dependencies.papiClass || PAPI;
    const openClientClass = dependencies.openClientClass || OpenClient;
    const recordingClientClass = dependencies.recordingClientClass || RecordingClient;
    const replayClientClass = dependencies.replayClientClass || ReplayClient;
    const environmentClass = dependencies.environmentClass || Environment;
    const mergerClass = dependencies.mergerClass || Merger;
    const utilsClass = dependencies.utilsClass || Utils;
    const elClass = dependencies.elClass || EL;
    const templateClass = dependencies.templateClass || Template;
    const clientType = dependencies.clientType || "regular";
    const recordFilename = dependencies.recordFilename;
    const recordErrors = dependencies.recordErrors;
    const utils = getUtils();
    const devopsSettings = prepareSettings(dependencies, procEnv, utils);
    const cache = {};

    const devops = new devOpsClass(devopsSettings, {
        getProject,
        getPAPI,
        getUtils
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
     * Throws error if expectExists === true but pipeline doesn't exist.
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
            getPAPI,
            devopsSettings
        });
        if (expectExists && !project.exists()) {
            throw new errors.DependencyError(`Pipeline '${projectName}' doesn't exist!`, "unknown_pipeline", projectName);
        }
        return project;
    }

    function getEdgeGrid() {
        let config = devopsSettings.edgeGridConfig;
        try {
            return new EdgeGrid(config);
        } catch (error) {
            throw new errors.ArgumentError(`No client id section '${config.section}' found in '${config.path}'`,
                "invalid_client_id", config.section);
        }
    }

    function getOpenClient() {
        if (clientType === "regular") {
            return new openClientClass({
                getEdgeGrid
            });
        } else if (clientType === "record") {
            logger.info(`Using recording client, writing to '${recordFilename}'`);
            return new recordingClientClass(recordFilename, {
                getEdgeGrid,
                getUtils,
                recordErrors
            });
        } else if (clientType === "replay") {
            logger.info(`Using replay client, reading from '${recordFilename}'`);
            return new replayClientClass(recordFilename, {
                getUtils
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
            getTemplate,
            getMerger
        });
    }

    function getEL(defaultSource, overrideSource, includeResolver) {
        return new elClass(defaultSource, overrideSource, includeResolver);
    }

    function getTemplate(pmData, converterData, productId, isNewProperty = true) {
        return new templateClass(pmData, converterData, productId, isNewProperty);
    }

    function getMerger(project, environment) {
        return new mergerClass(project, environment, {
            getEL
        });
    }

    return devops;
};

module.exports = createDevOps;