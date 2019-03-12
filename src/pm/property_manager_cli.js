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
 * akamai pm command line tool calling into SDK classes and methods.
 */
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const version = require("../../package.json").version;

const DevOpsCommand = require('../command');
const errors = require('../errors');
const logging = require('../logging');
const helpers = require('../helpers');
const commonCliClass = require('../common/common_cli');
const inquirer = require('inquirer');

const reportLabel = {
    table: "Property",
    json: "property",
    activationLabel: "activation"
};

const cliLogger = new logging.ConsoleLogger();

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
            section,
            version,
            outputFormat
        });
    };

    /**
     * @param environmentName
     * @param options
     */
    const showRuletree = function(devops, options) {
        let projectName = devops.extractProjectName(options);
        devops.getProject(projectName)
            .getRuleTree(projectName)
            .then(data => {
                consoleLogger.info(helpers.jsonStringify(data));
            })
            .catch(error => {
                consoleLogger.error(error);
            });
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
        if (!snippetName && !section && !emails && !format) {
            throw new errors.DependencyError("Need at least one option! Use akamai pm -p <property name>" +
                ", akamai pm -e <emails>, akamai pm -s <section> or akamai pm -f <format>.",
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

    const setPrefixes = commonCli.setPrefixes.bind(commonCli);
    const setRuleFormat = commonCli.setRuleFormat.bind(commonCli);
    const listContracts = commonCli.listContracts.bind(commonCli);
    const listProducts = commonCli.listProducts.bind(commonCli);
    const listGroups = commonCli.listGroups.bind(commonCli);
    const listCpcodes = commonCli.listCpcodes.bind(commonCli);
    const listEdgeHostnames = commonCli.listEdgeHostnames.bind(commonCli);
    const showDefaults = commonCli.showDefaults.bind(commonCli);
    const search = commonCli.search.bind(commonCli);


    /**
     * Creates a new PM CLI Project
     * @type {Function}
     */
    const createProject = function(devops, options) {
        let projectName = options.property;
        if (!projectName || _.isBoolean(projectName)) {
            throw new errors.DependencyError("Missing property option! Use akamai pm np -p <property name> ...",
                "missing_property_name");
        }
        let propertyId, propertyName, propertyVersion;

        let checkedPropertyInfo = commonCli.checkPropertyIdAndPropertyVersion(options.propertyId, options.version);
        propertyId = checkedPropertyInfo.propertyId;
        propertyName = checkedPropertyInfo.propertyName;
        propertyVersion = checkedPropertyInfo.propertyVersion;

        let groupId = options.groupId;

        if (!(propertyId || propertyName || groupId)) {
            throw new errors.DependencyError("groupId needs to be provided as a number", "missing_group_id");
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
        let variableMode;

        variableMode = (propertyId || propertyName) ? helpers.allowedModes[1] : helpers.allowedModes[0];
        variableMode = options.variableMode || variableMode;
        if (options.variableMode && !(propertyId || propertyName)) {
            throw new errors.ArgumentError(`Variable Mode usable only with an existing property.`,
                "variable_mode_needs_existing_property");
        } else if (!checkVariableModeOptions(variableMode)) {
            throw new errors.ArgumentError(`Invalid variable mode option selected.  Valid modes are ${printAllowedModes()}`,
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
        if (dryRun) {
            consoleLogger.info("create property info: ", helpers.jsonStringify(createPropertyInfo));
        } else {
            return devops.createProperty(createPropertyInfo);
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
                    ["validation errors", helpers.isArrayWithData(data.validationErrors) ? "yes" : "no"]
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
                    validationErrors: data.validationErrors
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
                    ["validation errors", helpers.isArrayWithData(data.validationErrors) ? "yes" : "no"]
                ];
                consoleLogger.info(AsciiTable.table(saveData));
                reportActionErrors(data);
            } else {
                let saveData = {
                    storedRuletree: data.storedRules ? "yes" : "no",
                    edgeHostnamesCreated: helpers.isArrayWithData(data.edgeHostnames.hostnamesCreated) ? "yes" : "no",
                    storedHostnames: data.storedHostnames ? "yes" : "no",
                    validationWarnings: data.validationWarnings,
                    validationErrors: data.validationErrors
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
     * deactivate property in staging or production network.
     * @type {Function}
     */
    const deactivate = async function(devops, options) {
        let runDatv = options.forceDeactivate;
        let propertyName = devops.extractProjectName(options);
        let network = commonCli.checkNetworkName(options);
        if (!runDatv) {
            var questions = [{
                type: 'confirm',
                name: 'DeactivateConfirmed',
                message: `WARNING:  This will deactivate the property '${propertyName}' on network '${network}'.
Are you sure you want to Deactivate the property '${propertyName}' on network '${network}'?`,
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

    const importProperty = async function(devops, options) {
        let propertyName = options.property;
        if (!propertyName || _.isBoolean(propertyName)) {
            throw new errors.DependencyError("Missing property option! Use akamai pm import -p <property name> ...",
                "missing_property_name");
        }
        consoleLogger.info(`Importing and creating local files for ${propertyName} from Property Manager...`);
        let createPropertyInfo = {
            propertyName
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
            consoleLogger.info(`Imported ${project.getName()}. The latest version is: v${project.loadEnvironmentInfo().latestVersionInfo.propertyVersion}`);

        }
    };

    const update = async function(devops, options) {
        let runPull = options.forceUpdate;
        let projectName = devops.extractProjectName(options);

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
                variableMode
            };

            let dryRun = options.dryRun || false;


            if (dryRun) {
                consoleLogger.info("update property info: ", helpers.jsonStringify(createPropertyInfo));
            } else {
                consoleLogger.info(`Updating and overwriting local files for ${projectName} from PAPI...`);
                let project = await devops.updateProperty(createPropertyInfo);
                consoleLogger.info(`Updated ${project.getName()} to the latest: v${project.loadEnvironmentInfo().latestVersionInfo.propertyVersion}`);
            }
        }

    };

    let actionCalled;
    let argumentsUsed;
    const commander = new DevOpsCommand("akamai pm", consoleLogger);


    commander
        .version(version)
        .description("PM CLI. The command assumes that your current working directory is the project space under which all properties reside")
        .option('-v, --verbose', 'Verbose output, show logging on stdout')
        .option('-s, --section [section]', 'Section name representing Client ID in .edgerc file, defaults to "credentials"')
        .option('-f, --format [format]', "Select output format, allowed values are 'json' or 'table'")

    commander
        .command("new-property", "Create a new PM CLI property with provided attributes.")
        .option('--retry', 'Assuming command failed last time during execution. Try to continue where it left off.')
        .option('--dry-run', 'Just parse the parameters and print out the json generated that would normally call the create property funtion.')
        .option('-p, --property <propertyName>', 'PM CLI property name')
        .option('-g, --groupId [groupId]', "Group ID, optional if -e propertyId/Name is used", helpers.parseGroupId)
        .option('-c, --contractId [contractId]', "Contract ID, optional if -e propertyId/Name is used", helpers.prefixeableString('ctr_'))
        .option('-d, --productId [productId]', "Product ID, optional if -e propertyId/Name is used", helpers.prefixeableString('prd_'))
        .option('-e, --propertyId [propertyId/propertyName]', "Use existing property as blue print for PM CLI property. " +
            "Either pass property ID or exact property name. PM CLI will lookup account information like group id, " +
            "contract id and product id of the existing property and use the information for creating PM CLI properties")
        .option('-n, --version [version]', "Can be used only if option '-e' is being used. Specify version of existing property being used as blue print, if omitted, use latest", helpers.parsePropertyVersion)
        .option('--variable-mode [variableMode]', `Choose how your new property will pull in variable.  Allowed values are ${printAllowedModes()}.  Only works when creating a property from an existing property`)
        .option('--secure', "Make new property secure")
        .option('--insecure', "Make new property not secure")
        .alias("np")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createProject
        });

    commander
        .command("set-default", "Set the default PM CLI property and or the default section name from .edgerc")
        .option('-p, --property <propertyName>', 'Set default property name')
        .option('-s, --section <section>', 'Set default section name from edgerc file')
        .option('-f, --format <format>', "Select output format, allowed values are 'json' or 'table'")
        .option('-e, --emails <emails>', 'Set default notification emails as comma separated list')
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
        .command("merge", "Merge config snippets into a PM/PAPI ruletree JSON document, " +
            "stored in dist folder in the current property folder")
        .option('-p, --property [propertyName]', 'PM CLI property name')
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
        .command("show-ruletree", "Fetch latest version of property rule tree")
        .option('-p, --property [propertyName]', 'property name')
        .alias("sr")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save", "Save rule tree and hostnames for provided PM CLI property. " +
            "Edge hostnames are also created if needed.")
        .option('-p, --property [propertyName]', 'PM CLI property name')
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
        .command("activate",
            "Activate a PM CLI property. This command also executes the merge and save commands mentioned above by default.")
        .option('-p, --property [propertyName]', 'PM CLI property name')
        .option('-n, --network <network>', "Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'")
        .option('-e, --emails [emails]', "Comma separated list of email addresses. Optional if default emails were previously set with set-default")
        .option('-m, --message [message]', "Activation message passed to activation backend")
        .option('-w, --wait-for-activate', "Return after activation of a property is active.")
        .alias("atv")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = activate
        });

    commander
        .command("deactivate",
            "Deactivate a PM CLI property. This command will check if the property is active and then deactivate it")
        .option('-p, --property [propertyName]', 'PM CLI property name')
        .option('-n, --network <network>', "Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'")
        .option('-e, --emails [emails]', "Comma separated list of email addresses. Optional if default emails were previously set with set-default")
        .option('-m, --message [message]', "deactivation message passed to backend")
        .option('-w, --wait-for-activate', "Return after the property is deactivated.")
        .option('--force-deactivate', 'WARNING:  This option will bypass the confirmation prompt and will Deactivate your property on the network')
        .alias("datv")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = deactivate
        });

    commander
        .command("check-activation-status", "Check status of activation of a PM CLI property.")
        .option('-p, --property [propertyName]', 'PM CLI property name')
        .option('-w, --wait-for-activate', "Return after activation of a PM CLI property is active.")
        .alias("cs")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = checkActivations
        });

    commander
        .command("update-local", "Update local property with the latest from Property Manager.")
        .option('-p, --property [propertyName]', 'PM CLI property name')
        .option('--dry-run', 'Just parse the parameters and print out the json generated that would normally call the create property funtion.')
        .option('--variable-mode [variableMode]', `Choose how your update-local will pull in variables.  Allowed values are ${printAllowedModesUpdateOrImport()}.  Default functionality is no-var`)
        .option('--force-update', 'WARNING:  This option will bypass the confirmation prompt and will overwrite your local files')
        .alias("ul")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = update
        });

    commander
        .command("import", "Import a property from Property Manager.")
        .option('-p, --property [propertyName]', 'PM CLI property name')
        .option('--dry-run', 'Just parse the parameters and print out the json generated that would normally call the create property funtion.')
        .option('--variable-mode [variableMode]', `Choose how your import will pull in variables.  Allowed values are ${printAllowedModesUpdateOrImport()}.  Default functionality is no-var`)
        .alias("i")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = importProperty
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
            if (_.isArray(argumentsUsed[argumentsUsed.length - 1])) {
                let extraoptions = argumentsUsed[argumentsUsed.length - 1];
                throw new errors.ArgumentError(`Didn't expect these parameters: '${extraoptions.join(', ')}'`,
                    "cli_unexpected_parameters", extraoptions);
            }
            //options is the last parameter in the action handler param list
            let options = argumentsUsed[argumentsUsed.length - 1];
            verbose = useVerboseLogging(options);
            if (_.isFunction(actionCalled)) {
                let devops = createDevops(options);
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