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
 * devops-prov command line tool calling into SDK classes and methods.
 *
 */


//used for table formatted output
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const version = require("../package.json").version;

const DevOpsCommand = require('./command');
const errors = require('./errors');
const logging = require('./logging');
const helpers = require('./helpers');
const devopsFactoryFunction = require('./factory');

const cliLogger = new logging.ConsoleLogger();

/**
 * Main function called by CLI command
 * parses command line arguments and delegates to the correct handler function.
 *
 * @param cmdArgs {Array} defaults to process.argv, override in unit tests
 * @param procEnv {Object} defaults to process.env
 * @param factoryFunction {Function} creates all the SDK related instances
 * @param overrideErrorReporter {Function} allows to override error reporting, used for unit tests
 * @param consoleLogger {object} logger instance for CLI output to stdout or stderr
 */
module.exports = function(cmdArgs = process.argv, procEnv = process.env,
    factoryFunction = devopsFactoryFunction, overrideErrorReporter = null, consoleLogger = cliLogger) {

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
        const logging = require("./logging");
        let clientType = "regular";
        let recordFilename = null;
        let recordErrors = false;
        let section;
        if (options.parent) {
            let parentOptions = options.parent;
            if (parentOptions.recordToFile && parentOptions.replayFromFile) {
                throw new errors.ArgumentError("can't use --record-to-file and --replay-from-file at the same time",
                    "incompatible_command_options", "--record-to-file", "--replay-from-file");
            }
            if (parentOptions.recordToFile) {
                clientType = "record";
                recordFilename = parentOptions.recordToFile;
            }
            if (parentOptions.replayFromFile) {
                clientType = "replay";
                recordFilename = parentOptions.replayFromFile;
            }
            if (parentOptions.recordErrors) {
                recordErrors = parentOptions.recordErrors;
            }
            section = parentOptions.section;
        }
        logging.log4jsLogging(useVerboseLogging(options));

        return factoryFunction({
            procEnv,
            clientType,
            recordFilename,
            recordErrors,
            section
        });
    };

    let reportError;
    if (_.isFunction(overrideErrorReporter)) {
        reportError = overrideErrorReporter;
    } else {
        reportError = function(error, verbose) {
            if (error instanceof errors.DevOpsError) {
                if (verbose) {
                    consoleLogger.error(`DevOps problem '${error.messageId}' occurred: \n`, error.stack);
                    if (_.isArray(error.args) && error.args.length > 0) {
                        for (let details of error.args) {
                            if (_.isObject(details) || _.isArray(details)) {
                                details = helpers.jsonStringify(details);
                            }
                            consoleLogger.error("Error details: ", details);
                        }
                    }
                } else {
                    consoleLogger.error(`DevOps problem '${error.messageId}' occurred: \n`, error.message);
                }
            } else {
                consoleLogger.error("Unexpected error occurred: ", error, error.stack);
            }
            process.exitCode = 1;
        };
    }

    /**
     * sets the default project
     * @param options
     */
    const setDefault = function(devops, options) {
        let projectName = options.project;
        let section = options.section || options.parent.section;
        if (!projectName && !section) {
            throw new errors.DependencyError("Need at least one option! Use devops-prov -p <project name> or devops-prov -s <section>.",
                "missing_option");
        }

        if (section) {
            devops.setDefaultSection(section);
        }
        if (projectName) {
            devops.setDefaultProject(projectName);
        }
    };

    /**
     * Creates a new devops project (devops pipeline)
     * @type {Function}
     */
    const createNewProject = function(devops, environments, options) {
        let groupId = options.groupId;
        if (!(groupId && _.isNumber(groupId))) {
            throw new errors.DependencyError("groupId needs to be provided as a number", "missing_group_id");
        }
        let contractId = options.contractId;
        if (!contractId) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }
        let productId = options.productId;
        if (!productId) {
            throw new errors.DependencyError("productId needs to be provided", "missing_product_id");
        }
        let projectName = options.project;
        if (!projectName) {
            throw new errors.DependencyError("Missing project option! Use devops-prov -p <project name> ...",
                "missing_project_name");
        }
        let isInRetryMode = options.retry || false;
        let createPropertyInfo = {
            projectName,
            productId,
            contractId,
            groupId,
            environments,
            isInRetryMode
        };
        if (_.isNumber(options.propertyId)) {
            createPropertyInfo.propertyId = options.propertyId;

            if (_.isNumber(options.version)) {
                createPropertyInfo.version = options.version;
            }
        } else {
            if (_.isNumber(options.version)) {
                throw new errors.ArgumentError("Version without propertyId provided. Also need property ID.",
                    "missing_property_id");
            }
        }
        return devops.createNewProject(createPropertyInfo);
    };

    /**
     * find properties
     * @type {Function}
     */
    const search = function(devops, name) {
        return devops.getPAPI().findProperty(name).then(data => {
            let versions = data["versions"]["items"];
            versions = _.map(versions, function(version) {
                return [
                    version["accountId"],
                    version["contractId"],
                    version["assetId"],
                    version["groupId"],
                    version["propertyId"],
                    version["propertyName"],
                    version["propertyVersion"],
                    version["updatedByUser"],
                    version["updatedDate"],
                    version["productionStatus"],
                    version["stagingStatus"]
                ];
            });
            versions.unshift(["Account ID", "Contract ID", "Asset ID", "Group ID", "Property ID", "Property Name",
                "Property Version", "Updated By User", "Update Date", "Production Status", "Staging Status"
            ]);
            consoleLogger.info(AsciiTable.table(versions, 30));
        });
    };

    /**
     * Set or unset prefixes for it types.
     * @type {Function}
     */
    const setPrefixes = function(devops, useprefix) {
        let prefix = (useprefix === 'true');
        return devops.setPrefixes(prefix).then(data => {
            consoleLogger.info(helpers.jsonStringify(data));
        });
    };

    const setRuleFormat = function(devops, ruleformat) {
        return devops.setRuleFormat(ruleformat).then(data => {
            consoleLogger.info(helpers.jsonStringify(data));
        });
    };


    /**
     * list contracts user has access to (user who the client id belongs to)
     * @type {Function}
     */
    const listContracts = function(devops) {
        return devops.listContracts().then(data => {
            let contracts = data["contracts"]["items"];
            contracts = _.map(contracts, function(ctr) {
                return [ctr["contractId"], ctr["contractTypeName"]];

            });
            contracts.unshift(["Contract ID", "Contract Type Name"]);
            consoleLogger.info(AsciiTable.table(contracts, 30));
        });
    };

    /**
     * list status for the project and environment details
     * @type {Function}
     */
    const listStatus = function(devops, options) {
        return devops.getProject(devops.extractProjectName(options)).getStatus().then(envData => {
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
        });
    };

    /**
     * list products for a specific contract ID
     * @type {Function}
     */
    const listProducts = function(devops, options) {
        let contractId = options.contractId;
        if (!contractId) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }
        return devops.listProducts(contractId).then(data => {
            let products = data["products"]["items"];
            products = _.map(products, function(prod) {
                return [prod["productName"], prod["productId"]];
            });
            products.unshift(["Product Name", "Product ID"]);
            consoleLogger.info(AsciiTable.table(products, 30));
        });
    };

    /**
     * list groups user has access to
     * @type {Function}
     */
    const listGroups = function(devops) {
        return devops.listGroups().then(data => {
            let groups = data["groups"]["items"];
            groups = _.map(groups, function(group) {
                let contractIdArr = group["contractIds"];
                let contractIds = "";
                if (_.isArray(contractIdArr)) {
                    contractIds = contractIdArr.join(", ")
                }
                let parentGroup = group['parentGroupId'] || "";
                return [group["groupName"], group["groupId"], parentGroup, contractIds];
            });
            groups.unshift(["Group Name", "Group ID", "Parent Group ID", "Contract IDs"]);
            consoleLogger.info(AsciiTable.table(groups, 30));
        });
    };

    /**
     * list cpcodes under a given contract and group
     * @type {Function}
     */
    const listCpcodes = function(devops, options) {
        let groupId = options.groupId;
        if (!(groupId && _.isNumber(groupId))) {
            throw new errors.DependencyError("groupId needs to be provided as a number", "missing_group_id");
        }

        let contractId = options.contractId;
        if (!contractId) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }

        return devops.listCpcodes(contractId, groupId).then(data => {
            let cpcodes = data["cpcodes"]["items"];
            cpcodes = _.map(cpcodes, function(cp) {
                return [
                    cp["cpcodeId"],
                    cp["cpcodeName"],
                    cp["productIds"].join(", "),
                    cp["createdDate"]
                ];
            });
            cpcodes.unshift(["ID", "Name", "Product IDs", "Creation Date"]);
            consoleLogger.info(AsciiTable.table(cpcodes, 30));
        });
    };

    /**
     * Report on validation warnings, errors and hostname errors.
     * @param data
     */
    const reportActionErrors = function(data) {
        if (helpers.isArrayWithData(data.validationWarnings)) {
            consoleLogger.warn('There are validation warnings: \n', helpers.jsonStringify(data.validationWarnings));
        }
        if (helpers.isArrayWithData(data.validationErrors)) {
            consoleLogger.error('There are validation errors: \n', helpers.jsonStringify(data.validationErrors));
        }
        if (helpers.isArrayWithData(data.hostnameErrors)) {
            consoleLogger.error('There are hostname errors: \n', helpers.jsonStringify(data.hostnameErrors));
        }
    };

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
        });
    };

    /**
     * save rule tree belonging to provided environment.
     * @type {Function}
     */
    const save = function(devops, envName, options) {
        return devops.save(devops.extractProjectName(options), envName).then(data => {
            let saveData = [
                ["Action", "Result"],
                ["stored rule tree", data.storedRules ? "yes" : "no"],
                ["edge hostnames created", helpers.isArrayWithData(data.edgeHostnames.hostnamesCreated.length) ? "yes" : "no"],
                ["stored hostnames", data.storedHostnames ? "yes" : "no"],
                ["validation warnings", helpers.isArrayWithData(data.validationWarnings) ? "yes" : "no"],
                ["validation errors", helpers.isArrayWithData(data.validationErrors) ? "yes" : "no"]
            ];

            consoleLogger.info(AsciiTable.table(saveData));

            reportActionErrors(data);
        });
    };

    /**
     * create edge hostnames. TODO: remove
     * @type {Function}
     */
    const createEdgeHostnames = function(devops, envName, options) {
        return devops.createEdgeHostnames(devops.extractProjectName(options), envName);
    };

    const STAGING = new Set(['S', 'ST', 'STAG', 'STAGING']);

    const PROD = new Set(['P', 'PR', 'PROD', 'PRODUCTION']);

    /**
     * Extract and check the network name. Allow for partial names and lower case letters.
     * @param options
     * @return {string}
     */
    const checkNetworkName = function(options) {
        let network = options.network;
        if (!_.isString(network)) {
            throw new errors.ArgumentError("Need network name, staging or production", "missing_network_name");
        }
        network = network.toUpperCase();
        if (STAGING.has(network)) {
            network = "STAGING";
        } else if (PROD.has(network)) {
            network = "PRODUCTION";
        } else {
            throw new errors.ArgumentError(`Illegal network name: '${options.network}'`,
                "illegal_network_name", options.network);
        }
        return network;
    };

    /**
     * promote environment to staging or production network.
     * @type {Function}
     */
    const promote = function(devops, envName, emails, options) {
        let network = checkNetworkName(options);
        return devops.promote(devops.extractProjectName(options), envName, network, emails).then(data => {
            let pending = data.pending;
            data = [
                ["Environment", "Network", "Activation Id"],
                [envName, pending.network, pending.activationId]
            ];
            consoleLogger.info("Following activations are now pending:");
            consoleLogger.info(AsciiTable.table(data, 30));
        });
    };

    const fallbackValue = function(value, fallback) {
        return (value === null || value === undefined) ? fallback : value;
    };

    const checkPromotions = function(devops, envName, options) {
        return devops.checkPromotions(devops.extractProjectName(options), envName).then(data => {
            let results = _.map(data.promotionUpdates, function(activation, network) {
                return [envName, network, activation.activationId, activation.status];
            });
            if (results.length > 0) {
                results.unshift(["Environment", "Network", "Activation Id", "Status"]);
                consoleLogger.info("Activation status report: ");
                consoleLogger.info(AsciiTable.table(results, 40));
            } else {
                let promotionStatus = data.promotionStatus;
                let results = [
                    [envName, "staging", fallbackValue(promotionStatus.activeInStagingVersion, "No version is active")],
                    [envName, "production", fallbackValue(promotionStatus.activeInProductionVersion, "No version is active")],
                ];
                consoleLogger.info(`There is currently no promotion pending. `);
                consoleLogger.info(`Current activation status of '${envName}' environment by network: `);
                results.unshift(["Environment", "Network", "Active Version"]);
                consoleLogger.info(AsciiTable.table(results, 40));
            }
        });
    };

    /**
     * TODO: remove
     * @param environmentName
     * @param options
     */
    const showRuletree = function(devops, environmentName, options) {
        devops.getProject(devops.extractProjectName(options))
            .getRuleTree(environmentName)
            .then(data => {
                consoleLogger.info(helpers.jsonStringify(data));
            })
            .catch(error => {
                consoleLogger.error(error);
            });
    };

    const listEdgeHostnames = function(devops, options) {
        let groupId = options.groupId;
        if (!(groupId && _.isNumber(groupId))) {
            throw new errors.DependencyError("groupId needs to be provided as a number", "missing_group_id");
        }
        let contractId = options.contractId;
        if (!contractId) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }
        return devops.listEdgeHostnames(contractId, groupId).then(data => {
            data = _.map(data.edgeHostnames.items, function(eh) {
                return [
                    eh["edgeHostnameId"],
                    eh["domainPrefix"],
                    eh["domainSuffix"],
                    eh["ipVersionBehavior"],
                    eh["secure"],
                    eh["edgeHostnameDomain"]
                ];
            });
            data.unshift(["ID", "Prefix", "Suffix", "IP Version Behavior", "Secure", "EdgeHostname Domain"]);
            const res = AsciiTable.table(data, 80);
            consoleLogger.info(res);
        });
    };

    let actionCalled;
    let argumentsUsed;
    let verbose = false;
    const commander = new DevOpsCommand("DevOps SDK", consoleLogger);
    commander
        .version(version)
        .description("DevOps Provisioning SDK command line too. " +
            "The command assumes that your current working directory is the project space under which all projects reside")
        .option('-v, --verbose', 'Verbose output, show logging on stdout')
        .option('-s, --section <section>', 'Section name representing Client ID in .edgerc file, defaults to "credentials"')
        .option('--record-to-file <filename>', 'Record REST communication to file')
        .option('--record-errors', 'Also record error responses')
        .option('--replay-from-file <filename>', 'Use record file to replay REST communication. Used for offline testing');

    commander
        .command("new-project [environments...]", "Create a new project (pipeline) with provided attributes. " +
            "This will also create one PM property for each environment.")
        .option('--retry', 'Assuming command failed last time during execution. Try to continue where it left off.')
        .option('-p, --project <projectName>', 'Project name')
        .option('-g, --groupId <groupId>', "Group ID", helpers.parseGroupId)
        .option('-c, --contractId <contractId>', "Contract ID")
        .option('-d, --productId <productId>', "Product ID")
        .option('-e, --propertyId [propertyId]', "Use existing property as blue print for pipeline templates", helpers.parsePropertyId)
        .option('-n, --version [version]', "Specify version of property, if omitted, use latest", helpers.parsePropertyVersion)
        .alias("np")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createNewProject
        });

    commander
        .command("set-default", "Set the default project and default section name used client.properties.")
        .option('-p, --project <projectName>', 'Set default project name')
        .option('-s, --section <section>', 'Set default section name from edgerc file')
        .alias("sd")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setDefault
        });

    commander
        .command("merge <environment>", "Merge template json and variable values into a PM/PAPI ruletree JSON document, " +
            "stored in dist folder in the current project folder")
        .option('-p, --project [projectName]', 'Project name')
        .option('-n, --no-validate', "Don't call validation end point. Just run merge.")
        .alias("m")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = merge
        });

    commander
        .command("search <name>", "Search for PM properties by name")
        .alias("s")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = search
        });

    commander
        .command("set-prefixes <useprefix>", "Set or unset prefixes for the currently selected client ID")
        .alias("sp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setPrefixes
        });

    commander
        .command("set-ruleformat <ruleformat>", "Set ruleformat for the selected client ID")
        .alias("srf")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = setRuleFormat
        });

    commander
        .command("list-contracts", "List contracts available to client ID")
        .alias("lc")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listContracts
        });

    commander
        .command("list-products", "List products available under provided contract ID and client ID")
        .option('-c, --contractId <contractId>', "Contract ID")
        .alias("lp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listProducts
        });

    commander
        .command("list-groups", "List groups client ID has access to")
        .alias("lg")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listGroups
        });

    commander
        .command("list-cpcodes", "List cpcodes for provided contract ID and group ID.")
        .option('-c, --contractId <contractId>', "Contract ID")
        .option('-g, --groupId <groupId>', "Group ID", parseInt)
        .alias("lcp")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listCpcodes
        });

    commander
        .command("show-ruletree <environment>", "Fetch latest version of property rule tree for provided environment")
        .option('-p, --project [projectName]', 'Project name')
        .alias("sr")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save <environment>", "Save rule tree and hostnames for provided environment. " +
            "Edge hostnames are also created if needed.")
        .option('-p, --project [projectName]', 'Project name')
        .alias("sv")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = save
        });

    commander
        .command("create-edgehostnames <environment>", "Check if any edge hostnames need to be created and proceed to create them.")
        .option('-p, --project [projectName]', 'Project name')
        .alias("ceh")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createEdgeHostnames
        });

    commander
        .command("list-edgehostnames", "List edge hostnames available under provided contract ID and group ID " +
            "(this could be a long list)")
        .option('-c, --contractId <contractId>', "Contract ID")
        .option('-g, --groupId <groupId>', "Group ID", parseInt)
        .alias("leh")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listEdgeHostnames
        });

    commander
        .command("list-status", "Show status of each environment in a table")
        .option('-p, --project [projectName]', 'Project name')
        .alias("lstat")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listStatus
        });

    commander
        .command("promote <environment> <notificationEmails...>", "Promote (activate) an environment.")
        .option('-p, --project [projectName]', 'Project name')
        .option('-n, --network <network>', "Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'")
        .alias("pm")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = promote
        });

    commander
        .command("check-promotion-status <environment>", "Check status of promotion (activation) of an environment.")
        .option('-p, --project [projectName]', 'Project name')
        .alias("cps")
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
                if (_.isObject(response) && (_.isFunction(response.catch))) {
                    response.catch(function(error) {
                        reportError(error, verbose)
                    });
                }
            }
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