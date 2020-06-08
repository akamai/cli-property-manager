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

const logger = require("./logging")
    .createLogger("devops-prov.openclient");

const errors = require('./errors');
const helpers = require('./helpers');

/**
 * Akamai OPEN client using Edgegrid
 */
class OpenClient {
    constructor(dependencies = {}) {
        this.defaultHeaders = dependencies.defaultHeaders || {};
        if (_.isFunction(dependencies.getEdgeGrid)) {
            this.__edgeGrid = dependencies.getEdgeGrid();
        }
        if (_.isFunction(dependencies.getAccountSwitchKey) && dependencies.getAccountSwitchKey()) {
            this.accountSwitchKey = dependencies.getAccountSwitchKey();
            if (this.accountSwitchKey.includes("?") || this.accountSwitchKey.includes("&") || this.accountSwitchKey.includes("=")) {
                //Try and prevent them from adding some random query parameter through the switch key
                throw new errors.AkamaiPDError("switchKey is malformed", "malformed switchKey");
            }
        }
    }

    /**
     * Preprare request before sending it.
     * @param method
     * @param path
     * @param body
     * @param headers
     * @returns {{path: *, method: *, headers: {}}}
     */
    prepare(method, path, body, headers) {
        let myHeaders = {};
        Object.assign(myHeaders, this.defaultHeaders, headers);
        let preparedPath = this.preparePath(path);
        let request = {
            path: preparedPath,
            method: method,
            headers: myHeaders
        };
        if (method === "POST" || method === "PUT") {
            request.body = body;
        }
        return request;
    }

    preparePath(path) {
        if (_.isString(this.accountSwitchKey) && this.accountSwitchKey) {
            let splitPath = path.split("?");

            if (splitPath.length === 1) {
                //No query parameters
                return path + "?accountSwitchKey=" + this.accountSwitchKey;
            }

            if (splitPath.length === 2) {
                //split the key value pairs
                if (splitPath[1] === "") {
                    //if it splits because there is a ? with nothing behind it, lets account for that
                    return path + "accountSwitchKey=" + this.accountSwitchKey;
                }
                let qkv = splitPath[1].split("&");
                qkv.push("accountSwitchKey=" + this.accountSwitchKey);
                let joinedqkv = qkv.join("&");

                return splitPath[0] + "?" + joinedqkv;

            }
            if (splitPath.length > 2) {
                //somethings wrong with the url
                throw new errors.AkamaiPDError("Requested path is malformed", "malformed path");
            }
        } else {
            return path;
        }
    }

    /**
     * Make REST request
     * @param method
     * @param path
     * @param body
     * @param headers
     * @param callback
     * @returns {Promise}
     */
    request(method, path, body, headers, callback) {
        logger.info(`Requesting: ${method} ${path}`);
        let request = this.prepare(method, path, body, headers);
        let processResponse = this.processResponse.bind(this, helpers.clone(request), callback);
        return new Promise((resolve, reject) => {
            this.__edgeGrid.auth(request).send(function(error, response) {
                processResponse(error, response, resolve, reject);
            });
        });
    }

    /**
     * TODO: do we really want to do this?
     * Under what circumstances should we retry?
     * 400 response code? Maybe not.
     *
     * @param method
     * @param path
     * @param body
     * @param headers
     * @param callback
     * @returns {Promise.<*>}
     */
    async requestRetry(method, path, body, headers, callback) {
        for (let times of [2, 1, 0]) {
            try {
                return await this.request(method, path, body, headers, callback);
            } catch (error) {
                logger.error("Error: ", error);
                if (times === 0) {
                    throw error;
                }
            }
        }
    }

    processResponse(request, callback, error, response, resolve, reject) {
        if (error) {
            reject(new errors.RestApiError(`Request failed: ${error}`, "low_level_network_error", error));
        } else if (response && response.statusCode >= 200 && response.statusCode < 400) {
            if (callback) {
                //if the caller of the request method wants more control over response handling.
                callback(response, resolve, reject);
            } else {
                logger.info("Status code: ", response.statusCode);
                logger.info("Body: ", response.body);
                try {
                    resolve(JSON.parse(response.body));
                } catch (error) {
                    reject(error);
                }
            }
        } else {
            logger.error(`request failure, status code: '${response.statusCode}', response body: `, response.body);
            reject(new errors.RestApiError(`Request failed, status code: ${response.statusCode},` +
                `\nResponse Body: '${response.body}'`, "api_client_error", response.statusCode, JSON.parse(response.body)));
        }
    }

    get(path, headers = {}, callback = undefined) {
        return this.request('GET', path, null, headers, callback);
    }

    post(path, body, headers = {
        'Content-Type': "application/json"
    }, callback = undefined) {
        return this.request('POST', path, body, headers, callback);
    }

    put(path, body, headers = {
        'Content-Type': "application/json"
    }, callback = undefined) {
        return this.request('PUT', path, body, headers, callback);
    }

    patch(path, body, headers = {
        'Content-Type': "application/json"
    }, callback = undefined) {
        return this.request('PATCH', path, body, headers, callback);
    }

    delete(path, headers = {}, callback = undefined) {
        return this.request('DELETE', path, null, headers, callback);
    }
}

module.exports = OpenClient;