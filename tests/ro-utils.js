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

const logger = require("./../src/logging")
    .createLogger("devops-prov.ro-utils");

const Utils = require("../src/utils");
const helpers = require("../src/helpers");

class RoUtils extends Utils {
    constructor() {
        super();
        this.writeLog = [];
        this.memoryFs = {};
    }

    clear() {
        this.writeLog = [];
        this.memoryFs = {};
    }

    fileExists(fullpath) {
        if (this.memoryFs[fullpath] !== undefined) {
            return true;
        }
        return super.fileExists(fullpath);
    }

    readJsonFile(fullpath) {
        let data;
        if (this.memoryFs[fullpath] !== undefined) {
            data = this.memoryFs[fullpath];
        } else {
            data = super.readJsonFile(fullpath);
            this.memoryFs[fullpath] = data;
        }
        return helpers.clone(data);
    }

    readFile(fullpath) {
        if (this.memoryFs[fullpath] !== undefined) {
            return this.memoryFs[fullpath];
        } else {
            let data = super.readFile(fullpath, 'utf8');
            this.memoryFs[fullpath] = data;
            return data;
        }
    }

    writeJsonFile(fullpath, data) {
        let cpdData = helpers.clone(data);
        this.memoryFs[fullpath] = cpdData;
        this.writeLog.push(["write-json", fullpath, cpdData])
    }

    writeFile(fullpath, data) {
        this.memoryFs[fullpath] = data;
        this.writeLog.push(["write-file", fullpath, data])
    }

    mkdir(path) {
        this.memoryFs[fullpath] = "created";
        this.writeLog.push(["mkdir", path]);
    }

    getSimpleWriteLog() {
        return _.map(this.writeLog, logItem => {
            return logItem.slice(0, 2);
        })
    }
}

module.exports = RoUtils;

