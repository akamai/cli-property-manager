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
const fs = require('fs');
const chai = require('chai');
const assert = chai.assert;

const logger = require("./../src/logging")
    .createLogger("devops-prov.verify-utils");

const Utils = require("../src/utils");

class VerifyUtils extends Utils {
    constructor() {
        super();
    }

    writeFile(fullpath, data) {
        if (fs.existsSync(fullpath)) {
            let expected = super.readFile(fullpath);
            assert.deepEqual(data, expected);
        } else {
            super.writeFile(fullpath, data);
            assert.fail(true, false, `file: '${fullpath}' didn't exist, wrote it.`)
        }
    }

    writeJsonFile(fullpath, data) {
        if (fs.existsSync(fullpath)) {
            let expected = super.readJsonFile(fullpath);
            assert.deepEqual(data, expected);
        } else {
            super.writeJsonFile(fullpath, data);
            assert.fail(true, false, `file: '${fullpath}' didn't exist, wrote it.`)
        }
    }

    mkdir(path) {
        if (!fs.existsSync(path)) {
            super.mkdir(path);
            assert.fail(true, false, `directory: '${path}' didn't exist, created it.`)
        }
    }
}

module.exports = exports = VerifyUtils;

