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


const _ = require('underscore');

/*
 * activation type used as a parameter in activateProperty
 */
const ActivationType = require('./enums/ActivationType');

/**
 * PAPI REST client
 */
class PAPI {
    constructor(openClient) {
        this.openClient = openClient;
    }

    findProperty(name) {
        let searchBody = {
            "propertyName": name
        };

        return this.openClient.post('/papi/v1/search/find-by-value', searchBody);
    }

    createProperty(name, productId, contractId, groupId, ruleFormat, propertyId, propertyVersion, copyHostnames = false) {
        let url = `/papi/v1/properties?groupId=${groupId}&contractId=${contractId}`;
        let body = {
            "productId": productId,
            "propertyName": name,
        };
        if (_.isString(ruleFormat)) {
            body.ruleFormat = ruleFormat;
        }
        if (_.isNumber(propertyId) && _.isNumber(propertyVersion)) {
            body.cloneFrom = {
                "propertyId": propertyId,
                "version": propertyVersion,
                "copyHostnames": copyHostnames
            };
        }
        return this.openClient.post(url, body);
    }

    deleteProperty(propertyId, contractId, groupId, message) {
        let url = `/papi/v1/properties/${propertyId}?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.delete(url, {
            message
        });
    }

    createNewPropertyVersion(propertyId, createFromVersion) {
        let postBody = {
            createFromVersion
        };
        let url = `/papi/v1/properties/${propertyId}/versions/`;
        return this.openClient.post(url, postBody);
    }

    latestPropertyVersion(propertyId, network) {
        let url;
        if (network) {
            url = `/papi/v1/properties/${propertyId}/versions/latest?activatedOn=${network}`;
        } else {
            url = `/papi/v1/properties/${propertyId}/versions/latest`;
        }
        return this.openClient.get(url);
    }

    getPropertyVersion(propertyId, versionId) {
        let url = `/papi/v1/properties/${propertyId}/versions/${versionId}`;
        return this.openClient.get(url);
    }

    setRuleFormat(ruleFormat) {
        let clientSettings = {
            "ruleFormat": ruleFormat,
        };
        return this.setClientSettings(clientSettings);
    }

    /**
     * Set or unset PAPI id prefixes
     * @param usePrefixes
     */
    setClientSettings(clientSettings) {
        let url = '/papi/v1/client-settings';
        return this.openClient.put(url, clientSettings);
    }

    getClientSettings() {
        let url = '/papi/v1/client-settings';
        return this.openClient.get(url);
    }

    listProducts(contractId) {
        return this.openClient.get(`/papi/v1/products?contractId=${contractId}`);
    }

    listContracts() {
        return this.openClient.get('/papi/v1/contracts');
    }

    listGroups() {
        return this.openClient.get('/papi/v1/groups');
    }

    getPropertyVersionRules(propertyId, propertyVersion, ruleFormat) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/rules`;
        let headers = {};
        if (_.isString(ruleFormat)) {
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.get(url, headers);
    }

    storePropertyVersionRules(propertyId, propertyVersion, rules, ruleFormat) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/rules`;
        let headers = {
            'Content-Type': "application/json"
        };
        if (_.isString(ruleFormat)) {
            headers["Content-Type"] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.put(url, rules, headers);
    }

    validatePropertyVersionRules(propertyId, propertyVersion, rules, ruleFormat) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/rules?dryRun=true`;
        let headers = {
            'Content-Type': "application/json"
        };
        if (_.isString(ruleFormat)) {
            headers["Content-Type"] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;

        }
        return this.openClient.put(url, rules, headers);
    }

    getPropertyVersionHostnames(propertyId, propertyVersion, includeCertStatus = true) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/hostnames?includeCertStatus=${includeCertStatus}`;
        return this.openClient.get(url);
    }

    storePropertyVersionHostnames(propertyId, propertyVersion, hostnames, contractId, groupId, includeCertStatus = true) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/hostnames?contractId=${contractId}&groupId=${groupId}&includeCertStatus=${includeCertStatus}`;
        return this.openClient.put(url, hostnames);
    }

    patchPropertyVersionHostnames(propertyId, propertyVersion, hostnames, contractId, groupId, includeCertStatus = true) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/hostnames?contractId=${contractId}&groupId=${groupId}&includeCertStatus=${includeCertStatus}`;
        return this.openClient.patch(url, hostnames);
    }

    listCpcodes(contractId, groupId) {
        let url = `/papi/v1/cpcodes?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.get(url);
    }

    listEdgeHostnames(contractId, groupId) {
        let url = `/papi/v1/edgehostnames/?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.get(url);
    }

    listProperties(contractId, groupId) {
        let url = `/papi/v1/properties/?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.get(url);
    }

    listPropertyHostnames(propertyId, propertyVersion, contractId, groupId, validateHostnames, includeCertStatus = true) {
        let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/hostnames?contractId=${contractId}&groupId=${groupId}&validateHostnames=${validateHostnames}&includeCertStatus=${includeCertStatus}`;
        return this.openClient.get(url);
    }

    createEdgeHostname(contractId, groupId, createRequestBody) {
        let url = `/papi/v1/edgehostnames/?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.post(url, createRequestBody);
    }

    activateProperty(propertyId, propertyVersion, network, notifyEmails, message, activationType = ActivationType.ACTIVATE) {
        const url = `/papi/v1/properties/${propertyId}/activations`;
        const acknowledgeAllWarnings = true;
        const complianceRecord = {
            noncomplianceReason: "NO_PRODUCTION_TRAFFIC"
        };
        const note = message || "Property Manager CLI Activation";
        return this.openClient.post(url, {
            propertyVersion,
            network,
            note,
            notifyEmails,
            acknowledgeAllWarnings,
            activationType,
            complianceRecord
        });
    }

    propertyActivateStatus(propertyId) {
        const url = `/papi/v1/properties/${propertyId}/activations`;
        return this.openClient.get(url);
    }

    activationStatus(propertyId, activationId) {
        let url = `/papi/v1/properties/${propertyId}/activations/${activationId}`;
        return this.openClient.get(url);
    }

    listRuleFormats() {
        let url = `/papi/v1/rule-formats`;
        return this.openClient.get(url);
    }

    getPropertyInfo(propertyId) {
        let url = `/papi/v1/properties/${propertyId}`;
        return this.openClient.get(url);
    }

    createCpcode(contractId, groupId, cpcodeName, productId) {
        let url = `/papi/v1/cpcodes?contractId=${contractId}&groupId=${groupId}`;
        return this.openClient.post(url, {
            cpcodeName,
            productId
        });
    }
    // Calls to the pipeline backend (pm-pipeline). Calls to papi/cli/* -> pm-pipeline/*

    // POST /papi/cli/v1/legacy-pipelines - initial upload
    initialPipelineUpload(syntaxVersion, projectInfo, environments) {
        const url = `/papi/cli/v1/legacy-pipelines`;
        return this.openClient.post(url, {
            syntaxVersion,
            projectInfo,
            environments
        });
    }

    // GET /papi/cli/v1/pipelines - list pipelines
    listPipelines(syntaxVersion) {
        let url = `/papi/cli/v1/pipelines?syntaxVersion=${syntaxVersion}`;
        return this.openClient.get(url);
    }

    // GET /papi/cli/v1/pipelines/{pipelineId} - list specified pipeline
    getPipeline(pipelineId, syntaxVersion) {
        let url = `/papi/cli/v1/pipelines/${pipelineId}?syntaxVersion=${syntaxVersion}`;
        return this.openClient.get(url);
    }

    // DELETE /papi/cli/v1/pipelines/{pipelineId} - delete specified pipeline
    deletePipeline(pipelineId) {
        let url = `/papi/cli/v1/pipelines/${pipelineId}`;
        return this.openClient.delete(url);
    }

    // POST /papi/cli/v1/properties/${propertyId}/activations - promote latest version of property
    activateLatestVersion(propertyId, syntaxVersion, pipelineId, network, note, notifyEmails, acknowledgeWarnings,
        acknowledgeAllWarnings, activationType, fastPush, useFastFallback, ignoreHttpErrors, complianceRecord) {
        const url = `/papi/cli/v1/properties/${propertyId}/activations`;
        return this.openClient.post(url, {
            syntaxVersion,
            pipelineId,
            network,
            note,
            notifyEmails,
            acknowledgeWarnings,
            acknowledgeAllWarnings,
            activationType,
            fastPush,
            useFastFallback,
            ignoreHttpErrors,
            complianceRecord
        });
    }

    // GET /papi/cli/v1/properties/${propertyId}/hostnames - list hostnames for latest version of property
    getHostnamesOfLatestVersion(propertyId, includeCertStatus = true) {
        let url = `/papi/cli/v1/properties/${propertyId}/hostnames?includeCertStatus=${includeCertStatus}`;
        return this.openClient.get(url);
    }

    // PUT /papi/cli/v1/properties/${propertyId}/hostnames?contractId=${contractId}&groupId=${groupId} - associate hostname with the latest version of property.
    associateHostnameWithLatestVersion(propertyId, contractId, groupId, syntaxVersion, pipelineId, hostnames, includeCertStatus = true) {
        const url = `/papi/cli/v1/properties/${propertyId}/hostnames?contractId=${contractId}&groupId=${groupId}&includeCertStatus=${includeCertStatus}`;
        return this.openClient.post(url, {
            syntaxVersion,
            pipelineId,
            hostnames
        });
    }

    // GET /papi/cli/v1/properties/{propertyId}/pipeline - list specified property pipeline status including current ruletree
    getPipelineStatus(propertyId) {
        let url = `/papi/cli/v1/properties/${propertyId}/pipeline`;
        return this.openClient.get(url);
    }

    // PUT /papi/cli/v1/properties/{propertyId}/pipeline - acquire property as pipeline managed
    enablePipelineManaged(propertyId, syntaxVersion, pipelineId, ruletreeEtag, note) {
        let url = `/papi/cli/v1/properties/${propertyId}/pipeline`;
        return this.openClient.put(url, {
            syntaxVersion,
            pipelineId,
            ruletreeEtag,
            note
        });
    }


    // DELETE /papi/cli/v1/properties/{propertyId}/pipeline - release property from pipeline management
    disablePipelineManaged(propertyId, syntaxVersion, note) {
        let url = `/papi/cli/v1/properties/${propertyId}/pipeline`;
        return this.openClient.delete(url, {
            syntaxVersion,
            note
        });
    }

    // PUT /papi/cli/v1/properties/{propertyId}/rules - update property latest version rule tree.  Validate only when dryRun=true
    updateLatestVersionRules(propertyId, dryRun = false, ruleFormat, rules) {
        let url = `/papi/cli/v1/properties/${propertyId}/rules?dryRun=${dryRun}`;
        let headers = {
            'Content-Type': "application/json"
        };
        if (_.isString(ruleFormat)) {
            headers["Content-Type"] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.put(url, rules, headers);
    }

    // GET /papi/cli/v1/properties/{propertyId}/rules - get property latest version rule tree
    getLatestVersionRules(propertyId, ruleFormat) {
        let url = `/papi/cli/v1/properties/${propertyId}/rules`;
        let headers = {};
        if (_.isString(ruleFormat)) {
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.get(url, headers);
    }

    // GET /papi/cli/v1/{pipelineId}/environment-status?syntaxVersion={syntaxVersion} - get environment status of a pipeline
    getEnvironmentStatus(pipelineId, syntaxVersion) {
        let url = `/papi/cli/v1/${pipelineId}/environment-status?syntaxVersion=${syntaxVersion}`;
        return this.openClient.get(url);
    }




}

module.exports = PAPI;