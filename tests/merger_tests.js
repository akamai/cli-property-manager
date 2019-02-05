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


const td = require('testdouble');
const path = require('path');
const chai = require('chai');
const assert = chai.assert;


const devopsHome = __dirname;
const createDevOps = require('../src/factory');
const PAPI = require("../src/papi");

const logger = require("../src/logging")
    .createLogger("devops-prov.merger_test");

const VerifyUtils = require('./verify-utils');
const createOverlayUtils = require('./overlay-utils');
const throwsAsync = require("./testutils").throwsAsync;
const Merger = require("../src/merger");

describe('Merger Tests', function () {
    let project;
    let devops;
    let projectName = "testproject.com";

    before(function () {
        let papiClass = td.constructor(PAPI);
        let utils = new VerifyUtils();
        let validationResults = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        validationResults.errors = [];
        validationResults.warnings = [];
        td.when(papiClass.prototype.validatePropertyVersionRules(
            td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything()))
            .thenReturn(validationResults);

        devops = createDevOps({
            devopsHome: devopsHome,
            utilsClass: VerifyUtils,
            papiClass: papiClass
        });
        project = devops.getProject(projectName);
    });

    it('Regular merge: qa', async function () {
        let goodUtils = project.utils;
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("envInfo.json")) {
                data["lastValidatedHash"] = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221aaa2";
            }
            return data;
        });
        await project.getEnvironment("qa").merge();
        project.utils = goodUtils;
    });

    it('revsolvePath test', function () {
        let environment = project.getEnvironment("qa");
        assert.deepEqual(environment.resolvePath("rules/children/0/criteria/0/name"), {
            "template": "templates/compression.json",
            "value": "contentType",
            "location": "criteria/0/name",
            "variables": []
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/0/options/hostname"), {
            "template": "templates/main.json",
            "location": "rules/behaviors/0/options/hostname",
            "value": "origin-qa.testproject.com",
            "variables": ["environments/qa/variables.json"]
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/1/options/value/id"), {
            "template": "templates/main.json",
            "location": "rules/behaviors/1/options/value/id",
            "value": 98765,
            "variables": ["environments/variableDefinitions.json"]
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/2"), {
            "template": "templates/main.json",
            "location": "rules/behaviors/2",
            "value": {
                "name": "caching",
                "options": {
                    "behavior": "NO_STORE"
                }
            },
            "variables": []
        });
        assert.deepEqual(environment.resolvePath("rules/children/1/behaviors/1/options/httpsPort"), {
            "location": "behaviors/1/options/httpsPort",
            "template": "templates/static.json",
            "value": undefined,
            "variables": []
        });
    });

    it('Regular merge: staging', async function () {
        await project.getEnvironment("staging").merge();
    });

    it('Regular merge: prod', async function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variables.json")) {
                delete data["cpCode"];
            }
            return data;
        });
        await project.getEnvironment("prod").merge();
    });

    it('Undeclared variable in template', function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("static.json")) {
                data.behaviors[0].options.ttl = "${env.defaultTTL}";
            }
            if (path.endsWith("variables.json")) {
                data.cpCode = 98765;
            }
            return data;
        });

        return throwsAsync(function() {
            return project.getEnvironment("qa").merge();
        }, "Error: Undefined variable: 'defaultTTL'");
    });

    it('Bad template include', function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("main.json")) {
                data.rules.children.push("#include:foobar.json");
            }
            if (path.endsWith("variables.json")) {
                data.cpCode = 98765;
            }
            return data;
        });

        return throwsAsync(function() {
            return project.getEnvironment("qa").merge();
        }, "Error: Can't load template include: 'foobar.json'");
    });

    it('Undeclared variable', function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variables.json")) {
                data.someKey = "Some value";
                data.cpCode = 98765;
            }
            return data;
        });

        return throwsAsync(function() {
            return project.getEnvironment("qa").merge();
        }, "Error: Variables 'someKey' not declared in 'environments/variableDefinitions.json' but value assigned in 'environments/qa/variables.json'");
    });

    it('Variable declared but no value given', async function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data, mode) {
            if (path.endsWith("variableDefinitions.json")) {
                data.definitions.someFunkyVariable = {
                    "type": "bar",
                    "default": "foobar"
                };
                data.definitions.cpCode.default = 98765;
            } else if (path.endsWith("envInfo.json") && mode === "write") {
                data.environmentHash = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221aaa2";
                data.ruleTreeHash = "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744";
                delete data["lastValidatedHash"];
            }
            return data;
        });

        await project.getEnvironment("qa").merge();
    });

    it('Variables.json is gone', function () {
        project.utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variables.json")) {
                throw new Error('File not found variables.json');
            }
            return data;
        });

        return throwsAsync(function() {
            return project.getEnvironment("qa").merge();
        }, "Error: File not found variables.json");
    });

    it('null variable definition and null variable value', function() {
        let merger = new Merger("test_project", "qa", "dummy");
        let variableValuesResources = {
            "resource": { "originHostname": "origin-qa.test-pipeline.com",
                    "cpCode": 671817,
                    "sureRouteTestObject": null
            },
            "resourcePath": "environments/qa/variables.json"
        };

        let variableDefinitionsResources = {
            "resource": {
                "definitions": {
                    "originHostname": {
                        "type": "hostname",
                        "default": null
                    },
                    "cpCode": {
                        "type": "cpCode",
                        "default": null
                    },
                    "sureRouteTestObject": {
                        "type": "url",
                        "default": null
                    }
                }
            },
            "resourcePath": "environments/variableDefinitions.json"
        };

        try{
            merger.checkVariables(variableValuesResources, variableDefinitionsResources);
        } catch(error){
            assert.equal(error.toString(),
                "Error: Variable 'sureRouteTestObject' declared in 'environments/variableDefinitions.json' without default value and no value given in 'environments/qa/variables.json'");

        }
    });
    it('null variable definition and empty string variable value', function() {
        let merger = new Merger("test_project", "qa", "dummy");
        let variableValuesResources = {
            "resource": { "originHostname": "origin-qa.test-pipeline.com",
                "cpCode": 671817,
                "sureRouteTestObject": ""
            },
            "resourcePath": "environments/qa/variables.json"
        };

        let variableDefinitionsResources = {
            "resource": {
                "definitions": {
                    "originHostname": {
                        "type": "hostname",
                        "default": null
                    },
                    "cpCode": {
                        "type": "cpCode",
                        "default": null
                    },
                    "sureRouteTestObject": {
                        "type": "url",
                        "default": null
                    }
                }
            },
            "resourcePath": "environments/variableDefinitions.json"
        };

        assert.equal(merger.checkVariables(variableValuesResources, variableDefinitionsResources), true);
    });
    it('empty string variable definition and null variable value', function() {
        let merger = new Merger("test_project", "qa", "dummy");
        let variableValuesResources = {
            "resource": { "originHostname": "origin-qa.test-pipeline.com",
                "cpCode": 671817,
                "sureRouteTestObject": null
            },
            "resourcePath": "environments/qa/variables.json"
        };

        let variableDefinitionsResources = {
            "resource": {
                "definitions": {
                    "originHostname": {
                        "type": "hostname",
                        "default": null
                    },
                    "cpCode": {
                        "type": "cpCode",
                        "default": null
                    },
                    "sureRouteTestObject": {
                        "type": "url",
                        "default": ""
                    }
                }
            },
            "resourcePath": "environments/variableDefinitions.json"
        };

        assert.equal(merger.checkVariables(variableValuesResources, variableDefinitionsResources), true);
    });
    it('Empty string variable definition empty string variable value', function() {
        let merger = new Merger("test_project", "qa", "dummy");
        let variableValuesResources = {
            "resource": { "originHostname": "origin-qa.test-pipeline.com",
                "cpCode": 671817,
                "sureRouteTestObject": ""
            },
            "resourcePath": "environments/qa/variables.json"
        };

        let variableDefinitionsResources = {
            "resource": {
                "definitions": {
                    "originHostname": {
                        "type": "hostname",
                        "default": null
                    },
                    "cpCode": {
                        "type": "cpCode",
                        "default": null
                    },
                    "sureRouteTestObject": {
                        "type": "url",
                        "default": ""
                    }
                }
            },
            "resourcePath": "environments/variableDefinitions.json"
        };

        assert.equal(merger.checkVariables(variableValuesResources, variableDefinitionsResources), true);
    });
});