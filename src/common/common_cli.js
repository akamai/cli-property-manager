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


//used for table formatted output
const AsciiTable = require('ascii-data-table').default;
const _ = require('underscore');

const errors = require('../errors');
const helpers = require('../helpers');
const Utils = require('../utils');
const STAGING = new Set(['S', 'ST', 'STAG', 'STAGING']);
const PROD = new Set(['P', 'PR', 'PROD', 'PRODUCTION']);


class CommonCli {



    constructor(argv, env, overrideFactory, overrideReporter, consoleLogger, reportLabel, reportError, verbose) {
        this.cmdArgs = argv;
        this.procEnv = process.env;
        this.overrideDevopsFactoryFunction = overrideFactory;
        this.overrideErrorReporter = overrideReporter;
        this.consoleLogger = consoleLogger;
        this.reportLabel = reportLabel;
        this.reportError = reportError;
        this.verbose = verbose;
    }

    /**
     * Set or unset prefixes for it types.
     * @type {Function}
     */
    setPrefixes(devops, useprefix) {
        if (!(useprefix === 'true' || useprefix === 'false')) {
            throw new errors.ArgumentError("Only 'true' or 'false' are allowed as arguments", "illegal_format");
        }
        let prefix = (useprefix === 'true');
        return devops.setPrefixes(prefix).then(data => {
            this.consoleLogger.info(helpers.jsonStringify(data));
        });
    }

    setRuleFormat(devops, ruleformat) {
        return devops.setRuleFormat(ruleformat).then(data => {
            this.consoleLogger.info(helpers.jsonStringify(data));
        });
    }


    /**
     * list contracts user has access to (user who the client id belongs to)
     * @type {Function}
     */
    listContracts(devops) {
        return devops.listContracts().then(data => {
            let contracts = data["contracts"]["items"];
            if (devops.devopsSettings.outputFormat === 'table') {
                contracts = _.map(contracts, function(ctr) {
                    return [ctr["contractId"], ctr["contractTypeName"]];

                });
                contracts.unshift(["Contract ID", "Contract Type Name"]);
                this.consoleLogger.info(AsciiTable.table(contracts, 50));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(contracts));
            }
        });
    }

    /**
     * list products for a specific contract ID
     * @type {Function}
     */
    listProducts(devops, options) {
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
                this.consoleLogger.info(AsciiTable.table(products, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(products));
            }
        });
    }

    /**
     * list groups user has access to
     * @type {Function}
     */
    listGroups(devops) {
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
                this.consoleLogger.info(AsciiTable.table(groups, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(groups));
            }
        });
    }

    checkPropertyIdAndPropertyVersion(propertyId, version) {
        let propertyInfo = {};

        if (_.isString(propertyId)) {
            if (propertyId.startsWith("prp_")) {
                propertyInfo.propertyId = propertyId.slice("prp_".length);
                propertyInfo.propertyId = helpers.parseInteger(propertyInfo.propertyId);
                if (_.isNaN(propertyInfo.propertyId)) {
                    propertyInfo.propertyId = undefined;
                    propertyInfo.propertyName = propertyId
                }
            } else {
                propertyInfo.propertyId = helpers.parseInteger(propertyId);
                if (_.isNaN(propertyInfo.propertyId)) {
                    propertyInfo.propertyId = undefined;
                    propertyInfo.propertyName = propertyId
                }
            }
            if (_.isNumber(version)) {
                propertyInfo.propertyVersion = version;
            }
        } else if (_.isBoolean(propertyId)) {
            throw new errors.ArgumentError("No property ID or name provided with -e option.",
                "missing_property_id");
        } else {
            if (_.isNumber(version)) {
                throw new errors.ArgumentError("Version without propertyId provided. Also need property ID.",
                    "missing_property_id");
            }
        }
        return propertyInfo;
    }

    /**
     * list cpcodes under a given contract and group
     * @type {Function}
     */
    listCpcodes(devops, options) {
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
                this.consoleLogger.info(AsciiTable.table(cpcodes, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(cpcodes));
            }
        });
    }

    listProperties(devops, options) {
        let groupId = options.groupId;
        if (!(groupId && _.isNumber(groupId))) {
            throw new errors.DependencyError("groupId needs to be provided as a number", "missing_group_id");
        }

        let contractId = options.contractId;
        if (!contractId) {
            throw new errors.DependencyError("contractId needs to be provided", "missing_contract_id");
        }

        return devops.listProperties(contractId, groupId).then(data => {
            let properties = data["properties"]["items"];
            if (!properties) {
                properties = [];
            }
            if (devops.devopsSettings.outputFormat === 'table') {
                properties = _.map(properties, function(property) {
                    return [
                        property["accountId"],
                        property["contractId"],
                        property["groupId"],
                        property["propertyName"],
                        property["propertyId"],
                        property["assetId"],
                        property["productionVersion"],
                        property["latestVersion"],
                        property["stagingVersion"],
                    ];
                });
                properties.unshift(["Account Id", "Contract Id", "Group Id", "Property Name", "Property Id", "Asset Id", "Production Version", "Latest Version", "Staging Version"]);
                this.consoleLogger.info(AsciiTable.table(properties, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(properties));
            }
        });
    }

    async listPropertyHostnames(devops, options) {
        let propertyInfo = this.checkPropertyIdAndPropertyVersion(options.property, parseInt(options.propver, 10));
        let validate = true;
        if (_.isBoolean(options.validate)) {
            validate = options.validate;
        }
        return devops.listPropertyHostnames(propertyInfo, validate).then(data => {
            let hostnames = data["hostnames"]["items"];
            if (!hostnames) {
                hostnames = [];
            }
            if (options.file) {
                let utils = new Utils();
                utils.writeJsonFile(options.file, hostnames);
                this.consoleLogger.info("output saved to file: " + options.file);
            }
            if (devops.devopsSettings.outputFormat === 'table') {
                hostnames = _.map(hostnames, function(hostname) {
                    if (!hostname["edgeHostnameId"]) {
                        hostname["edgeHostnameId"] = null;
                    }
                    return [
                        hostname["cnameTo"],
                        hostname["cnameFrom"],
                        hostname["edgeHostnameId"],
                        hostname["cnameType"]
                    ];
                });
                hostnames.unshift(["Cname To", "Cname From", "Edge hostname ID", "Cname Type"]);
                this.consoleLogger.info(AsciiTable.table(hostnames, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(hostnames));
            }
        });
    }

    listEdgeHostnames(devops, options) {
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
                this.consoleLogger.info(res);
            } else {
                this.consoleLogger.info(helpers.jsonStringify(items));
            }
        });
    }

    async listPropertyVariables(devops, options) {
        let propertyInfo = this.checkPropertyIdAndPropertyVersion(options.property, parseInt(options.propver, 10));

        return devops.getPropertyRules(propertyInfo).then(data => {
            let variables = data["rules"]["variables"];
            if (!variables) {
                variables = [];
            }
            if (options.file) {
                let utils = new Utils();
                utils.writeJsonFile(options.file, variables);
                this.consoleLogger.info("output saved to file: " + options.file);
            }
            if (devops.devopsSettings.outputFormat === 'table') {
                variables = _.map(variables, function(variable) {
                    return [
                        variable["name"],
                        variable["value"],
                        variable["description"],
                        variable["hidden"],
                        variable["sensitive"]
                    ];
                });
                variables.unshift(["Name", "Value", "Description", "Hidden", "Sensitive"]);
                this.consoleLogger.info(AsciiTable.table(variables, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(variables));
            }
        });
    }

    async listPropertyRuleformat(devops, options) {
        let propertyInfo = this.checkPropertyIdAndPropertyVersion(options.property, parseInt(options.propver, 10));

        return devops.getPropertyRules(propertyInfo).then(data => {
            let ruleFormat = data["ruleFormat"];
            if (!ruleFormat) {
                ruleFormat = [];
            }
            if (options.file) {
                let utils = new Utils();
                utils.writeJsonFile(options.file, ruleFormat);
                this.consoleLogger.info("output saved to file: " + options.file);
            }
            this.consoleLogger.info(helpers.jsonStringify(ruleFormat));
        });
    }

    listRuleFormats(devops) {
        return devops.listRuleFormats().then(data => {
            let ruleFormats = data["ruleFormats"]["items"];
            if (!ruleFormats) {
                ruleFormats = [];
            }
            if (devops.devopsSettings.outputFormat === 'table') {
                ruleFormats = _.map(ruleFormats, function(ruleFormat) {
                    return [ruleFormat];
                });
                ruleFormats.unshift(["Rule Formats"]);
                this.consoleLogger.info(AsciiTable.table(ruleFormats, 30));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(ruleFormats));
            }
        });
    }

    reportActionErrors(data) {
        if (helpers.isArrayWithData(data.validationWarnings)) {
            this.consoleLogger.warn('There are validation warnings: \n', helpers.jsonStringify(data.validationWarnings));
        }
        if (helpers.isArrayWithData(data.validationErrors)) {
            this.consoleLogger.error('There are validation errors: \n', helpers.jsonStringify(data.validationErrors));
        }
        if (helpers.isArrayWithData(data.hostnameWarnings)) {
            this.consoleLogger.warn('There are hostname warnings: \n', helpers.jsonStringify(data.hostnameWarnings));
        }
        if (helpers.isArrayWithData(data.hostnameErrors)) {
            this.consoleLogger.error('There are hostname errors: \n', helpers.jsonStringify(data.hostnameErrors));
        }
    }

    /**
     * Extract and check the network name. Allow for partial names and lower case letters.
     * @param options
     * @return {string}
     */
    checkNetworkName(options) {
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
    }

    fallbackValue(value, fallback) {
        return (value === null || value === undefined) ? fallback : value;
    }

    async delayedCheck(devops, envName, options, dateStart) {
        let resultObject = await this.checkPromotionsLogic(devops, envName, options, dateStart);
        this.reportOrWait(resultObject);
    }

    async checkActivations(devops, envName, options) {
        //checkPromotionsLogic has logic to report if not waiting
        let resultObject = await this.checkPromotionsLogic(devops, envName, options);
        if (resultObject.error) {
            this.reportError(resultObject.error, this.verbose);
            return;
        }
        if (options.waitForActivate) {
            let dateStart = new Date();
            resultObject.dateStart = dateStart;
            return this.reportOrWait(resultObject)
        }
        return resultObject;
    }


    async checkPropertyActivations(devops, propertyId, activationId, network) {
        //checkActivationsLogic has logic to report if not waiting
        let resultObject = await this.checkActivationsLogic(devops, propertyId, activationId, network);
        if (resultObject.error) {
            this.reportError(resultObject.error, this.verbose);
            return;
        }
        let dateStart = new Date();
        resultObject.dateStart = dateStart;
        return this.reportUntilActive(resultObject);
    }

    async checkActivationsLogic(devops, propertyId, activationId, network, dateStart) {
        //Mostly intact 'non-waiting' check and report logic from before
        try {
            let data = await devops.checkActivations(propertyId, activationId);
            let results = [];
            if (data.activationType === "DEACTIVATE" && data.status === "ACTIVE") {
                results.push([propertyId, network, data.activationId, "DEACTIVATED"]);
            } else {
                results.push([propertyId, network, data.activationId, data.status]);
            }
            return {
                results,
                data,
                devops,
                dateStart
            };
        } catch (error) {
            return {
                error,
                devops,
            };
        }
    }

    reportUntilActive(resultObject) {
        let results = resultObject.results,
            devops = resultObject.devops,
            dateStart = resultObject.dateStart,
            data = resultObject.data,
            error = resultObject.error;
        let outputFormat = devops.devopsSettings.outputFormat;
        if (error) {
            this.reportError(error, this.verbose);
        } else if (results && results.length === 0) {
            this.reportNoPromotionPending(data, results.propertyId, outputFormat, true);
        } else if (this.isActivationPending(results[0][3], outputFormat === 'table')) {
            if (outputFormat === 'table') {
                this.consoleLogger.info("...Waiting for active status..."); //we don't want to confused json parsers with text output
                this.consoleLogger.info(`...Checking ${this.reportLabel.activationLabel}s...`);
            }
            setTimeout(this.delayedActivationCheck.bind(this), devops.pollingIntervalMs, devops, results[0][0], results[0][2], results[0][1], dateStart);
        } else {
            let secondsSince = (new Date() - dateStart) / 1000;
            this.reportPromotionActiveStatus(results, outputFormat, secondsSince);
        }
    }

    async delayedActivationCheck(devops, propertyId, activationId, network, dateStart) {
        let resultObject = await this.checkActivationsLogic(devops, propertyId, activationId, network, dateStart);
        this.reportUntilActive(resultObject);
    }


    async checkSnippetsActivateLogic(devops, options, dateStart) {
        return this.checkPromotionsLogic(devops, devops.extractProjectName(options), options, dateStart);
    }


    async checkPromotionsLogic(devops, envName, options, dateStart) {
        //Mostly intact 'non-waiting' check and report logic from before
        try {
            let data = await devops.checkPromotions(devops.extractProjectName(options), envName);
            let results = _.map(data.promotionUpdates, function(activation, network) {
                if (activation.activationType === "DEACTIVATE" && activation.status === "ACTIVE") {
                    return [envName, network, activation.activationId, "DEACTIVATED"];
                }
                return [envName, network, activation.activationId, activation.status];
            });
            if (!options.waitForActivate) {
                if (results.length > 0) {
                    this.reportPromotionActiveStatus(results, devops.devopsSettings.outputFormat);
                } else {
                    this.reportNoPromotionPending(data, envName, devops.devopsSettings.outputFormat);
                }
            }
            return {
                results,
                data,
                devops,
                envName,
                dateStart,
                options,
            };
        } catch (error) {
            return {
                error,
                devops,
            };
        }
    }

    reportOrWait(resultObject) {
        let results = resultObject.results,
            devops = resultObject.devops,
            envName = resultObject.envName,
            options = resultObject.options,
            dateStart = resultObject.dateStart,
            data = resultObject.data,
            error = resultObject.error;
        let outputFormat = devops.devopsSettings.outputFormat;
        if (error) {
            this.reportError(error, this.verbose);
        } else if (results && results.length === 0) {
            this.reportNoPromotionPending(data, envName, outputFormat, true);
        } else if (this.isActivationPending(results[0][3], outputFormat === 'table')) {
            if (outputFormat === 'table') {
                this.consoleLogger.info("...Waiting for active status..."); //we don't want to confused json parsers with text output
                this.consoleLogger.info(`...Checking ${this.reportLabel.activationLabel}s...`);
            }
            setTimeout(this.delayedCheck.bind(this), devops.pollingIntervalMs, devops, envName, options, dateStart);
        } else {
            let secondsSince = (new Date() - dateStart) / 1000;
            this.reportPromotionActiveStatus(results, outputFormat, secondsSince);
        }
    }

    reportPromotionActiveStatus(results, format, secondsSince) {
        if (format === 'table') {
            if (_.isNumber(secondsSince)) {
                this.consoleLogger.info(`${secondsSince} seconds since command ran`);
            }
            results.unshift([this.reportLabel.table, "Network", "Activation Id", "Status"]);
            this.consoleLogger.info("Activation status report:");
            this.consoleLogger.info(AsciiTable.table(results, 40));
        } else {
            let keyNames = [this.reportLabel.json, 'network', 'activationId', "status"];
            results = {
                message: "Activation status report",
                data: _.map(results, res => {
                    return _.object(keyNames, res);
                })
            };
            if (_.isNumber(secondsSince)) {
                results.durationSeconds = secondsSince;
            }
            this.consoleLogger.info(helpers.jsonStringify(results));
        }
    }

    reportNoPromotionPending(data, envName, format, didWait) {
        let promotionStatus = data.promotionStatus;
        let results = [
            [envName, "staging", this.fallbackValue(promotionStatus.activeInStagingVersion, "No version is active")],
            [envName, "production", this.fallbackValue(promotionStatus.activeInProductionVersion, "No version is active")],
        ];
        if (format === 'table') {
            if (didWait) {
                this.consoleLogger.info(`'wait' option unnecessary.  Most likely the ${this.reportLabel.activationLabel} was already checked on.`);
            }
            this.consoleLogger.info(`There is currently no ${this.reportLabel.activationLabel} pending.`);
            this.consoleLogger.info(`Current activation status of '${envName}' by network:`);
            results.unshift([this.reportLabel.table, "Network", "Active Version"]);
            this.consoleLogger.info(AsciiTable.table(results, 40));
        } else {
            let keyNames = [this.reportLabel.json, 'network', 'status'];
            results = {
                message: `There is currently no activation pending. Current activation status of '${envName}' by network:`,
                data: _.map(results, res => {
                    return _.object(keyNames, res);
                })
            };
            this.consoleLogger.info(helpers.jsonStringify(results));
        }
    }


    isActivationPending(status, logStatus) {
        if (status === "PENDING" || status === "ZONE_1" || status === "ZONE_2" ||
            status === "ZONE_3" || status === "NEW" || status === "PENDING_DEACTIVATION" ||
            status === "PENDING_CANCELLATION") {
            if (logStatus) {
                this.consoleLogger.info(`...activation status is ${status}...`);
            }
            return true;
        }
        return false;
    }
    renderOutput(columnNames, keysNames, values, format) {
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
        this.consoleLogger.info(output)
    }

    showDefaults(devops) {
        let settings = devops.devopsSettings;
        let savedSettings = settings.__savedSettings || {};
        let values = [
            _.isObject(savedSettings.edgeGridConfig) ? savedSettings.edgeGridConfig.section : undefined,
            savedSettings.defaultProject,
            _.isArray(savedSettings.emails) ? savedSettings.emails.join(", ") : undefined,
            savedSettings.outputFormat,
            savedSettings.accountSwitchKey
        ];
        let columnNames = ["Option Name", "Value"];
        let keys = ["section", "defaultProject", "emails", "format", "accountSwitchKey"];
        this.renderOutput(columnNames, keys, values, settings.outputFormat);
    }

    /**
     * find properties
     * @type {Function}
     */
    search(devops, name) {
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
                this.consoleLogger.info(AsciiTable.table(versions, 60));
            } else {
                this.consoleLogger.info(helpers.jsonStringify(versions));
            }
        });
    }

    printAllowedModes() {
        let allowedModes = helpers.allowedModes;
        return `'${allowedModes.slice(0, allowedModes.length - 1).join(`', '`)}', and '${allowedModes.slice(-1)}'`;
    }

    printAllowedModesUpdateOrImport() {
        let allowedModesImportUpdateLocal = helpers.allowedModesImportUpdateLocal;
        return `'${allowedModesImportUpdateLocal.slice(0, allowedModesImportUpdateLocal.length - 1).join(`', '`)}' and '${allowedModesImportUpdateLocal.slice(-1)}'`;
    }

    checkVariableModeOptions(mode) {
        let allowedModes = helpers.allowedModes;
        const allowedVarModes = new Set(allowedModes);
        return allowedVarModes.has(mode);
    }
    checkVariableModeOptionsImportUpdateLocal(mode) {
        let allowedModesImportUpdateLocal = helpers.allowedModesImportUpdateLocal;
        const allowedVarModes = new Set(allowedModesImportUpdateLocal);
        return allowedVarModes.has(mode);
    }

    handleNotes(options) {
        if (options.message && options.note) {
            throw new errors.ArgumentError("Cannot use both --message/-m and --note together. --note is an alias of --message", "redundant_options");
        } else if (!options.message && options.note) {
            options.message = options.note;
        }
    }

}
module.exports = CommonCli;