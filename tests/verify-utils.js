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
const fs = require('fs');
const chai = require('chai');
const assert = chai.assert;

const logger = require("./../src/logging")
    .createLogger("devops-prov.verify-utils");

const Utils = require("../src/utils");

class VerifyUtils extends Utils {
    constructor(pretendEmtpy=false) {
        super();
        this.pretendEmpty = pretendEmtpy;
        this.fileCache = {};
    }

    touch(path) {
        this.fileCache[path] = true;
    }

    readJsonFile(path) {
        if (this.pretendEmpty) {
            if (this.fileCache[path] === undefined) {
                throw new Error(`File '${path}' does not exist!`)
            }
        }
        return super.readJsonFile(path);        
    }

    fileExists(path) {
        if (this.pretendEmpty) {
            if (this.fileCache[path] === undefined) {
                return false;
            }
        }
        return fs.existsSync(path);
    }

    readFile(path) {
        if (this.pretendEmpty) {
            if (this.fileCache[path] === undefined) {
                throw new Error(`File '${path}' does not exist!`)
            }
        }
        return fs.readFileSync(path, 'utf8');
    }

    writeFile(path, data) {
        if (fs.existsSync(path)) {
            let expected = super.readFile(path);
            assert.deepEqual(data, expected);
            this.fileCache[path] = true;
        } else {
            super.writeFile(path, data);
            assert.fail(true, false, `file: '${path}' didn't exist, wrote it.`)
        }
    }

    writeJsonFile(path, data) {
        if (fs.existsSync(path)) {
            this.fileCache[path] = true;
            let expected = super.readJsonFile(path);
            assert.deepEqual(data, expected);
        } else {
            super.writeJsonFile(path, data);
            assert.fail(true, false, `file: '${path}' didn't exist, wrote it.`)
        }
    }

    mkdir(path) {
        if (!fs.existsSync(path)) {
            super.mkdir(path);
            assert.fail(true, false, `directory: '${path}' didn't exist, created it.`)
        } else {
            this.fileCache[path] = true;
        }
    }
}

module.exports = exports = VerifyUtils;

