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


const td = require('testdouble');
const chai = require('chai');
const assert = chai.assert;
const path = require('path');

const logger = require("../src/logging")
    .createLogger("devops-prov.el_tests");

const createDevOps = require("../src/factory");

describe('Test translate Papi Errors', function () {
    let environment;

    before(function () {
        let devops = createDevOps({
            devopsHome: __dirname
        });
        environment = devops.getDefaultProject().getEnvironment("qa");
        environment.shouldProcessPapiErrors = true;
    });

    it('test added error situation', async function () {
        let papiError = environment.project.utils.readJsonFile(path.join(__dirname, "testdata", "papi_errors", "added.json"));
        environment.processPapiErrors(papiError.errors);
        let error = papiError.errors[0];
        assert.deepEqual(error.added[0].location, {
            template: "templates/main.json",
            location: "rules/behaviors/6",
            value: {
                name: "allowPost",
                options: {
                    allowWithoutContentLength: false,
                    enabled: true
                }
            },
            "variables": []
        });
    });

    it('test adding locked criteria', async function () {
        let papiError = environment.project.utils.readJsonFile(
            path.join(__dirname, "testdata", "papi_errors", "added_criteria.json"));
        environment.processPapiErrors(papiError.errors);
        let error = papiError.errors[0];
        assert.deepEqual(error.added[0].location, {
            template: "templates/dynamic.json",
            location: "criteria/0",
            value: {
                name: "cacheability",
                options: {
                    matchOperator: "IS_NOT",
                    value: "CACHEABLE"
                }
            },
            "variables": []
        });
    });

    it('test locked error situation', async function () {
        let papiError = environment.project.utils.readJsonFile(path.join(__dirname, "testdata", "papi_errors", "locked.json"));
        environment.processPapiErrors(papiError.errors);
        let error = papiError.errors[0];
        assert.deepEqual(error.added[0].location, {
            template: "templates/main.json",
            location: "rules/behaviors/1",
            value: {
                name: "cpCode",
                options: {
                    value: {
                        id: 98765
                    }
                }
            },
            "variables": []
        });
    });

    it('test wrong type error situation', async function () {
        let papiError = environment.project.utils.readJsonFile(
            path.join(__dirname, "testdata", "papi_errors", "wrong_type.json"));
        environment.processPapiErrors(papiError.errors);
        let error = papiError.errors[0];
        assert.deepEqual(error.location, {
            template: "templates/main.json",
            location: "rules/behaviors/1/options/value/id",
            value: 98765,
            variables: [
                "environments/variableDefinitions.json"
            ]
        });
    });

    it('test error about required attribute missing', async function () {
        let papiError = environment.project.utils.readJsonFile(
            path.join(__dirname, "testdata", "papi_errors", "secure_origin.json"));
        environment.processPapiErrors(papiError.errors);
        let error = papiError.errors[0];
        assert.deepEqual(error.errorLocation, {
            template: "templates/main.json",
            location: "rules/behaviors/0/options/verificationMode",
            value: undefined,
            variables: []
        });
    });
});

