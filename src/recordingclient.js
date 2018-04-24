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
const logger = require("./logging")
    .createLogger("devops-prov.recordingclient");

const OpenClient = require("./openclient");
const helpers = require("./helpers");

/**
 * Records request and response data to file.
 */
class RecordingClient extends OpenClient {
    constructor(fileName, dependencies) {
        super(dependencies);
        this.utils = dependencies.getUtils();
        this.fileName = fileName;
        this.recordErrors = _.isBoolean(dependencies.recordErrors) ? dependencies.recordErrors : false;
        this.openLog();
        process.on('exit', () => {
            this.closeLog();
        });
    }

    openLog() {
        this.log = {};
        if (this.utils.fileExists(this.fileName)) {
            logger.info("reading previous log from: ", this.fileName);
            this.log = this.utils.readJsonFile(this.fileName);
        }
    }

    closeLog() {
        logger.info("writing log to: ", this.fileName);
        this.utils.writeJsonFile(this.fileName, this.log);
    }

    processResponse(request, callback, error, response, resolve, reject) {
        this.logRequest(request, error, response);
        super.processResponse(request, callback, error, response, resolve, reject);
    }

    logRequest(request, error, response) {
        if (!this.recordErrors &&
            (_.isObject(error) || (response && (response.statusCode < 200 || response.statusCode >= 400)))) {
            return;
        }
        let hash = helpers.createHash(request);
        let events = this.log[hash];
        if (!_.isArray(events)) {
            events = [];
            this.log[hash] = events;
        }
        events.push({
            request: request,
            error: error,
            response: response
        });
    }
}

module.exports = RecordingClient;