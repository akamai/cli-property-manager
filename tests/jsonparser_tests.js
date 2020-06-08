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


const path = require('path');
const td = require('testdouble');
const chai = require('chai');
const assert = chai.assert;

const logger = require("../src/logging")
    .createLogger("devops-prov.jsonparser_tests");

const Utils = require('../src/utils');

describe('JSON parser Tests', function () {
    it('test loading broken JSON', function () {
        const utils = new Utils();
        const filePath = path.join(__dirname, "testdata", "json", "unexpectedtoken.json");

        try {
            utils.readJsonFile(filePath);
            assert.fail('File should have thrown error');
        } catch (error) {
            logger.info("Error: ", error);
            assert.isTrue(error.message.startsWith("Unexpected token } in "));
            assert.isTrue(error.message.endsWith("tests/testdata/json/unexpectedtoken.json, line: 8, position: 2"));
        }
    });

    it('test loading truncated JSON', function () {
        const utils = new Utils();
        const filePath = path.join(__dirname, "testdata", "json", "truncated.json");

        try {
            utils.readJsonFile(filePath);
            assert.fail('File should have thrown error');
        } catch (error) {
            logger.info("Error: ", error);
            assert.isTrue(error.message.startsWith("Unexpected end of"));
            assert.isTrue(error.message.endsWith(", line: 28, position: 0"));
        }
    });

    it('test bad literal', function () {
        const utils = new Utils();
        const filePath = path.join(__dirname, "testdata", "json", "badlitteral.json");

        try {
            utils.readJsonFile(filePath);
            assert.fail('File should have thrown error');
        } catch (error) {
            logger.info("Error: ", error);
            assert.isTrue(error.message.startsWith("Unexpected token x in"));
            assert.isTrue(error.message.endsWith("/testdata/json/badlitteral.json, line: 15, position: 26"));
        }
    });
});