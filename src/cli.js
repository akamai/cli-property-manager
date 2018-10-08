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
 * akamai pd command line tool calling into SDK classes and methods.
 */


//used for table formatted output
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const version = require("../package.json").version;

const DevOpsCommand = require('./command');
const errors = require('./errors');
const logging = require('./logging');
const helpers = require('./helpers');

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
        let outputFormat;
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
            if (parentOptions.format) {
                outputFormat = parentOptions.format;
            }
            section = parentOptions.section;
        }
        logging.log4jsLogging(useVerboseLogging(options));

        let devopsFactoryFunction;
        if (_.isFunction(overrideDevopsFactoryFunction)) {
            devopsFactoryFunction = overrideDevopsFactoryFunction;
        } else {
            devopsFactoryFunction = require('./factory');
        }

        return devopsFactoryFunction({
            procEnv,
            clientType,
            recordFilename,
            recordErrors,
            section,
            version,
            outputFormat
        });
    };

    let reportError;
    if (_.isFunction(overrideErrorReporter)) {
        reportError = overrideErrorReporter;
    } else {
        reportError = function(error, verbose) {
            if (error instanceof errors.AkamaiPDError) {
                if (verbose) {
                    consoleLogger.error(`Pipeline Error: '${error.messageId}' occurred: \n`, error.stack);
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
                    consoleLogger.error(`Pipeline Error: '${error.messageId}' occurred: \n`, error.message);
                }
            } else {
                consoleLogger.error("Unexpected error occurred: ", error, error.stack);
            }
            process.exitCode = 1;
        };
    }

    /**
     * sets the default pipeline
     * @param options
     */
    const setDefault = function(devops, options) {
        let pipelineName = options.pipeline;
        let section = options.section || options.parent.section;
        let emails = options.emails;
        let format = options.format || options.parent.format;
        if (!pipelineName && !section && !emails && !format) {
            throw new errors.DependencyError("Need at least one option! Use akamai pd -p <pipeline name>, " +
                ", akamai pd -e <emails>, akamai pd -s <section> or akamai pd -f <format>.",
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
        if (format) {
            const formatRe = /^(json|table)$/i;
            if (format.match(formatRe)) {
                devops.setDefaultFormat(format.toLowerCase());
            } else {
                throw new errors.ArgumentError("Only 'json' or 'table' are allowed as format string", "illegal_format", format);
            }
        }
    };

    const renderOutput = function(columnNames, keysNames, values, format) {
        let output;
        if (format === "json") {
            output = helpers.jsonStringify(_.object(keysNames, values));
        } else {
            let data = _.filter(_.zip(keysNames, values), item => {
                return item[1];
            });
            data.unshift(columnNames);
            output = AsciiTable.table(data, 180);
        }
        consoleLogger.info(output)
    };

    const showDefaults = function(devops) {
        let settings = devops.devopsSettings;

        let savedSettings = settings.__savedSettings || {};
        let values = [
            _.isObject(savedSettings.edgeGridConfig) ? savedSettings.edgeGridConfig.section : undefined,
            savedSettings.defaultProject,
            _.isArray(savedSettings.emails) ? savedSettings.emails.join(", ") : undefined,
            savedSettings.outputFormat
        ];
        let columnNames = ["Option Name", "Value"];
        let keys = ["section", "defaultProject", "emails", "format"];
        renderOutput(columnNames, keys, values, settings.outputFormat);
    };

    /**
     * Creates a new devops pipeline (devops pipeline)
     * @type {Function}
     */
    const createPipeline = function(devops, environments, options) {
        let projectName = options.pipeline;
        if (!projectName || _.isBoolean(projectName)) {
            throw new errors.DependencyError("Missing pipeline option! Use akamai pd -p <pipeline name> ...",
                "missing_pipeline_name");
        }
        let propertyId, propertyName, propertyVersion;
        if (_.isString(options.propertyId)) {
            if (options.propertyId.startsWith("prp_")) {
                propertyId = options.propertyId.slice("prp_".length);
                propertyId = helpers.parseInteger(propertyId);
                if (_.isNaN(propertyId)) {
                    propertyId = undefined;
                    propertyName = options.propertyId
                }
            } else {
                propertyId = helpers.parseInteger(options.propertyId);
                if (_.isNaN(propertyId)) {
                    propertyId = undefined;
                    propertyName = options.propertyId
                }
            }
            if (_.isNumber(options.version)) {
                propertyVersion = options.version;
            }
        } else if (_.isBoolean(options.propertyId)) {
            throw new errors.ArgumentError("No property ID or name provided with -e option.",
                "missing_property_id");
        } else {
            if (_.isNumber(options.version)) {
                throw new errors.ArgumentError("Version without propertyId provided. Also need property ID.",
                    "missing_property_id");
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
            isInRetryMode
        };
        if (_.isBoolean(options.secure)) {
            createPipelineInfo.secureOption = options.secure;
        }
        if (_.isBoolean(options.insecure)) {
            createPipelineInfo.secureOption = !options.insecure;
        }
        if (dryRun) {
            consoleLogger.info("create pipeline info: ", helpers.jsonStringify(createPipelineInfo));
        } else {
            return devops.createPipeline(createPipelineInfo);
        }
    };

    /**
     * find properties
     * @type {Function}
     */
    const search = function(devops, name) {
        return devops.getPAPI().findProperty(name).then(data => {
            let versions = data["versions"]["items"];
            if (devops.devopsSettings.outputFormat === 'table') {
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
                consoleLogger.info(AsciiTable.table(versions, 60));
            } else {
                consoleLogger.info(helpers.jsonStringify(versions));
            }
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
            if (devops.devopsSettings.outputFormat === 'table') {
                contracts = _.map(contracts, function(ctr) {
                    return [ctr["contractId"], ctr["contractTypeName"]];

                });
                contracts.unshift(["Contract ID", "Contract Type Name"]);
                consoleLogger.info(AsciiTable.table(contracts, 50));
            } else {
                consoleLogger.info(helpers.jsonStringify(contracts));
            }
        });
    };

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
            if (devops.devopsSettings.outputFormat === 'table') {
                products = _.map(products, function(prod) {
                    return [prod["productName"], prod["productId"]];
                });
                products.unshift(["Product Name", "Product ID"]);
                consoleLogger.info(AsciiTable.table(products, 30));
            } else {
                consoleLogger.info(helpers.jsonStringify(products));
            }
        });
    };

    /**
     * list groups user has access to
     * @type {Function}
     */
    const listGroups = function(devops) {
        return devops.listGroups().then(data => {
            let groups = data["groups"]["items"];
            if (devops.devopsSettings.outputFormat === 'table') {
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
            } else {
                consoleLogger.info(helpers.jsonStringify(groups));
            }
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
            if (devops.devopsSettings.outputFormat === 'table') {
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
            } else {
                consoleLogger.info(helpers.jsonStringify(cpcodes));
            }
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
    const save = function(devops, envName, options) {
        return devops.save(devops.extractProjectName(options), envName).then(data => {
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
    const promote = async function(devops, envName, options) {
        let network = checkNetworkName(options);
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

    const fallbackValue = function(value, fallback) {
        return (value === null || value === undefined) ? fallback : value;
    };

    const checkPromotions = async function(devops, envName, options) {
        //checkPromotionsLogic has logic to report if not waiting
        let resultObject = await checkPromotionsLogic(devops, envName, options);
        if (options.waitForActivate) {
            let dateStart = new Date();
            resultObject.dateStart = dateStart;
            return reportOrWait(resultObject)
        }
        return resultObject;
    };

    async function delayedCheck(devops, envName, options, dateStart) {
        let resultObject = await checkPromotionsLogic(devops, envName, options, dateStart);
        reportOrWait(resultObject);
    }

    const checkPromotionsLogic = async function(devops, envName, options, dateStart) {
        //Mostly intact 'non-waiting' check and report logic from before
        try {
            let data = await devops.checkPromotions(devops.extractProjectName(options), envName);
            let results = _.map(data.promotionUpdates, function(activation, network) {
                return [envName, network, activation.activationId, activation.status];
            });
            if (!options.waitForActivate) {
                if (results.length > 0) {
                    reportPromotionActiveStatus(results, devops.devopsSettings.outputFormat);
                } else {
                    reportNoPromotionPending(data, envName, devops.devopsSettings.outputFormat);
                }
            }
            return {
                results,
                data,
                devops,
                envName,
                dateStart,
                options
            };
        } catch (error) {
            return {
                error,
                devops
            };
        }
    };

    const isActivationPending = function(status, logStatus) {
        if (status === "PENDING" || status === "ZONE_1" || status === "ZONE_2" ||
            status === "ZONE_3" || status === "NEW" || status === "PENDING_DEACTIVATION" ||
            status === "PENDING_CANCELLATION") {
            if (logStatus) {
                consoleLogger.info(`...activation status is ${status}...`);
            }
            return true;
        }
        return false;
    };

    const reportOrWait = function(resultObject) {
        let results = resultObject.results,
            devops = resultObject.devops,
            envName = resultObject.envName,
            options = resultObject.options,
            dateStart = resultObject.dateStart,
            data = resultObject.data,
            error = resultObject.error;
        let outputFormat = devops.devopsSettings.outputFormat;
        if (error) {
            reportError(error, verbose);
        } else if (results.length === 0) {
            reportNoPromotionPending(data, envName, outputFormat, true);
        } else if (isActivationPending(results[0][3], outputFormat === 'table')) {
            if (outputFormat === 'table') {
                consoleLogger.info("...Waiting for active status..."); //we don't want to confused json parsers with text output
                consoleLogger.info("...Checking promotions...");
            }
            setTimeout(delayedCheck, devops.pollingIntervalMs, devops, envName, options, dateStart);
        } else {
            let secondsSince = (new Date() - dateStart) / 1000;
            reportPromotionActiveStatus(results, outputFormat, secondsSince);
        }
    };

    const reportPromotionActiveStatus = function(results, format, secondsSince) {
        if (format === 'table') {
            if (_.isNumber(secondsSince)) {
                consoleLogger.info(`${secondsSince} seconds since command ran`);
            }
            results.unshift(["Environment", "Network", "Activation Id", "Status"]);
            consoleLogger.info("Activation status report:");
            consoleLogger.info(AsciiTable.table(results, 40));
        } else {
            let keyNames = ['environment', 'network', 'activationId', "status"];
            results = {
                message: "Activation status report",
                data: _.map(results, res => {
                    return _.object(keyNames, res);
                })
            };
            if (_.isNumber(secondsSince)) {
                results.durationSeconds = secondsSince;
            }
            consoleLogger.info(helpers.jsonStringify(results));
        }
    };

    const reportNoPromotionPending = function(data, envName, format, didWait) {
        let promotionStatus = data.promotionStatus;
        let results = [
            [envName, "staging", fallbackValue(promotionStatus.activeInStagingVersion, "No version is active")],
            [envName, "production", fallbackValue(promotionStatus.activeInProductionVersion, "No version is active")],
        ];
        if (format === 'table') {
            if (didWait) {
                consoleLogger.info(`'wait' option unnecessary.  Most likely the promotion was already checked on.`);
            }
            consoleLogger.info(`There is currently no promotion pending.`);
            consoleLogger.info(`Current activation status of '${envName}' environment by network:`);
            results.unshift(["Environment", "Network", "Active Version"]);
            consoleLogger.info(AsciiTable.table(results, 40));
        } else {
            let keyNames = ['environment', 'network', 'status'];
            results = {
                message: `There is currently no promotion pending. Current activation status of '${envName}' environment by network:`,
                data: _.map(results, res => {
                    return _.object(keyNames, res);
                })
            };
            consoleLogger.info(helpers.jsonStringify(results));
        }
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
            let items = data.edgeHostnames.items;
            if (devops.devopsSettings.outputFormat === 'table') {
                data = _.map(items, function(eh) {
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
            } else {
                consoleLogger.info(helpers.jsonStringify(items));
            }
        });
    };

    let actionCalled;
    let argumentsUsed;
    let verbose = false;
    const commander = new DevOpsCommand("akamai pl", consoleLogger);
    commander
        .version(version)
        .description("Akamai Pipeline. " +
            "The command assumes that your current working directory is the pipeline space under which all pipelines reside")
        .option('-v, --verbose', 'Verbose output, show logging on stdout')
        .option('-s, --section [section]', 'Section name representing Client ID in .edgerc file, defaults to "credentials"')
        .option('-f, --format [format]', "Select output format, allowed values are 'json' or 'table'")
        .option('--record-to-file <filename>', 'Record REST communication to file')
        .option('--record-errors', 'Also record error responses')
        .option('--replay-from-file <filename>', 'Use record file to replay REST communication. Used for offline testing');

    commander
        .command("new-pipeline [environments...]", "Create a new pipeline with provided attributes. " +
            "This will also create one property for each environment.")
        .option('--retry', 'Assuming command failed last time during execution. Try to continue where it left off.')
        .option('--dry-run', 'Just parse the parameters and print out the json generated that would normally call the create pipeline funtion.')
        .option('-p, --pipeline <pipelineName>', 'Pipeline name')
        .option('-g, --groupIds [groupIds]', "Group IDs, optional if -e propertyId/Name is used. " +
            "Provide one groupId if all environments are expected in that same group. If each environment needs to be in " +
            "its own group, provide the same number of groupIds as environments by using multiple -g options.", helpers.repeatable(helpers.parseGroupId), [])
        .option('-c, --contractId [contractId]', "Contract ID, optional if -e propertyId/Name is used", helpers.prefixeableString('ctr_'))
        .option('-d, --productId [productId]', "Product ID, optional if -e propertyId/Name is used", helpers.prefixeableString('prd_'))
        .option('-e, --propertyId [propertyId]', "Use existing property as blue print for pipeline templates. " +
            "Either pass property ID or exact property name. Akamai PD will lookup account information like group id, " +
            "contract id and product id of the existing property and use the information for creating pipeline properties")
        .option('-n, --version [version]', "Specify version of property, if omitted, use latest", helpers.parsePropertyVersion)
        .option('--secure', "Make new pipeline secure, all environment properties are going to be secure")
        .option('--insecure', "Make all environment properties not secure")
        .alias("np")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = createPipeline
        });

    commander
        .command("set-default", "Set the default pipeline and or the default section name from .edgerc")
        .option('-p, --pipeline <pipelineName>', 'Set default pipeline name')
        .option('-s, --section <section>', 'Set default section name from edgerc file')
        .option('-f, --format <format>', "Select output format, allowed values are 'json' or 'table' foobar bo")
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
        .command("merge <environment>", "Merge template json and variable values into a PM/PAPI ruletree JSON document, " +
            "stored in dist folder in the current pipeline folder")
        .option('-p, --pipeline [pipelineName]', 'Pipeline name')
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
        .command("set-prefixes <useprefix>", "Set or unset use of prefixes for current user credentials and setup")
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
        .command("show-ruletree <environment>", "Fetch latest version of property rule tree for provided environment")
        .option('-p, --pipeline [pipelineName]', 'pipeline name')
        .alias("sr")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = showRuletree
        });

    commander
        .command("save <environment>", "Save rule tree and hostnames for provided environment. " +
            "Edge hostnames are also created if needed.")
        .option('-p, --pipeline [pipelineName]', 'pipeline name')
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
        .option('-p, --pipeline [pipelineName]', 'pipeline name')
        .alias("lstat")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = listStatus
        });

    commander
        .command("promote [targetEnvironment]",
            "Promote (activate) an environment. This command also executes the merge and save commands mentioned above by default.")
        .option('-p, --pipeline [pipelineName]', 'pipeline name')
        .option('-n, --network <network>', "Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'")
        .option('-e, --emails [emails]', "Comma separated list of email addresses. Optional if default emails were previously set with set-default")
        .option('-m, --message [message]', "Promotion message passed to activation backend")
        .option('-w, --wait-for-activate', "Return after promotion of an environment is active.")
        .option('--force', "Force promotion if previous environment aren't promoted or even saved.")
        .alias("pm")
        .action(function(...args) {
            argumentsUsed = args;
            actionCalled = promote
        });

    commander
        .command("check-promotion-status <environment>", "Check status of promotion (activation) of an environment.")
        .option('-p, --pipeline [pipelineName]', 'pipeline name')
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