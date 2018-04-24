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


const _ = require('underscore');
const OpenClient = require('./openclient');
const helpers = require("./helpers");
const errors = require("./errors");
const logger = require("./logging")
    .createLogger("devops-prov.replayclient");

/**
 * Replay REST chatter by trying to find response in recorded file based on hash of request
 */
class ReplayClient extends OpenClient {
    constructor(fileName, dependencies) {
        super(dependencies);
        this.fileName = fileName;
        this.utils = dependencies.getUtils();
        this.openLog();
    }

    openLog() {
        this.log = {};
        if (!this.utils.fileExists(this.fileName)) {
            throw new errors.DependencyError(`Request log file '${this.fileName}' doesn't exist!`,
                "missing_request_log_file", this.fileName);
        }
        this.log = this.utils.readJsonFile(this.fileName);
        this.logKeeper = {};
    }

    request(method, path, body, headers, callback) {
        logger.info(`Requesting: ${method} ${path}`);
        let request = this.prepare(method, path, body, headers);
        let processResponse = this.processResponse.bind(this, request, callback);
        return new Promise((resolve, reject) => {
            let error, response;
            let event = this.lookupEvent(request);
            logger.info("looking up event for request: ", request);
            logger.info("event: ", event);
            if (!event) {
                error = new Error("log event not found!");
            } else {
                response = event.response;
                error = event.error;
            }

            processResponse(error, response, resolve, reject);
        });
    }

    lookupEvent(request) {
        let hash = helpers.createHash(request);
        let log = this.log[hash];
        let response = null;
        if (_.isArray(log)) {
            let index = this.logKeeper[hash];
            if (!_.isNumber(index)) {
                index = 0;
            }
            response = log[index];
            if (log.length > index + 1) {
                index++;
            }
            this.logKeeper[hash] = index;
        }
        return response;
    }
}

module.exports = ReplayClient;