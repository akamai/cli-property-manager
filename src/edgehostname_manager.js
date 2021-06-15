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

const helpers = require('./helpers');
const logger = require("./logging")
    .createLogger("devops-prov.edgehostname-manager");
const errors = require("./errors");

const EdgeDomains = {
    EDGE_SUITE: ".edgesuite.net",
    EDGE_KEY: ".edgekey.net"
};
/**
 * Manages creation and lookup of Edgehostnames.
 * This class is considered private and isn't exported.
 *
 */
class EdgeHostnameManager {
    constructor(environment) {
        this.project = environment.project;
        this.projectInfo = this.project.getProjectInfo();
        this.environment = environment;
        this.papi = environment.getPAPI();
        this.hostnamesCreated = [];
        this.hostnamesFound = [];
        this.errors = [];
        this.existingEdgehostnames = null;
    }

    /**
     * extracts edge hostname ID out of a create edge hostname response object.
     **/
    static _extractEdgeHostnameId(item) {
        let edgeHostnameLink = item.edgeHostnameLink;
        let edgeHostnameRegex = /\/papi\/v[0-1]\/edgehostnames\/(ehn_)?(\d+)\?.*/;
        let results = edgeHostnameRegex.exec(edgeHostnameLink);
        logger.info("results: ", results);
        return parseInt(results[2]);
    }
    /**
     * create hostnames associated with property hostnames
     * @returns {Promise.<void>}
     */
    async createEdgeHostnames(hostnames) {
        let envInfo = this.environment.getEnvironmentInfo();
        for (let hostname of hostnames) {
            try {
                if (hostname.edgeHostnameId) {
                    logger.info(`cnameId for '${hostname.cnameFrom}' is already set to: ${hostname.edgeHostnameId}`);
                    continue;
                } else if (hostname.certProvisioningType === "DEFAULT" && !hostname.certEnrollmentId) {
                    logger.info(`certProvisioningType is '${hostname.certProvisioningType}', '${hostname.cnameFrom}'`);
                    continue;
                } else {
                    await this.createEdgeHostname(hostname, envInfo)
                }
            } catch (error) {
                this.errors.push(error);
            }
        }
        if (this.hostnamesCreated.length > 0 || this.hostnamesFound.length > 0) {
            //we found or created edgehostnames, so let's write the edgehostname ids to disk
            this.environment.storeHostnames(hostnames);
        }
        envInfo.lastSaveHostnameErrors = this.errors;
        delete envInfo['latestVersionInfo']['etag'];
        this.environment.storeEnvironmentInfo(envInfo);
        return {
            hostnamesCreated: this.hostnamesCreated,
            hostnamesFound: this.hostnamesFound,
            errors: this.errors
        };
    }

    async createEdgeHostname(hostname, envInfo) {
        if (hostname.cnameTo === null) {
            this.errors.push({
                message: `hostname.cnameTo can not be set to null`,
                messageId: "null_hostname_cnameTo",
                edgehostname: null
            });
            return;
        }

        if (!_.isObject(this.existingEdgehostnames)) {
            this.existingEdgehostnames = {};
            let edgehostnames = await this.papi.listEdgeHostnames(this.projectInfo.contractId, envInfo.groupId);
            for (let item of edgehostnames.edgeHostnames.items) {
                this.existingEdgehostnames[item.edgeHostnameDomain] = item;
            }
        }

        let foundEdgehostname = this.existingEdgehostnames[hostname.cnameTo];
        if (_.isObject(foundEdgehostname)) {
            // if the ipVersionBehavior is updated, create a new hostname with this ipVersionBehavior
            if (_.isString(hostname.ipVersionBehavior) && hostname.ipVersionBehavior !== foundEdgehostname.ipVersionBehavior) {
                this.errors.push({
                    message: `Hostname with cnameTo: ${hostname.cnameTo} and ipVersionBehavior: ${foundEdgehostname.ipVersionBehavior} exists. ` +
                        `Must use a different cnameTo for creating a new hostname with ipVersionBehavior: ${hostname.ipVersionBehavior}`,
                    messageId: "hostname_exists",
                    edgehostname: hostname.cnameTo
                });
                return;
            } else {
                hostname.edgeHostnameId = helpers.parseEdgehostnameId(foundEdgehostname.edgeHostnameId);
                hostname.ipVersionBehavior = foundEdgehostname.ipVersionBehavior;
                this.hostnamesFound.push({
                    name: hostname.cnameTo,
                    id: hostname.edgeHostnameId
                });
                return;
            }
        }
        let edgeDomain;
        let createReq = {
            productId: this.projectInfo.productId
        };

        createReq.ipVersionBehavior = helpers.parseIpVersionBehavior(hostname.ipVersionBehavior);

        if (hostname.cnameTo.endsWith(EdgeDomains.EDGE_SUITE)) {
            edgeDomain = "edgesuite.net";
        } else if (hostname.cnameTo.endsWith(EdgeDomains.EDGE_KEY)) {
            if (!hostname.certEnrollmentId) {
                this.errors.push({
                    message: `Need 'certEnrollmentId' of hostname in order to create secure edge hostname`,
                    messageId: "missing_certEnrollmentId",
                    edgehostname: hostname.cnameTo
                });
                return;
            }
            edgeDomain = "edgekey.net";
            createReq.secure = true;
            createReq.certEnrollmentId = hostname.certEnrollmentId
        } else {
            this.errors.push({
                message: `'${hostname.cnameTo}' is not a supported edge hostname for creation, only edge hostnames under 'edgesuite.net' or 'edgekey.net' domains can be created. Please create manually`,
                messageId: "unsupported_edgehostname",
                edgehostname: hostname.cnameTo
            });
            return;
        }
        let prefix = hostname.cnameTo.slice(0, hostname.cnameTo.length - (edgeDomain.length + 1));
        createReq.domainPrefix = prefix;
        createReq.domainSuffix = edgeDomain //TODO: allow creation of other domains as well.

        let result = await this.papi.createEdgeHostname(this.projectInfo.contractId, envInfo.groupId, createReq);
        logger.info("Got create edgehostname result:", result);
        hostname.edgeHostnameId = EdgeHostnameManager._extractEdgeHostnameId(result);
        this.hostnamesCreated.push({
            name: hostname.cnameTo,
            id: hostname.edgeHostnameId
        });
    }

    cleanHostnameIds(hostnames) {
        logger.debug("cleaning hostname ids");
        if (!_.isArray(hostnames)) {
            throw new errors.ArgumentError("Hostnames is not an array", "not_hostnames_array");
        }

        for (let hostname of hostnames) {
            if (hostname.edgeHostnameId !== undefined) {
                hostname.edgeHostnameId = helpers.parseEdgehostnameId(hostname.edgeHostnameId);
            }
        }
        return hostnames;
    }
}
module.exports = {
    EdgeHostnameManager,
    EdgeDomains
};