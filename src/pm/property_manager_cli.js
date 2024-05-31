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


/**
 * akamai pm command line tool calling into SDK classes and methods.
 */
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const version = require("../../package.json").version;

const DevOpsCommand = require('../command');
const errors = require('../errors');
const logging = require('../logging');
const helpers = require('../helpers');
const Utils = require('../utils');
const commonCliClass = require('../common/common_cli');
const inquirer = require('inquirer');

const reportLabel = {
    table: "Property",
    json: "property",
    activationLabel: "activation"
};

const cliLogger = new logging.ConsoleLogger();

const footer = "  © 2017-2020 Akamai Technologies, Inc. All rights reserved\n" +
    "  Visit http://github.com/akamai/cli-property-manager for more documentation\n";

/**
 * Main function called by CLI command
 * parses command line arguments and delegates to the correct handler function.
 *
 * @param cmdArgs {Array} defaults to process.argv, override in unit tests
 * @param procEnv {Object} defaults to process.env
 * @param overrideDevopsFactoryFunction {Function} allow overriding of default factory function
 * @param overrideErrorReporter {Function} allow overriding of default error reporter and handler
 * @param consoleLogger {Object} allow overriding of of default cli logger
 */
module.exports = function(cmdArgs = process.argv, procEnv = process.env,
    overrideDevopsFactoryFunction = null, overrideErrorReporter = null, consoleLogger = cliLogger) {

    let reportError;

    let verbose = false;

    if (_.isFunction(overrideErrorReporter)) {
        reportError = overrideErrorReporter;
    } else {
        reportError = function(error, verbose) {
            if (error instanceof errors.AkamaiPDError) {
                if (verbose) {
                    consoleLogger.error(`PM CLI Error: '${error.messageId}' occurred: \n`, error.stack);
                    if (_.isArray(error.args) && error.args.length > 0) {
                        consoleLogger.error("Error details: ");
                        _.each(error.args, function(detail, index) {
                            if (_.isObject(detail) || _.isArray(detail)) {
                                detail = helpers.jsonStringify(detail);
                            }
                            consoleLogger.error(`\tArgument #${index}: `, detail);
                        });
                    }
                } else {
                    consoleLogger.error(`PM CLI Error: '${error.messageId}' occurred: \n`, error.message);
                }
            } else {
                consoleLogger.error("PM CLI error occurred: ", error, error.stack);
            }
            process.exitCode = 1;
        };
    }


    const commonCli = new commonCliClass(cmdArgs, procEnv, overrideDevopsFactoryFunction, overrideErrorReporter, consoleLogger, reportLabel, reportError, verbose);

    const printAllowedModes = commonCli.printAllowedModes;

    const printAllowedModesUpdateOrImport = commonCli.printAllowedModesUpdateOrImport;

    const checkVariableModeOptions = commonCli.checkVariableModeOptions;

    const checkVariableModeOptionsImportUpdateLocal = commonCli.checkVariableModeOptionsImportUpdateLocal;

    const useVerboseLogging = function(options) {
        if (options.parent) {
            let parentOptions = options.parent;
            return _.isBoolean(parentOptions.verbose) ? parentOptions.verbose : false;
        } else {
            return false;
        }
    };

    /**
     * Constructs a new DevOps instances based on command line options.
     * This allows for customizations of dependencies like the record to file, replay from file open client.
     * @param options
     * @returns {DevOps}
     */
    const createDevops = function(options) {
        const logging = require("../logging");
        validateOptions(options);
        let clientType = "regular";
        let outputFormat;
        let section;
        let devopsHome;
        let edgerc;
        let accountSwitchKey;
        if (options.parent) {
            let parentOptions = options.parent;
            if (parentOptions.format) {
                outputFormat = parentOptions.format;
            }
            section = parentOptions.section;
            if (parentOptions.workspace) {
                devopsHome = parentOptions.workspace;
            }
            if (parentOptions.edgerc) {
                edgerc = parentOptions.edgerc;
            }
            if (parentOptions.accountSwitchKey) {
                accountSwitchKey = parentOptions.accountSwitchKey;
            }
        }
        logging.log4jsLogging(useVerboseLogging(options), 'snippets');

        let devopsFactoryFunction;
        if (_.isFunction(overrideDevopsFactoryFunction)) {
            devopsFactoryFunction = overrideDevopsFactoryFunction;
        } else {
            devopsFactoryFunction = require('../factory');
        }
        //Due to the way the log4js is defined and used, we need to declare these AFTER we "configure" log4js
        const DevOpsSnippets = require('./devops_property_manager');
        const SnippetsProject = require('./project_property_manager');
        const EnvironmentSnippets = require('./environment_property_manager');
        const MergerSnippets = require('./merger_property_manager');

        let devOpsClass = DevOpsSnippets;
        let projectClass = SnippetsProject;
        let environmentClass = EnvironmentSnippets;
        let mergerClass = MergerSnippets;

        return devopsFactoryFunction({
            procEnv,
            devOpsClass,
            projectClass,
            environmentClass,
            mergerClass,
            clientType,
            devopsHome,
            edgerc,
            section,
            version,
            outputFormat,
            accountSwitchKey
        });
    };

    /**
     * @param environmentName
     * @param options
     */
    const showRuletree = function(devops, options) {
        let property = devops.extractProjectName(options);
        let propertyInfo = commonCli.checkPropertyIdAndPropertyVersion(property, parseInt(options.propver, 10));
        propertyInfo.propertyVersion = commonCli.checkPropertyVersionIsZero(propertyInfo.propertyVersion);

        return devops.getPropertyRules(propertyInfo).then(data => {
            if (options.file) {
                let utils = new Utils();
                utils.writeJsonFile(options.file, data);
                consoleLogger.info("output saved to file: " + options.file);
            }
            consoleLogger.info(helpers.jsonStringify(data));
        });
    }

    const createCpcode = function(devops, options) {
        return devops.createCpcode(options.contractId, options.groupId, options.cpcodeName, options.productId);
    }

    /**
     * sets the default snippet
     * @param options
     */
    const setDefault = function(devops, options) {
        let snippetName = options.property;
        let section = options.section || options.parent.section;
        let emails = options.emails;
        let format = options.format || options.parent.format;
        let accountSwitchKey = options.accountSwitchKey;
        if (!snippetName && !section && !emails && !format && !accountSwitchKey) {
            throw new errors.DependencyError("At least one option required. Use akamai property-manager -p <property name>," +
                "akamai property-manager -e <emails>, akamai property-manager -s <section>, akamai property-manager -a <accountSwitchKey> or akamai property-manager -f <format>.",
                "missing_option");
        }
        if (section) {
            devops.setDefaultSection(section);
        }
        if (snippetName) {
            devops.setDefaultProject(snippetName);
        }
        if (emails) {
            devops.setDefaultEmails(emails);
        }
        devops.setAccountSwitchKey(accountSwitchKey);
        if (format) {
            const formatRe = /^(json|table)$/i;
            if (!_.isString(format)) {
                throw new errors.ArgumentError("Only 'json' and 'table' formats are allowed.", "illegal_format", format);
            }
            if (format.match(formatRe)) {
                devops.setDefaultFormat(format.toLowerCase());
            } else {
                throw new errors.ArgumentError("Only 'json' and 'table' formats are allowed.", "illegal_format", format);
            }
        }
        showDefaults(devops);
    };

    const setPrefixes = commonCli.setPrefixes.bind(commonCli);
    const setRuleFormat = commonCli.setRuleFormat.bind(commonCli);
    const listContracts = commonCli.listContracts.bind(commonCli);
    const listProducts = commonCli.listProducts.bind(commonCli);
    const listGroups = commonCli.listGroups.bind(commonCli);
    const listCpcodes = commonCli.listCpcodes.bind(commonCli);
    const listProperties = commonCli.listProperties.bind(commonCli);
    const listPropertyHostnames = commonCli.listPropertyHostnames.bind(commonCli);
    const listEdgeHostnames = commonCli.listEdgeHostnames.bind(commonCli);
    const listPropertyVariables = commonCli.listPropertyVariables.bind(commonCli);
    const listPropertyRuleformat = commonCli.listPropertyRuleformat.bind(commonCli);
    const listRuleFormats = commonCli.listRuleFormats.bind(commonCli);
    const showDefaults = commonCli.showDefaults.bind(commonCli);
    const search = commonCli.search.bind(commonCli);


    /**
     * Creates a new PM CLI Project
     * @type {Function}
     */
    const createProject = function(devops, options) {
        let projectName = options.property;
        if (!projectName || _.isBoolean(projectName)) {
            throw new errors.DependencyError("Property option required. Use akamai property-manager np -p <property name> ...",
                "missing_property_name");
        }
        let propertyId, propertyName, propertyVersion;

        let checkedPropertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.propertyId, options.propver);
        propertyId = checkedPropertyInfo.propertyId;
        propertyName = checkedPropertyInfo.propertyName;
        propertyVersion = commonCli.checkPropertyVersionIsZero(checkedPropertyInfo.propertyVersion);
        let groupId = options.groupId;

        if (!(propertyId || propertyName || groupId)) {
            throw new errors.DependencyError("A propertyId, propertyName, or groupId is required.", "missing_id");
        }

        let contractId = options.contractId;
        if (!(propertyId || propertyName || contractId)) {
            throw new errors.DependencyError("contractId is required", "missing_contract_id");
        }
        let productId = options.productId;
        if (!(propertyId || propertyName || productId)) {
            throw new errors.DependencyError("productId is required", "missing_product_id");
        }

        let isInRetryMode = options.retry || false;
        let dryRun = options.dryRun || false;
        let variableMode;
        let noLocalFolders = options.nolocaldir || false;

        variableMode = (propertyId || propertyName) ? helpers.allowedModes[1] : helpers.allowedModes[0];
        variableMode = options.variableMode || variableMode;
        if (options.variableMode && !(propertyId || propertyName)) {
            throw new errors.ArgumentError(`The variable mode option is only available with existing properties.`,
                "variable_mode_needs_existing_property");
        } else if (!checkVariableModeOptions(variableMode)) {
            throw new errors.ArgumentError(`Invalid variable mode option selected. Valid modes are ${printAllowedModes()}`,
                "invalid_variable_mode");
        }
        let createPropertyInfo = {
            projectName,
            productId,
            variableMode,
            contractId,
            propertyId,
            groupId,
            propertyName,
            propertyVersion,
            isInRetryMode
        };
        if (_.isBoolean(options.secure)) {
            createPropertyInfo.secureOption = options.secure;
        }
        if (_.isBoolean(options.insecure)) {
            createPropertyInfo.secureOption = !options.insecure;
        }
        if (_.isBoolean(options.nolocaldir)) {
            createPropertyInfo.noLocalFolders = noLocalFolders;
        }
        if (dryRun) {
            consoleLogger.info("create property info: ", helpers.jsonStringify(createPropertyInfo));
        } else {
            return devops.createProperty(createPropertyInfo);
        }
    };

    const validateOptions = function(options) {
        if (options.property && (typeof options.property === 'string' || options.property instanceof String) && options.property.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing property name", "cli_unexpected_value");
        }

        if (options.groupId && (typeof options.groupId === 'string' || options.groupId instanceof String) && options.groupId.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing group id", "cli_unexpected_value");
        }

        if (options.contractId && options.contractId.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing contract id", "cli_unexpected_value");
        }

        if (options.productId && options.productId.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing product id", "cli_unexpected_value");
        }

        if (options.propertyId && (typeof options.propertyId === 'string' || options.propertyId instanceof String) && options.propertyId.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing property id", "cli_unexpected_value");
        }
    };

    /**
     * Report on validation warnings, errors and hostname errors.
     * @param data
     */
    const reportActionErrors = commonCli.reportActionErrors.bind(commonCli);

    /**
     * Merges templates with environment specific variables into PAPI ruletree.
     * @type {Function}
     */
    const merge = function(devops, options) {
        let validate = true;
        if (_.isBoolean(options.validate)) {
            validate = options.validate;
        }
        return devops.merge(devops.extractProjectName(options), validate).then(data => {
            if (devops.devopsSettings.outputFormat === 'table') {
                let mergeData = [
                    ["Action", "Result"],
                    ["changes detected", data.changesDetected ? "yes" : "no"],
                    ["rule tree stored in", data.fileName],
                    ["hash", data.hash],
                    ["validation performed", data.validationPerformed ? "yes" : "no"],
                    ["validation warnings", helpers.isArrayWithData(data.validationWarnings) ? "yes" : "no"],
                    ["validation errors", helpers.isArrayWithData(data.validationErrors) ? "yes" : "no"],
                    ["hostname warnings", helpers.isArrayWithData(data.hostnameWarnings) ? "yes" : "no"],
                    ["hostname errors", helpers.isArrayWithData(data.hostnameErrors) ? "yes" : "no"]
                ];
                consoleLogger.info(AsciiTable.table(mergeData, 200));
                reportActionErrors(data);
            } else {
                let mergeData = {
                    changesDetected: data.changesDetected ? "yes" : "no",
                    ruletreeStoredIn: data.fileName,
                    hash: data.hash,
                    validationPerformed: data.validationPerformed ? "yes" : "no",
                    validationWarnings: data.validationWarnings,
                    validationErrors: data.validationErrors,
                    hostnameWarnings: data.hostnameWarnings,
                    hostnameErrors: data.hostnameErrors
                };
                consoleLogger.info(helpers.jsonStringify(mergeData));
            }
        });
    };

    /**
     * save rule tree belonging to provided environment.
     * @type {Function}
     */
    const save = function(devops, options) {
        return devops.save(devops.extractProjectName(options)).then(data => {
            if (devops.devopsSettings.outputFormat === 'table') {
                let saveData = [
                    ["Action", "Result"],
                    ["stored rule tree", data.storedRules ? "yes" : "no"],
                    ["edge hostnames created", helpers.isArrayWithData(data.edgeHostnames.hostnamesCreated) ? "yes" : "no"],
                    ["stored hostnames", data.storedHostnames ? "yes" : "no"],
                    ["validation warnings", helpers.isArrayWithData(data.validationWarnings) ? "yes" : "no"],
                    ["validation errors", helpers.isArrayWithData(data.validationErrors) ? "yes" : "no"],
                    ["hostname warnings", helpers.isArrayWithData(data.hostnameWarnings) ? "yes" : "no"],
                    ["hostname errors", helpers.isArrayWithData(data.hostnameErrors) ? "yes" : "no"]
                ];
                consoleLogger.info(AsciiTable.table(saveData));
                reportActionErrors(data);
            } else {
                let saveData = {
                    storedRuletree: data.storedRules ? "yes" : "no",
                    edgeHostnamesCreated: helpers.isArrayWithData(data.edgeHostnames.hostnamesCreated) ? "yes" : "no",
                    storedHostnames: data.storedHostnames ? "yes" : "no",
                    validationWarnings: data.validationWarnings,
                    validationErrors: data.validationErrors,
                    hostnameWarnings: data.hostnameWarnings,
                    hostnameErrors: data.hostnameErrors
                };
                consoleLogger.info(helpers.jsonStringify(saveData));
            }
        });
    };

    /**
     * activate environment to staging or production network.
     * @type {Function}
     */
    const activate = async function(devops, options) {
        let network = commonCli.checkNetworkName(options);
        let propertyName = devops.extractProjectName(options);
        commonCli.handleNotes(options);
        let data = await devops.promote(propertyName, propertyName, network, options.emails, options.message, options.force);
        let pending = data.pending;
        if (devops.devopsSettings.outputFormat === 'table') {
            consoleLogger.info("Following activations are now pending:");
            data = [
                ["Property", "Network", "Activation Id"],
                [propertyName, pending.network, pending.activationId]
            ];
            consoleLogger.info(AsciiTable.table(data, 30));
        } else {
            data = {
                property: propertyName,
                network: pending.network,
                activationId: pending.activationId
            };
            consoleLogger.info(helpers.jsonStringify(data));
        }
        if (options.waitForActivate) {
            return checkActivations(devops, options);
        }
    };

    /**
     * create new version of the property with a given json file or given property
     * @type {Function}
     */
    const propertyUpdate = async function(devops, options) {
        let property = devops.extractProjectName(options);
        commonCli.handleNotes(options);
        let propertyInfo = commonCli.checkPropertyIdAndPropertyVersion(property, parseInt(options.propver, 10));
        propertyInfo.propertyVersion = commonCli.checkPropertyVersionIsZero(options.propver);
        let rules;
        if (options.file && options.srcprop) {
            throw new errors.ArgumentError(`Cannot pass in both the file and property source`,
                "multiple_sources_for_rules");
        } else if (!(options.file || options.srcprop)) {
            throw new errors.ArgumentError(`Must pass in a file or a property source`,
                "no_source_for_rules");
        }
        let utils = new Utils();
        if (options.file) {
            if (utils.fileExists(options.file)) {
                rules = utils.readJsonFile(options.file);
            } else {
                throw new errors.ArgumentError(`File '${options.file}' does not exist`,
                    "file_does_not_exist");

            }
        } else {
            let srcPropertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.srcprop, parseInt(options.srcver, 10));
            rules = await devops.getPropertyRules(srcPropertyInfo);
        }

        if (options.message) {
            rules.comments = options.message;
        }
        let suppress = options.suppress || false;
        propertyInfo.suppress = suppress;

        return devops.propertyUpdate(propertyInfo, rules, options.dryRun).then(data => {
            consoleLogger.info(helpers.jsonStringify(data));
        });
    };

    /**
     * update hostname of the property with a given hostname json file
     * @type {Function}
     */
    const hostnameUpdate = async function(devops, options) {
        let hostname;
        let patch = options.patch || false;
        if (!options.propver) {
            throw new errors.DependencyError("Property version needs to be provided", "missing_property_version");
        }
        let propertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.property, parseInt(options.propver, 10));
        propertyInfo.propertyVersion = commonCli.checkPropertyVersionIsZero(options.propver);
        if (!(options.file)) {
            throw new errors.ArgumentError(`Must pass in a file `,
                "no_file_for_hostnames");
        }
        let utils = new Utils();
        if (options.file) {
            if (utils.fileExists(options.file)) {
                hostname = utils.readJsonFile(options.file);
            } else {
                throw new errors.ArgumentError(`File '${options.file}' does not exist`,
                    "file_does_not_exist");
            }
        }
        if (patch) {
            return devops.patchPropertyHostnames(propertyInfo, hostname).then(data => {
                consoleLogger.info(helpers.jsonStringify(data));
            });
        } else {
            return devops.updatePropertyHostnames(propertyInfo, hostname).then(data => {
                consoleLogger.info(helpers.jsonStringify(data));
            });
        }
    };

    const activateVersion = async function(devops, options) {
        let property = devops.extractProjectName(options);
        commonCli.handleNotes(options);
        let propertyInfo = commonCli.checkPropertyIdAndPropertyVersion(property, parseInt(options.propver, 10));
        propertyInfo.propertyVersion = commonCli.checkPropertyVersionIsZero(propertyInfo.propertyVersion);
        let network = commonCli.checkNetworkName(options);
        let data = await devops.activateVersion(propertyInfo, network, options.emails, options.message);
        let propertyId = data["propertyId"];
        let activationId = data["activationId"];
        if (devops.devopsSettings.outputFormat === 'table') {
            consoleLogger.info("Following activations are now pending:");
            data = [
                [
                    data["propertyId"],
                    data["propertyVersion"],
                    data["network"],
                    data["activationId"]
                ]
            ];
            data.unshift(["PropertyId", "Version", "Network", "Activation Id"]);
            consoleLogger.info(AsciiTable.table(data, 30));
        } else {
            consoleLogger.info(helpers.jsonStringify(data));
        }

        if (options.waitForActivate) {
            return checkPropertyAcitvations(devops, propertyId, activationId, network);
        }
    };

    /**
     * deactivate property in staging or production network.
     * @type {Function}
     */
    const deactivate = async function(devops, options) {
        let runDatv = options.forceDeactivate;
        commonCli.handleNotes(options);
        let propertyName = devops.extractProjectName(options);
        let network = commonCli.checkNetworkName(options);
        if (!runDatv) {
            var questions = [{
                type: 'confirm',
                name: 'DeactivateConfirmed',
                message: `WARNING:  This will deactivate the property '${propertyName}' on network '${network}'.
Are you sure you want to deactivate the property '${propertyName}' on network '${network}'?`,
                default: false
            }];
            let answer = await inquirer.prompt(questions);
            runDatv = answer.DeactivateConfirmed;
        }
        if (runDatv) {
            let data = await devops.deactivate(propertyName, network, options.emails, options.message);
            let pending = data.pending;
            if (devops.devopsSettings.outputFormat === 'table') {
                consoleLogger.info("Following deactivations are now pending:");
                data = [
                    ["Property", "Network", "Activation Id"],
                    [propertyName, pending.network, pending.activationId]
                ];
                consoleLogger.info(AsciiTable.table(data, 30));
            } else {
                data = {
                    property: propertyName,
                    network: pending.network,
                    activationId: pending.activationId
                };
                consoleLogger.info(helpers.jsonStringify(data));
            }
            if (options.waitForActivate) {
                return checkActivations(devops, options);
            }
        }
    };

    const checkActivations = async function(devops, options) {
        return commonCli.checkActivations(devops, devops.extractProjectName(options), options);
    };

    const checkPropertyAcitvations = async function(devops, propertyId, activationId, network) {
        return commonCli.checkPropertyActivations(devops, propertyId, activationId, network);
    }

    const importProperty = async function(devops, options) {
        let propertyName = options.property;
        let propertyVersion = parseInt(options.propver, 10);
        let network;
        if (!propertyName || _.isBoolean(propertyName)) {
            throw new errors.DependencyError("Missing property option! Use akamai property-manager import -p <property name> ...",
                "missing_property_name");
        }

        if (options.network) {
            network = commonCli.checkNetworkName(options);
        }

        consoleLogger.info(`Importing and creating local files for ${propertyName} from Property Manager...`);
        let createPropertyInfo = {
            propertyName,
            propertyVersion,
            network
        };

        let variableMode = helpers.allowedModes[1];
        variableMode = options.variableMode || variableMode;
        createPropertyInfo.variableMode = variableMode;
        if (!checkVariableModeOptionsImportUpdateLocal(variableMode)) {
            throw new errors.ArgumentError(`Invalid variable mode option selected.  Valid modes are ${printAllowedModesUpdateOrImport()}`,
                "invalid_variable_mode");
        }

        let dryRun = options.dryRun;
        if (dryRun) {
            consoleLogger.info("update property info: ", helpers.jsonStringify(createPropertyInfo));
        } else {
            let project = await devops.importProperty(createPropertyInfo);
            consoleLogger.info(`Imported ${project.getName()}. The local version is: v${project.propertyVersion}`);

        }
    };

    const deleteProperty = async function(devops, options) {
        let runDel = options.forceDelete;
        commonCli.handleNotes(options);
        if (!runDel) {
            var questions = [{
                type: 'confirm',
                name: 'DeleteConfirmed',
                message: `WARNING:  This will permanently delete the property '${options.property}'.
Are you sure you want to DELETE the property '${options.property}'?`,
                default: false
            }];
            let answer = await inquirer.prompt(questions);
            runDel = answer.DeleteConfirmed;
        }
        if (runDel) {
            let propertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.property, null);
            return devops.deleteProperty(propertyInfo);
        }
        return;
    }

    const update = async function(devops, options) {
        let runPull = options.forceUpdate;
        let projectName = devops.extractProjectName(options);
        let propertyVersion = parseInt(options.propver, 10);
        let network;

        if (options.network) {
            network = commonCli.checkNetworkName(options);
        } 

        if (!runPull) {
            var questions = [{
                type: 'confirm',
                name: 'pullConfirmed',
                message: `WARNING: This will overwrite the local files for the property '${projectName}'.  Please ensure you have saved your work to your local repository!\nAre you sure you want to pull?`,
                default: false
            }];
            let answer = await inquirer.prompt(questions);
            runPull = answer.pullConfirmed;
        }

        if (runPull) {
            let variableMode = helpers.allowedModes[1];
            variableMode = options.variableMode || variableMode;
            if (!checkVariableModeOptionsImportUpdateLocal(variableMode)) {
                throw new errors.ArgumentError(`Invalid variable mode option selected.  Valid modes are ${printAllowedModesUpdateOrImport()}`,
                    "invalid_variable_mode");
            }

            let createPropertyInfo = {
                projectName,
                variableMode,
                propertyVersion,
                network
            };

            let dryRun = options.dryRun || false;


            if (dryRun) {
                consoleLogger.info("update property info: ", helpers.jsonStringify(createPropertyInfo));
            } else {
                consoleLogger.info(`Updating and overwriting local files for ${projectName} from PAPI...`);
                let project = await devops.updateProperty(createPropertyInfo);
                consoleLogger.info(`Updated ${projectName}. The local version is: v${project.propertyVersion}`);
            }
        }

    };

    let actionCalled;
    let argumentsUsed;
    const commander = new DevOpsCommand("akamai property-manager", consoleLogger);

    commander
        .version(version)
        .description("Property Manager CLI. Run these commands from the project directory that contains your local properties.")
        .option('-f, --format <format>', "Select output format for commands, either 'table', the default, or 'json'.")
        .option('-s, --section <section>', "The section of the .edgerc file containing the user profile, or client ID, to use " + "for the command. If not set, uses the 'default' settings in the .edgerc file.")
        .option('-v, --verbose', 'Show detailed log information for the command.')
        .option('--edgerc <edgerc>', "Optional. Enter the location of the .edgerc file used for credentials. " + "If option not set, uses the edgerc.config file in the project " + "directory.  Otherwise, uses the .edgerc file in your home directory.")
        .option('--workspace <workspace>', "Optional. Enter the directory containing all property and project " + "files. If option not set, uses the value of the AKAMAI_PROJECT_HOME " + "environment variable. Otherwise, uses the current working " + "directory as the workspace.")
        .option('-a, --accountSwitchKey <accountSwitchKey>', "Optional. If you have multiple accounts, enter " + "the account switch key you want to use when running commands. You can use " + "the Identity Management API to retrieve the key: " + "https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchkeys.");

    commander
        .command("new-property", "Create a new property using the attributes provided. Use the list commands to retrieve the required IDs.")
        .option('-c, --contractId <contractId>', "Enter the contract ID to use. Optional if using -e with a property ID or name.", helpers.prefixeableString('ctr_'))
        .option('-d, --productId <productId>', "Enter the product ID to use. Optional if using -e with a property ID or name.", helpers.prefixeableString('prd_'))
        .option('-e, --propertyId <propertyId/propertyName>', "Optional. Use an existing property as the blueprint for the new one. " + "Enter either a property ID or an exact property name. The CLI looks up the group ID, contract ID, and product ID " + "of the existing property and uses that data to create a new property.")
        .option('-g, --groupId <groupId>', "Enter the group ID for the property. Optional if using -e with a property ID or name.", helpers.prefixeableString('grp_'))
        .option('-n, --propver <propver>', "Add only if using a property as a template. Enter the version of the existing property to use as the blueprint. Uses latest version if omitted.", helpers.parsePropertyVersion)
        .requiredOption('-p, --property <propertyName>', 'Property name. Optional if a default property was previously set with the set-default command.')
        .option('--dry-run', 'Verify the result of your command syntax before running it. Displays the JSON generated by the command as currently written.')
        .option('--insecure', "Makes all new environment properties HTTP, not secure HTTPS.")
        .option('--retry', 'Use if the command failed during execution. Tries to continue where the command left off.')
        .option('--secure', "Makes the new property use secure HTTPS.")
        .option('--variable-mode <variableMode>', "If creating a property from an existing one, choose how your new property " + "pulls in variables. Allowed values are ${printAllowedModes()}.")
        .option('--nolocaldir', "Makes the new property without creating local folders.")
        .alias("np")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createProject
        });

    commander
        .command("set-default", "Set the default property and the default section name from the .edgerc file.")
        .option('-a, --accountSwitchKey <accountSwitchKey>', "Enter the account switch key you want to use when running commands. " + "The key entered is the default for all Property Manager commands until you change it. You can use " + "the Identity Management API to retrieve the key: " + "https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchkeys.")
        .option('-e, --emails <emails>', 'Enter the email addresses to send notifications to as a comma-separated list.')
        .option('-f, --format <format>', "Select output format for commands, either 'table', the default, or 'json'.")
        .option('-p, --property <propertyName>', 'Set the default property to use with commands.')
        .option('-s, --section <section>', 'The section of the .edgerc file that contains the user profile, or client ID, to use with commands.')
        .alias("sd")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setDefault
        });

    commander
        .command("show-defaults", "Displays the current default settings for this workspace.")
        .alias("sf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showDefaults
        });

    commander
        .command("merge", "Merge all property configuration files, or snippets, into a property rule tree file in JSON format. " + "You can find the file in the property's dist folder. By default, this command also calls the  " + "Property Manager API to validate the rule tree generated.")
        .option('-n, --no-validate', "Merge without validating command syntax.")
        .option('-p, --property <propertyName>', 'Property name. Optional if a default property was previously set with the set-default command.')
        .alias("m")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = merge
        });

    commander
        .command("search <name>", "Search for a property by name. Be sure to enter the exact name " + "as wildcards aren't supported.")
        .alias("s")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = search
        });

    commander
        .command("set-prefixes <useprefix>", "Boolean. Enter `true` to enable prefixes on responses based on the current " + "user credentials and setup. Enter `false` to disable them. If you have multiple client IDs, " + "run separately for each client ID you want to update. " + "**Caution.** Setting prefixes for this CLI impacts all other Property Manager API " + "clients that use this client ID.")
        .alias("sp")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setPrefixes
        });

    commander
        .command("set-ruleformat <ruleformat>", "Set the rule format to use by default based on the user's client ID." + "Enter `latest` for the most current rule format. For a list of earlier rule formats, see: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning " + "**Caution.** Setting the rule format with this CLI impacts all other Property Manager API " + "clients that use this client ID.")
        .alias("srf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setRuleFormat
        });

    commander
        .command("list-contracts", "List contracts available based on the current user credentials and setup.")
        .alias("lc")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listContracts
        });

    commander
        .command("list-products", "List products available based on the current user credentials and contract ID.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID.")
        .alias("lp")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listProducts
        });

    commander
        .command("list-groups", "List groups available based on the current user credentials (clientId).")
        .alias("lg")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listGroups
        });

    commander
        .command("list-cpcodes", "List CP codes available based on the current user credentials and setup.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID.")
        .requiredOption('-g, --groupId <groupId>', "Group ID.", helpers.parseGroupId)
        .alias("lcp")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listCpcodes
        });

    commander
        .command("list-properties", "List properties available based on the current user credentials and setup.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID.")
        .requiredOption('-g, --groupId <groupId>', "Group ID.", helpers.parseGroupId)
        .alias("lpr")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listProperties
        });

    commander
        .command("list-property-hostnames", "List hostnames assigned to this property.")
        .requiredOption('-p, --property <property>', "Property name or property ID.")
        .option(' --propver <propver>', "Optional. Select the property version to search on. Uses latest version by default.", helpers.parsePropertyVersion)
        .option('-n, --no-validate', "Use if you don't want to validate the command before running.")
        .option('--file <file>', "Optional. Enter a filename to save the command output to. The output is in JSON format.")
        .alias("lph")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listPropertyHostnames
        });

    commander
        .command("show-ruletree", "Shows the rule tree for the selected environment.")
        .option('-p, --property <propertyName>', 'Property name. Optional if a default property was set using the set-default command.')
        .option(' --propver <propver>', "Optional. Enter a property version. Uses latest version if not specified.")
        .option('--file <file>', "Optional. Enter a filename to save the command output to. The output is in JSON format.")
        .alias("sr")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save", "Saves the rule tree and hostnames for the selected property. " + "This command calls the Property Manager API to validate the rule tree, and creates edge hostnames if needed.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was set using the set-default command.')
        .alias("sv")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = save
        });

    commander
        .command("list-edgehostnames", "List edge hostnames available based on the contract ID and group ID provided. " + "Use the list commands to retrieve the required IDs. May return a long list of hostnames.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID.")
        .requiredOption('-g, --groupId <groupId>', "Group ID.", helpers.parseGroupId)
        .alias("leh")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listEdgeHostnames
        });

    commander
        .command("list-property-variables", "List the property's variables.")
        .requiredOption('-p, --property <property>', "Property name or property ID.")
        .option(' --propver <propver>', "Optional. The property version to list variables for. Uses latest version by default.", helpers.parsePropertyVersion)
        .option('--file <file>', "Optional. Enter a filename to save the command output to. The output is in JSON format.")
        .alias("lpv")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listPropertyVariables
        });

    commander
        .command("list-property-rule-format", "List the current rule format for the property.")
        .requiredOption('-p, --property <property>', "Property name or property ID.")
        .option(' --propver <propver>', "Optional. Prints the rule format of the property version. Uses latest version by default.")
        .option('--file <file>', "Optional. Enter a filename to save the command output to. The output is in JSON format.")
        .alias("lprf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listPropertyRuleformat
        });

    commander
        .command("list-rule-formats", "Display the list of available rule formats.")
        .alias("lrf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listRuleFormats;
        });


    commander
        .command("activate",
            "Activate the latest version of a property. By default, this command also executes the merge and save commands.")
        .option('-e, --emails <emails>', "Optional. A comma-separated list of email addresses. If not used, sends updates to any default emails set using the set-default command.")
        .option('-m, --message <message>', "Enter a message describing changes made to the property.")
        .option('--note <message>', "Alias of --message. Enter a message describing changes made to the property.")
        .requiredOption('-n, --network <network>', "Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was set using the set-default command.')
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until activation is complete. May take several minutes.")
        .alias("atv")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = activate
        });

    commander
        .command("deactivate",
            "Deactivates a property. Checks if the property is active and then deactivates it.")
        .option('-e, --emails <emails>', "Optional. A comma-separated list of email addresses. If not used, sends updates to any default emails set using the set-default command.")
        .option('-m, --message <message>', "Enter a message describing the reason for deactivating.")
        .option('--note <message>', "Alias of --message. Enter a message describing the reason for deactivating.")
        .requiredOption('-n, --network <network>', "Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was set using the set-default command.')
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until deactivation is complete. May take several minutes.")
        .option('--force-deactivate', 'WARNING: This option bypasses the confirmation prompt and automatically deactivates your property on the network.')
        .alias("datv")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = deactivate
        });

    commander
        .command("property-update",
            "Create a new version of a property. Copy the rules from a file stream, using –-file, or from a different property, using --srcprop.")
        .option('--dry-run', "Run validations without saving rule tree")
        .option('--file <file>', "Specify the JSON file containing the rules. You can find the JSON format to use here: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#putpropertyversionrules.")
        .option('--message <message>', "Add comments for the property version.")
        .option('--note <message>', "Alias of --message. Add comments for the property version.")
        .option('-p, --property <property>', 'The name or ID of the property you are updating. Optional if the default property was previously set using set-default.')
        .option('--srcprop <srcprop>', "The name or ID of the source property containing the rules you want to copy")
        .option('--srcver <srcver>', "Optional. The version of the property containing the rules you want to copy. " +
            "To use this option, you must specify the source property using --srcprop. The rules from the latest version of the property will be used if you do not specify –-srcver.")
        .option('--propver <propver>', "Optional. Select the property version to update to.", helpers.parsePropertyVersion)
        .option('--suppress', "Optional. Use to suppress the JSON output for the command. If used, any errors returned will still display.")
        .on('--help', () => {
            consoleLogger.debug('Copyright (C) Akamai Technologies, Inc\nVisit http://github.com/akamai/cli-property-manager for detailed documentation');
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = propertyUpdate
        });

    commander
        .command("hostname-update", "Updates hostnames assigned to this property.")
        .option('-p, --property <property>', "Property name or property ID.")
        .requiredOption('--propver <propver>', "Select the property version to update to.", helpers.parsePropertyVersion)
        .requiredOption('--file <file>', "Specify the JSON file containing the hostnames. You can find the JSON format to use here: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#putpropertyversionhostnames.")
        .option('--patch', "Optional. Runs a PATCH request to update hostnames assigned to this property. You can find information on the command here:: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#patchpropertyversionhostnames.")
        .alias("hu")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = hostnameUpdate
        });

    commander
        .command("activate-version",
            "Activate a specific version of a property. Activates latest if no version specified.")
        .option('-e, --emails <emails>', "Optional. A comma-separated list of email addresses. If not used, sends updates to any default emails set using the set-default command.")
        .option('-m, --message <message>', "Enter a message describing the reason for activating.")
        .option('--note <message>', "Alias of --message. Activation message passed to activation backend")
        .requiredOption('-n, --network <network>', "Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")
        .option('-p, --property <property>', 'Property name or property ID. Optional if default property was previously set using set-default.')
        .option(' --propver <propver>', "Optional. The property version to activate. Uses latest version if not specified.", helpers.parsePropertyVersion)
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until activation is complete. May take several minutes.")
        .on('--help', () => {
            consoleLogger.debug('Copyright (C) Akamai Technologies, Inc\nVisit http://github.com/akamai/cli-property-manager for detailed documentation');
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = activateVersion
        });

    commander
        .command("check-activation-status", "Check the activation status of a property.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was previously set using set-default.')
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until activation is complete. May take several minutes.")
        .alias("cs")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = checkActivations
        });

    commander
        .command("update-local", "Update local property with the latest version from the Property Manager API.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was set using the set-default command.')
        .option('--propver <propver>', "Optional. The property version to activate. Uses latest version if not specified.", helpers.parsePropertyVersion)
        .option('-n, --network <network>', "Optional. Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")
        .option('--dry-run', 'Verify the result of your command syntax before running it. Displays the JSON generated by the command as currently written.')
        .option('--force-update', 'WARNING: This option bypasses the confirmation prompt and automatically overwrites your local files.')
        .option('--variable-mode <variableMode>', `Choose how this command pulls in variables. Allowed values are ${printAllowedModesUpdateOrImport()}.  Default functionality is no-var.`)
        .alias("ul")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = update
        });

    commander
        .command("import", "Import an existing property from Property Manager.")
        .option('-p, --property <propertyName>', 'Property name. Optional if default property was set using the set-default command.')
        .option('--propver <propver>', "Optional. The property version to activate. Uses latest version if not specified.", helpers.parsePropertyVersion)
        .option('-n, --network <network>', "Optional. Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")        
        .option('--dry-run', 'Verify the result of your command syntax before running it. Displays the JSON generated by the command as currently written.')
        .option('--variable-mode <variableMode>', `Choose how to pull in variables.  Allowed values are ${printAllowedModesUpdateOrImport()}.  By default, variables aren't imported (no-var).`)
        .alias("i")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = importProperty
        });

    commander
        .command("delete", "Permanently deletes a property. You have to deactivate the property on both networks first.")
        .requiredOption('-p, --property <property>', 'Property name or property ID.')
        .requiredOption('-m, --message <message>', "Enter a message describing the reason for the deletion.")
        .requiredOption('--note <message>', "Alias of --message. Enter a message describing the reason for the deletion.")
        .option('--force-delete', 'WARNING: This option bypasses the confirmation prompt and automatically deletes your property.')
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = deleteProperty
        });

    commander
        .command("create-cpcode", "Create a new CP code.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID.")
        .requiredOption('-g, --groupId <groupId>', "Group ID.", helpers.parseGroupId)
        .requiredOption('-d, --productId <productId>', "Product ID.", helpers.prefixeableString('prd_'))
        .requiredOption('-n, --cpcodeName <cpcodeName>', "CP code name.")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createCpcode
        });


    commander
        .command('help', "help command", {})
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(options) {
            if (_.isObject(options.parent.args[0])) {
                commander.outputHelp();
            } else {
                let name = options.parent.args[0];
                if (commander.listeners('command:' + name).length > 0) {
                    commander.emit('command:' + name, [], ['--help']);
                } else {
                    consoleLogger.error(`  Unknown command: '${name}'`);
                    commander.outputHelp();
                }
            }
            throw new errors.ExitError("need to quit");
        });

    commander
        .command('*', "default command", {
            noHelp: true
        })
        .action(function(options) {
            consoleLogger.error(`  Unknown command: '${options.parent.args[0]}'`);
            commander.outputHelp();
            throw new errors.ExitError("need to quit");
        });

    commander.on('--help', () => {
        consoleLogger.debug(footer);
    });

    try {
        commander.sortCommands();
        commander.parse(cmdArgs);
        if (argumentsUsed !== undefined) {
            //options is the last parameter in the action handler param list
            let options = argumentsUsed[argumentsUsed.length - 1];
            verbose = useVerboseLogging(options);
            if (_.isFunction(actionCalled)) {
                // this validates unparsed arguments
                let devops = createDevops(options);
                // validate successfully parsed arguements
                validateOptions(argumentsUsed[0]);
                if (_.isArray(argumentsUsed[argumentsUsed.length - 1])) {
                    let extraoptions = argumentsUsed[argumentsUsed.length - 1];
                    throw new errors.ArgumentError(`Didn't expect these parameters: '${extraoptions.join(', ')}'`,
                        "cli_unexpected_parameters", extraoptions);
                }
                let response = actionCalled(devops, ...argumentsUsed);
                //assuming this is returning a promise. TODO: is there a better test?
                if (response) {
                    response.catch(function(error) {
                        reportError(error, verbose)
                    });
                }
            }
        } else {
            throw new errors.ArgumentError(`No command called`,
                "cli_unexpected_parameters");
        }
    } catch (error) {
        if (error instanceof errors.ExitError) {
            return;
        }
        reportError(error, verbose);
        if (error instanceof errors.ArgumentError) {
            let cmdName = commander.rawArgs[2];
            if (commander.listeners('command:' + cmdName).length > 0) {
                try {
                    commander.emit('command:' + cmdName, [], ['--help']);
                } catch (error) {
                    if (error instanceof errors.ExitError) {
                        return;
                    }
                }
            }
        }
    }
};