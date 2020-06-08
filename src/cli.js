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
 * akamai pipeline command line tool calling into SDK classes and methods.
 */


//used for table formatted output
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const version = require("../package.json").version;

const DevOpsCommand = require('./command');
const errors = require('./errors');
const logging = require('./logging');
const helpers = require('./helpers');
const commonCliClass = require('./common/common_cli');

const cliLogger = new logging.ConsoleLogger();

const reportLabel = {
    table: "Environment",
    json: "environment",
    activationLabel: "promotion"
};

const footer = "  © 2017-2020 Akamai Technologies, Inc. All rights reserved\n" +
    "  Visit http://github.com/akamai/cli-property-manager for documentation\n";

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
                    consoleLogger.error(`Akamai Pipeline Error: '${error.messageId}' occurred: \n`, error.stack);
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
                    consoleLogger.error(`Akamai Pipeline Error: '${error.messageId}' occurred: \n`, error.message);
                }
            } else {
                consoleLogger.error("Unexpected error occurred: ", error, error.stack);
            }
            process.exitCode = 1;
        };
    }

    const commonCli = new commonCliClass(cmdArgs, procEnv, overrideDevopsFactoryFunction, overrideErrorReporter, consoleLogger, reportLabel, reportError, verbose);

    const useVerboseLogging = function(options) {
        if (options.parent) {
            let parentOptions = options.parent;
            return _.isBoolean(parentOptions.verbose) ? parentOptions.verbose : false;
        } else {
            return false;
        }
    };

    //functions defined in CommonCLI Class
    const setPrefixes = commonCli.setPrefixes.bind(commonCli);
    const setRuleFormat = commonCli.setRuleFormat.bind(commonCli);
    const listContracts = commonCli.listContracts.bind(commonCli);
    const listProducts = commonCli.listProducts.bind(commonCli);
    const listGroups = commonCli.listGroups.bind(commonCli);
    const listCpcodes = commonCli.listCpcodes.bind(commonCli);
    const listPropertyHostnames = commonCli.listPropertyHostnames.bind(commonCli);
    const listProperties = commonCli.listProperties.bind(commonCli);
    const listEdgeHostnames = commonCli.listEdgeHostnames.bind(commonCli);
    const listPropertyVariables = commonCli.listPropertyVariables.bind(commonCli);
    const listPropertyRuleformat = commonCli.listPropertyRuleformat.bind(commonCli);
    const listRuleFormats = commonCli.listRuleFormats.bind(commonCli);
    const showDefaults = commonCli.showDefaults.bind(commonCli);
    const search = commonCli.search.bind(commonCli);


    const printAllowedModes = commonCli.printAllowedModes;

    const checkVariableModeOptions = commonCli.checkVariableModeOptions;

    /**
     * Constructs a new DevOps instances based on command line options.
     * This allows for customizations of dependencies like the record to file, replay from file open client.
     * @param options
     * @returns {DevOps}
     */
    const createDevops = function(options) {
        validateOptions(options);
        const logging = require("./logging");
        let clientType = "regular";
        let outputFormat;
        let section;
        let devopsHome;
        let edgerc;
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
        }
        logging.log4jsLogging(useVerboseLogging(options), 'devops');

        let devopsFactoryFunction;
        if (_.isFunction(overrideDevopsFactoryFunction)) {
            devopsFactoryFunction = overrideDevopsFactoryFunction;
        } else {
            devopsFactoryFunction = require('./factory');
        }

        return devopsFactoryFunction({
            procEnv,
            clientType,
            devopsHome,
            edgerc,
            section,
            version,
            outputFormat
        });
    };

    /**
     * sets the default pipeline
     * @param options
     */
    const setDefault = function(devops, options) {
        let pipelineName = options.pipeline;
        let section = options.section || options.parent.section;
        let emails = options.emails;
        let format = options.format || options.parent.format;
        let accountSwitchKey = options.accountSwitchKey;
        if (!pipelineName && !section && !emails && !format && !accountSwitchKey) {
            throw new errors.DependencyError("Need at least one option! Use akamai pipeline -p <pipeline name>" +
                ", akamai pipeline -e <emails>, akamai pipeline -s <section>, -a <accountSwitchKey> or akamai pipeline -f <format>.",
                "missing_option");
        }
        if (section) {
            devops.setDefaultSection(section);
        }
        if (pipelineName) {
            devops.setDefaultProject(pipelineName);
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

    /**
     * Creates a new devops pipeline (devops pipeline)
     * @type {Function}
     */
    const createPipeline = function(devops, environments, options) {
        let projectName = options.pipeline;
        if (!projectName || _.isBoolean(projectName)) {
            throw new errors.DependencyError("Pipeline option required. Use akamai pipeline -p <pipeline name> ...",
                "missing_pipeline_name");
        }
        let propertyId, propertyName, propertyVersion;

        let checkedPropertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.propertyId, options.propver);
        propertyId = checkedPropertyInfo.propertyId;
        propertyName = checkedPropertyInfo.propertyName;
        propertyVersion = checkedPropertyInfo.propertyVersion;

        if (_.isBoolean(options.associatePropertyName) && options.associatePropertyName) {
            if (!(propertyId || propertyName)) {
                throw new errors.ArgumentError(`Associate Property Name is only available with an existing property.`,
                    "associate_property_needs_existing_property");
            }
        }
        let groupIds = options.groupIds;
        if (!(propertyId || propertyName) && groupIds.length === 0) {
            throw new errors.DependencyError("At least one groupId is required in number format.", "missing_group_ids");
        }
        let contractId = options.contractId;
        if (!(propertyId || propertyName || contractId)) {
            throw new errors.DependencyError("contractId is required.", "missing_contract_id");
        }
        let productId = options.productId;
        if (!(propertyId || propertyName || productId)) {
            throw new errors.DependencyError("productId is required.", "missing_product_id");
        }
        let isInRetryMode = options.retry || false;
        let dryRun = options.dryRun || false;

        let environmentGroupIds = associateEnvironmentsGroupIds(environments, groupIds);

        let variableMode = options.variableMode || helpers.allowedModes[0];
        if (options.variableMode && !(propertyId || propertyName)) {
            throw new errors.ArgumentError(`The variable mode option is only available with existing properties.`,
                "variable_mode_needs_existing_property");
        } else if (!checkVariableModeOptions(variableMode)) {
            throw new errors.ArgumentError(`Invalid variable mode option selected. Valid modes are ${printAllowedModes()}`,
                "invalid_variable_mode");
        }
        let ruleFormat;
        let createPipelineInfo = {
            projectName,
            productId,
            contractId,
            propertyId,
            groupIds,
            propertyName,
            propertyVersion,
            environments,
            environmentGroupIds,
            isInRetryMode,
            variableMode,
            ruleFormat
        };
        if (_.isBoolean(options.secure)) {
            createPipelineInfo.secureOption = options.secure;
        }
        if (_.isBoolean(options.insecure)) {
            createPipelineInfo.secureOption = !options.insecure;
        }
        if (_.isBoolean(options.customPropertyName)) {
            createPipelineInfo.customPropertyName = options.customPropertyName;
        }
        if (_.isBoolean(options.associatePropertyName) && options.associatePropertyName) {
            createPipelineInfo.associatePropertyName = options.associatePropertyName;
            createPipelineInfo.customPropertyName = true;
        }
        if (dryRun) {
            consoleLogger.info("create pipeline info: ", helpers.jsonStringify(createPipelineInfo));
        } else {
            return devops.createPipeline(createPipelineInfo);
        }
    };

    const associateEnvironmentsGroupIds = function(environments, groupIds) {
        let environmentGroupIds = {};
        if (_.isArray(environments) && _.isArray(groupIds)) {
            if (groupIds.length > 1) {
                if (environments.length !== groupIds.length) {
                    throw new errors.ArgumentError(`Number of environments: ${environments.length} and number of groupIds:` +
                        `${groupIds.length} don't match`, "environments_group_ids_mismatch", environments.length, groupIds.length);
                } else {
                    environmentGroupIds = _.object(environments, groupIds);
                }
            } else {
                let groupId;
                if (groupIds.length === 1) {
                    groupId = groupIds[0];
                }
                _.each(environments, envName => {
                    environmentGroupIds[envName] = groupId;
                });
            }
        }
        return environmentGroupIds;
    }

    /**
     * list status for the pipeline and environment details
     * @type {Function}
     */
    const listStatus = function(devops, options) {
        return devops.getProject(devops.extractProjectName(options)).getStatus().then(envData => {
            if (devops.devopsSettings.outputFormat === 'table') {
                let envTable = [
                    ["Environment Name"],
                    ["Property Name"],
                    ["Latest Version"],
                    ["Production Version"],
                    ["Staging Version"],
                    ["Rule Format"]
                ];

                _.each(envData, function(ctr) {
                    envTable[0].push(ctr.envName);
                    envTable[1].push(ctr.propertyName);
                    envTable[2].push(ctr.latestVersion);
                    envTable[3].push(_.isNumber(ctr.productionVersion) ? ctr.productionVersion : "N/A");
                    envTable[4].push(_.isNumber(ctr.stagingVersion) ? ctr.stagingVersion : "N/A");
                    envTable[5].push(ctr.ruleFormat);
                });
                consoleLogger.info(AsciiTable.table(envTable, 80));
            } else {
                _.each(envData, function(ctr) {
                    ctr.productionVersion = _.isNumber(ctr.productionVersion) ? ctr.productionVersion : "N/A";
                    ctr.stagingVersion = _.isNumber(ctr.stagingVersion) ? ctr.stagingVersion : "N/A";
                });
                consoleLogger.info(helpers.jsonStringify(envData));
            }
        });
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
    const merge = function(devops, env, options) {
        let validate = true;
        if (_.isBoolean(options.validate)) {
            validate = options.validate;
        }
        return devops.merge(devops.extractProjectName(options), env, validate).then(data => {
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
    const save = function(devops, envName, options) {
        return devops.save(devops.extractProjectName(options), envName).then(data => {
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
     * @param environmentName
     * @param options
     */
    const showRuletree = function(devops, environmentName, options) {
        return devops.getProject(devops.extractProjectName(options))
            .getRuleTree(environmentName)
            .then(data => {
                consoleLogger.info(helpers.jsonStringify(data));
            })
    }

    /**
     * promote environment to staging or production network.
     * @type {Function}
     */
    const promote = async function(devops, envName, options) {
        let network = commonCli.checkNetworkName(options);
        let projectName = devops.extractProjectName(options);
        let data = await devops.promote(projectName, envName, network, options.emails, options.message, options.force);
        let pending = data.pending;
        if (devops.devopsSettings.outputFormat === 'table') {
            consoleLogger.info("Following activations are now pending:");
            data = [
                ["Environment", "Network", "Activation Id"],
                [envName, pending.network, pending.activationId]
            ];
            consoleLogger.info(AsciiTable.table(data, 30));
        } else {
            data = {
                environment: envName,
                network: pending.network,
                activationId: pending.activationId
            };
            consoleLogger.info(helpers.jsonStringify(data));
        }
        if (options.waitForActivate) {
            return checkPromotions(devops, envName, options);
        }
    };

    const checkPromotions = async function(devops, envName, options) {
        return commonCli.checkActivations(devops, envName, options);
    };

    const validateOptions = function(options) {
        if (options.pipeline && (typeof options.pipeline === 'string' || options.pipeline instanceof String) && options.pipeline.startsWith('-')) {
            throw new errors.DependencyError("Unexpected/Missing pipeline name", "cli_unexpected_value");
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

    const changeRuleFormat = async function(devops, environments, options) {
        let projectName = devops.extractProjectName(options);
        let result = await devops.changeRuleFormat(projectName, environments, options.ruleFormat);
        for (let data of result) {
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
                consoleLogger.info(AsciiTable.table(mergeData));
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
        }
    };

    let actionCalled;
    let argumentsUsed;

    const commander = new DevOpsCommand("akamai pipeline", consoleLogger);

    commander
        .version(version)
        .description("Akamai Pipeline. " +
            "Run these commands from the directory that contains all of your pipelines.")
        .option('-f, --format <format>', "Select output format for commands, either 'table', the default, or 'json'.")
        .option('-s, --section <section>', "The section of the .edgerc file that contains the user profile, or client ID, to " + "use for the command. If not set, uses the `default` settings in the .edgerc file.")
        .option('-v, --verbose', 'Show detailed log information for the command.')
        .option('--edgerc <edgerc>', "Optional. Enter the location of the edgerc.config file used for credentials. If not set, uses " + "the .edgerc file in the project directory if present. Otherwise, uses " + "the .edgerc file in your home directory.")
        .option('--workspace <workspace>', "Optional. Enter the directory containing all property and project files. If not set, " + "uses the value of the AKAMAI_PROJECT_HOME environment variable if present." + "Otherwise, uses the current working directory as the workspace.");

    commander
        .command("new-pipeline <environments...>", "Create a new pipeline with provided attributes. Separate each environment name with a space. " +
            "This command creates one property for each environment.")
        .option('-c, --contractId <contractId>', "Enter the contract ID to use. If used with the -e option, the CLI takes the contract " + "value from the template property.", helpers.prefixeableString('ctr_'))
        .option('-d, --productId <productId>', "Enter the product ID to use. Optional if using -e with a property ID or name.", helpers.prefixeableString('prd_'))
        .option('-e, --propertyId <propertyId/propertyName>', "Optional. Use an existing property as the blueprint for new pipeline properties. " + "Enter a property ID or an exact property name. The CLI looks up the group ID, contract ID, and " + "product ID of the existing property and uses that information to create properties for the pipeline.")
        .option('-g, --groupIds <groupIds>', "Enter the group IDs for the environments. Optional if using -e with a property ID " + "or name. Provide one group ID if all environments are in the same group. If each environment needs to be in " + "its own group, add a separate -g option for each environment and in the order the environments are listed in.", helpers.repeatable(helpers.parseGroupId), [])
        .option('-n, --propver <propver>', "Add only if using a property as a template. Enter the version of the existing property to use as the blueprint. The CLI uses latest version if omitted.", helpers.parsePropertyVersion)
        .requiredOption('-p, --pipeline <pipelineName>', 'Pipeline name')
        .option('--associate-property-name', "Use an existing property with the new pipeline. When using, make sure your entry matches the property name exactly.")
        .option('--custom-property-name', "Give the existing property a custom name used only with the pipeline.")
        .option('--dry-run', 'Add only if using a property as a template. Displays the JSON generated by the current command as currently written.')
        .option('--insecure', "Makes all new environment properties HTTP, not secure HTTPS.")
        .option('--retry', 'Use if the command failed during execution. Tries to continue where the command left off.')
        .option('--secure', "Makes new pipeline and all environment properties use secure HTTPS.")
        .option('--variable-mode <variableMode>', "If creating a pipeline from an existing property, choose how your new pipeline will " + "pull in variables from that property.  Allowed values are ${printAllowedModes()}.")
        .alias("np")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createPipeline
        });

    commander
        .command("set-default", "Set the default pipeline and the default section of the .edgerc file to use.")
        .option('-a, --accountSwitchKey <accountSwitchKey>', "Enter the account ID you want to use when running commands. " + "The account persists for all pipeline commands until you change it.")
        .option('-e, --emails <emails>', 'Enter the email addresses to send notification emails to as a comma-separated list')
        .option('-f, --format <format>', "Select output format for commands, either 'table', the default, or 'json'.")
        .option('-p, --pipeline <pipelineName>', 'Set the default pipeline to use with commands.')
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
        .command("merge <environment>", "Merge the pipeline property's template JSON and variable values into a rule tree file. " + "The system stores the resulting JSON file in the pipeline's /dist folder.")
        .option('-n, --no-validate', "Merge the environment without validating.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if a default pipeline was set using set-default.')
        .alias("m")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = merge
        });

    commander
        .command("search <name>", "Search for properties by name.")
        .alias("s")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = search
        });

    commander
        .command("set-prefixes <useprefix>", "Boolean. Enter `true` to enable prefixes with the current user credentials and setup. " + "Enter `false` to disable them.")
        .alias("sp")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setPrefixes
        });

    commander
        .command("set-ruleformat <ruleformat>", "Set the rule format to use with the current user credentials and setup. " + "Enter `latest` for the most current rule format. For a list of earlier rule formats, see: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning")
        .alias("srf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setRuleFormat
        });

    commander
        .command("list-contracts", "List contracts available based on current user credentials and setup.")
        .alias("lc")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listContracts
        });

    commander
        .command("list-products", "List products available based on contract ID, client ID, and the current user credentials and setup.")
        .requiredOption('-c, --contractId <contractId>', "Contract ID. A contract has a fixed term of service during " +
            "which specified Akamai products and modules are active.")
        .alias("lp")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listProducts
        });

    commander
        .command("list-groups", "List groups available based on the current user credentials and setup.")
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
        .command("list-property-hostnames", "List hostnames assigned to this property.")
        .requiredOption('-p, --property <property>', "Property name or ID.")
        .option(' --propver <propver>', "Optional. The property version to list. Uses latest version if not specified.")
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
        .command("list-property-variables", "List the property's variables.")
        .requiredOption('-p, --property <property>', "Property name or ID.")
        .option(' --propver <propver>', "Optional. The property version to list variables for. Uses latest version by default.")
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
        .requiredOption('-p, --property <property>', "Property name or ID.")
        .option(' --propver <propver>', "Optional. The property version to list rule formats for. Uses latest version by default.")
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
        .command("show-ruletree <environment>", "For the selected environment, shows local property's rule tree. Run this " + "to store the rule tree in a local file: show-ruletree -p <pipelineName> <environment> >> <filename.json>")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if default pipeline was set using the set-default command.')
        .alias("sr")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save <environment>", "Save rule tree and hostnames for the environment you select. " +
            "Also creates edge hostnames if needed.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if a default pipeline was set using the set-default command.')
        .alias("sv")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = save
        });

    commander
        .command("list-edgehostnames", "List edge hostnames available based on current user credentials and setup. " + "May return a long list of hostnames.")
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
        .command("list-status", "Show status of the pipeline.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name.')
        .alias("lstat")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listStatus
        });

    commander
        .command("promote <targetEnvironment>",
            "Promote, or activate, an environment. By default, this command also executes the merge and save commands.")
        .option('-e, --emails <emails>', "Comma-separated list of email addresses. Optional if default emails were set using the set-default command.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if default pipeline was set using the set-default command.')
        .option('-m, --message <message>', "Enter a  message describing changes made to the environment.")
        .requiredOption('-n, --network <network>', "Network, either 'production' or 'staging'. You can shorten 'production' to " + "'prod' or 'p' and 'staging' to 'stage' or 's'.")
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until promotion is complete. May take several minutes.")
        .option('--force', "Deprecated. Out-of-sequence activations are now allowed by default.")
        .alias("pm")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = promote
        });

    commander
        .command("check-promotion-status <environment>", "For the selected environment, check the activation status.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if default pipeline was set using the set-default command.')
        .option('-w, --wait-for-activate', "Prevents you from entering more commands until promotion is complete. May take several minutes.")
        .alias("cs")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = checkPromotions
        });

    commander
        .command("change-ruleformat [environments...]", "Change the property rule format used by a pipeline or an environment. " + "Enter a space-separated list of environments after the pipeline name to update a subset of environments.")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name. Optional if default pipeline was previously set using the set-default command. ')
        .requiredOption('-r, --ruleFormat <ruleFormat>', "Required. The rule format to apply to the selected environments. " + "Enter `latest` for the most current rule format. For a list of earlier rule formats, see: " + "https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning.")
        .alias("crf")
        .on('--help', () => {
            consoleLogger.debug(footer);
        })
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = changeRuleFormat
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