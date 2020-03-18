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
    const listEdgeHostnames = commonCli.listEdgeHostnames.bind(commonCli);
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
        if (options.parent) {
            let parentOptions = options.parent;
            if (parentOptions.format) {
                outputFormat = parentOptions.format;
            }
            section = parentOptions.section;
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
                throw new errors.ArgumentError("Only 'json' or 'table' are allowed as format string", "illegal_format", format);
            }
            if (format.match(formatRe)) {
                devops.setDefaultFormat(format.toLowerCase());
            } else {
                throw new errors.ArgumentError("Only 'json' or 'table' are allowed as format string", "illegal_format", format);
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
            throw new errors.DependencyError("Missing pipeline option! Use akamai pipeline -p <pipeline name> ...",
                "missing_pipeline_name");
        }
        let propertyId, propertyName, propertyVersion;

        let checkedPropertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.propertyId, options.version);
        propertyId = checkedPropertyInfo.propertyId;
        propertyName = checkedPropertyInfo.propertyName;
        propertyVersion = checkedPropertyInfo.propertyVersion;

        if (_.isBoolean(options.associatePropertyName) && options.associatePropertyName) {
            if (!(propertyId || propertyName)) {
                throw new errors.ArgumentError(`Associate Property Name usable only with an existing property.`,
                    "associate_property_needs_existing_property");
            }
        }
        let groupIds = options.groupIds;
        if (!(propertyId || propertyName) && groupIds.length === 0) {
            throw new errors.DependencyError("At least one groupId needs to be provided as a number", "missing_group_ids");
        }
        let contractId = options.contractId;
        if (!(propertyId || propertyName || contractId)) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }
        let productId = options.productId;
        if (!(propertyId || propertyName || productId)) {
            throw new errors.DependencyError("productId needs to be provided", "missing_product_id");
        }
        let isInRetryMode = options.retry || false;
        let dryRun = options.dryRun || false;

        let environmentGroupIds = associateEnvironmentsGroupIds(environments, groupIds);

        let variableMode = options.variableMode || helpers.allowedModes[0];
        if (options.variableMode && !(propertyId || propertyName)) {
            throw new errors.ArgumentError(`Variable Mode usable only with an existing property.`,
                "variable_mode_needs_existing_property");
        } else if (!checkVariableModeOptions(variableMode)) {
            throw new errors.ArgumentError(`Invalid variable mode option selected.  Valid modes are ${printAllowedModes()}`,
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

    let actionCalled;
    let argumentsUsed;

    const commander = new DevOpsCommand("akamai pl", consoleLogger);

    commander
        .version(version)
        .description("Akamai Pipeline. " +
            "The command assumes that your current working directory is the pipeline space under which all pipelines reside")
        .option('-v, --verbose', 'Verbose output, show logging on stdout')
        .option('-s, --section <section>', 'Section name representing Client ID in .edgerc file, defaults to "credentials"')
        .option('-f, --format <format>', "Select output format, allowed values are 'json' or 'table'")

    commander
        .command("new-pipeline <environments...>", "Create a new pipeline with provided attributes. " +
            "This will also create one property for each environment.")
        .option('--retry', 'Assuming command failed last time during execution. Try to continue where it left off.')
        .option('--dry-run', 'Just parse the parameters and print out the json generated that would normally call the create pipeline function.')
        .option('-p, --pipeline <pipelineName>', 'Pipeline name')
        .option('-g, --groupIds <groupIds>', "Group IDs, optional if -e propertyId/Name is used. " +
            "Provide one groupId if all environments are expected in that same group. If each environment needs to be in " +
            "its own group, provide the same number of groupIds as environments by using multiple -g options.", helpers.repeatable(helpers.parseGroupId), [])
        .option('-c, --contractId <contractId>', "Contract ID, optional if -e propertyId/Name is used", helpers.prefixeableString('ctr_'))
        .option('-d, --productId <productId>', "Product ID, optional if -e propertyId/Name is used", helpers.prefixeableString('prd_'))
        .option('-e, --propertyId <propertyId/propertyName>', "Use existing property as blue print for pipeline templates. " +
            "Either pass property ID or exact property name. Akamai pipeline will lookup account information like group id, " +
            "contract id and product id of the existing property and use the information for creating pipeline properties")
        .option('-n, --version <version>', "Can be used only if option '-e' is being used. Specify version of existing property being used as blue print, if omitted, use latest", helpers.parsePropertyVersion)
        .option('--secure', "Make new pipeline secure, all environment properties are going to be secure")
        .option('--insecure', "Make all environment properties not secure")
        .option('--custom-property-name', "To use custom property names")
        .option('--associate-property-name', "To use existing properties in the pipeline")
        .option('--variable-mode <variableMode>', `Choose how your new pipeline will pull in variable.  Allowed values are ${printAllowedModes()}.  Only works when creating a pipeline from an existing property`)
        .alias("np")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createPipeline
        });

    commander
        .command("set-default", "Set the default pipeline and or the default section name from .edgerc")
        .option('-p, --pipeline <pipelineName>', 'Set default pipeline name')
        .option('-s, --section <section>', 'Set default section name from edgerc file')
        .option('-f, --format <format>', "Select output format, allowed values are 'json' or 'table'")
        .option('-e, --emails <emails>', 'Set default notification emails as comma separated list')
        .option('-a, --accountSwitchKey <accountSwitchKey>', 'Set default account switch key value')
        .alias("sd")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setDefault
        });

    commander
        .command("show-defaults", "Show default settings for this workspace")
        .alias("sf")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showDefaults
        });

    commander
        .command("merge <environment>", "Merge template json and variable values into a PM/PAPI ruletree JSON document, " +
            "stored in dist folder in the current pipeline folder")
        .option('-p, --pipeline <pipelineName>', 'Pipeline name')
        .option('-n, --no-validate', "Don't call validation end point. Just run merge.")
        .alias("m")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = merge
        });

    commander
        .command("search <name>", "Search for properties by name")
        .alias("s")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = search
        });

    commander
        .command("set-prefixes <useprefix>", "Set or unset use of prefixes [true|false] for current user credentials and setup")
        .alias("sp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setPrefixes
        });

    commander
        .command("set-ruleformat <ruleformat>", "Set ruleformat for current user credentials and setup")
        .alias("srf")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setRuleFormat
        });

    commander
        .command("list-contracts", "List contracts available to current user credentials and setup")
        .alias("lc")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listContracts
        });

    commander
        .command("list-products", "List products available under provided contract ID and client ID available to current user credentials and setup")
        .option('-c, --contractId <contractId>', "Contract ID")
        .alias("lp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listProducts
        });

    commander
        .command("list-groups", "List groups available to current user credentials and setup")
        .alias("lg")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listGroups
        });

    commander
        .command("list-cpcodes", "List cpcodes available to current user credentials and setup.")
        .option('-c, --contractId <contractId>', "Contract ID")
        .option('-g, --groupId <groupId>', "Group ID", helpers.parseGroupId)
        .alias("lcp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listCpcodes
        });

    commander
        .command("show-ruletree <environment>", "Shows the rule tree of a local property for provided environment. Also, one can use the show-ruletree -p <pipelineName> <environment> >>  <filename.json> to store it into a local file.")
        .option('-p, --pipeline <pipelineName>', 'pipeline name')
        .alias("sr")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save <environment>", "Save rule tree and hostnames for provided environment. " +
            "Edge hostnames are also created if needed.")
        .option('-p, --pipeline <pipelineName>', 'pipeline name')
        .alias("sv")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = save
        });

    commander
        .command("list-edgehostnames", "List edge hostnames available to current user credentials and setup (this could be a long list).")
        .option('-c, --contractId <contractId>', "Contract ID")
        .option('-g, --groupId <groupId>', "Group ID", helpers.parseGroupId)
        .alias("leh")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listEdgeHostnames
        });

    commander
        .command("list-status", "Show status of pipeline")
        .option('-p, --pipeline <pipelineName>', 'pipeline name')
        .alias("lstat")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listStatus
        });

    commander
        .command("promote <targetEnvironment>",
            "Promote (activate) an environment. This command also executes the merge and save commands mentioned above by default.")
        .option('-p, --pipeline <pipelineName>', 'pipeline name')
        .option('-n, --network <network>', "Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'")
        .option('-e, --emails <emails>', "Comma separated list of email addresses. Optional if default emails were previously set with set-default")
        .option('-m, --message <message>', "Promotion message passed to activation backend")
        .option('-w, --wait-for-activate', "Return after promotion of an environment is active.")
        .option('--force', "Force command is deprecated, out of sequence activations are now allowed by default.")
        .alias("pm")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = promote
        });

    commander
        .command("check-promotion-status <environment>", "Check status of promotion (activation) of an environment.")
        .option('-p, --pipeline <pipelineName>', 'pipeline name')
        .option('-w, --wait-for-activate', "Return after promotion of an environment is active.")
        .alias("cs")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = checkPromotions
        });

    commander
        .command('help', "help command", {
            noHelp: true
        })
        .action(function(options) {
            if (_.isObject(options.parent.args[0])) {
                commander.outputHelp();
            } else {
                let name = options.parent.args[0];
                if (commander.listeners('command:' + name).length > 0) {
                    commander.emit('command:' + name, [], ['--help']);
                } else {
                    consoleLogger.info(`  Unknown command: '${name}'`);
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
            consoleLogger.info(`  Unknown command: '${options.parent.args[0]}'`);
            commander.outputHelp();
            throw new errors.ExitError("need to quit");
        });

    try {
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