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
        let edgeHostnameRegex = /\/papi\/v0\/edgehostnames\/(ehn_)?(\d+)\?.*/;
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
                }
                await this.createEdgeHostname(hostname, envInfo)
            } catch (error) {
                this.errors.push(error);
            }
        }
        if (this.hostnamesCreated.length > 0 || this.hostnamesFound.length > 0) {
            //we found or created edgehostnames, so let's write the edgehostname ids to disk
            this.environment.storeHostnames(hostnames);
        }
        envInfo.lastSaveHostnameErrors = this.errors;
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
            hostname.edgeHostnameId = helpers.parseEdgehostnameId(foundEdgehostname.edgeHostnameId);
            hostname.ipVersionBehavior = foundEdgehostname.ipVersionBehavior;
            this.hostnamesFound.push({
                name: hostname.cnameTo,
                id: hostname.edgeHostnameId
            });
            return;
        }

        //currently papi doesn't support creation of edgekey.net hostnames. So there is some dead code ahead.
        if (hostname.cnameTo.endsWith(EdgeDomains.EDGE_SUITE)) {
            let edgeDomain;
            if (hostname.cnameTo.endsWith(EdgeDomains.EDGE_SUITE)) {
                edgeDomain = "edgesuite.net";
            } else {
                edgeDomain = "edgekey.net";
            }
            let prefix = hostname.cnameTo.slice(0, hostname.cnameTo.length - (edgeDomain.length + 1));

            let createReq = {
                productId: this.projectInfo.productId,
                ipVersionBehavior: "IPV6_COMPLIANCE",
                domainPrefix: prefix,
                domainSuffix: edgeDomain //TODO: allow creation of other domains as well.
            };
            if (edgeDomain === "edgekey.net") {
                createReq.secure = true;
                if (!hostname.slotNumber) {
                    this.errors.push({
                        message: `Need 'slotNumber' of hostname in order to create secure edge hostname`,
                        messageId: "missing_slot_number",
                        edgehostname: hostname.cnameTo
                    });
                    return;
                }
                createReq.slotNumber = hostname.slotNumber;
            }
            let result = await this.papi.createEdgeHostname(this.projectInfo.contractId, envInfo.groupId, createReq);
            logger.info("Got create edgehostname result:", result);
            hostname.edgeHostnameId = EdgeHostnameManager._extractEdgeHostnameId(result);
            this.hostnamesCreated.push({
                name: hostname.cnameTo,
                id: hostname.edgeHostnameId
            });
        } else {
            this.errors.push({
                message: `'${hostname.cnameTo}' is not a supported edge hostname for creation, only edge hostnames under 'edgesuite.net' domain can be created. Please create manually`,
                messageId: "unsupported_edgehostname",
                edgehostname: hostname.cnameTo
            });
        }
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