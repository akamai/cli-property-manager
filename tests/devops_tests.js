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
const chai = require('chai');
const assert = chai.assert;
const path = require('path');

const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.devops_tests");

const devopsHome = __dirname;

const helpers = require('../src/helpers');
const createDevOps = require('../src/factory');
const VerifyUtils = require('./verify-utils');
const OpenClient = require('../src/openclient');
const PAPI = require('../src/papi');
const Project = require("../src/project");
const createOverlayUtils = require('./overlay-utils');
const throwsAsync = require("./testutils").throwsAsync;


describe('getEnvironment tests', function() {
    let devops;
    before(function() {
        devops = createDevOps({
            devopsHome
        });
    });

    it('getEnvironment with correct params', function() {
        let environment = devops.getDefaultProject().getEnvironment("prod");
        let envInfo = environment.getEnvironmentInfo();
        assert.equal(envInfo.propertyId, 411091);
        assert.deepEqual(envInfo.latestVersionInfo, {
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:31Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "etag": "9fdf49fecd0ed31b57eb13a6326f5190b9a14cc2",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });
    });

    it('getEnvironment with wrong env name', function() {
        assert.throws(() => {
            let environment = devops.getDefaultProject().getEnvironment("foobar");
        }, "'foobar' is not a valid environment in pipeline testproject.com");
    });

    it('getEnvironment with wrong project name', function() {
        assert.throws(() => {
            let environment = devops.getProject("blahblah").getEnvironment("foobar");
        }, "Pipeline 'blahblah' doesn't exist!");
    });
});

describe('getRuleTree tests', function() {
    let devops;
    before(function() {
        let openClientClass = td.constructor(OpenClient);
        td.when(openClientClass.prototype.get(td.matchers.anything(), td.matchers.anything()))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({"ruletree": "ruletree"});
                })
            );
        devops = createDevOps({
            devopsHome,
            openClientClass
        });
    });

    it('getEnvironment with correct params', async function() {
        let ruletree = await devops.getDefaultProject().getRuleTree("prod");
        assert.exists(ruletree);
    });
});


describe('createNewProject integration tests', function() {
    let utils;
    let projectName = "testproject.com";
    let devops;

    class TestProject extends Project {
         constructor(projectName, dependencies) {
             dependencies.getUtils = function() {
                 return utils;
             };
             super(projectName, dependencies);
         }

         exists() {
             return this.projectName === "existingProject";
         }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variableDefinitions.json")) {
                data.definitions.cpCode.default = 98765;
            }
            if (path.endsWith("/environments/staging/variables.json")) {
                data.cpCode = 654321;
            }
            if (path.endsWith("/environments/qa/hostnames.json")) {
                data.push({
                    cnameFrom: "qa.securesite.com",
                    cnameTo: "qa.securesite.com.edgekey.net",
                    cnameType: "EDGE_HOSTNAME",
                    edgeHostnameId: null
                });
            }
            return data;
        });

        let testRuleTree = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        let existingRuleTree = utils.readJsonFile(
            path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"));
        let testData = utils.readJsonFile(path.join(__dirname, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );
        td.when(papiClass.prototype.createProperty("qa.testproject.com", "Web_App_Accel", "1-1TJZH5", 61726))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );
        td.when(papiClass.prototype.createProperty("staging.testproject.com", "Web_App_Accel", "1-1TJZH5", 61726))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.create);
                })
            );
        td.when(papiClass.prototype.createProperty("prod.testproject.com", "Web_App_Accel", "1-1TJZH5", 61726))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.latestVersion);
                })
            );
        td.when(papiClass.prototype.latestPropertyVersion(411090))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.latestVersion);
                })
            );
        td.when(papiClass.prototype.latestPropertyVersion(411091))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.latestVersion);
                })
            );
        td.when(papiClass.prototype.latestPropertyVersion(76543))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bluePrint.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(411089, 1, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testRuleTree);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(411089, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = helpers.clone(testRuleTree);
                    delete testRuleTreeCopy["warnings"];
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(76543, 75, "latest"))
            .thenReturn(new Promise((resolve, reject) => {
                    let existingRuleTreeCopy = helpers.clone(existingRuleTree);
                    existingRuleTreeCopy.warnings = [
                        {
                            "title": "Unstable rule format",
                            "type": "https://problems.luna.akamaiapis.net/papi/v0/unstable_rule_format",
                            "detail": "This property is using `latest` rule format, which is designed to reflect interface changes immediately. We suggest converting the property to a stable rule format such as `v2017-06-19` to minimize the risk of interface changes breaking your API client program.",
                            "currentRuleFormat": "latest",
                            "suggestedRuleFormat": "v2017-06-19"
                        }
                    ];
                    existingRuleTreeCopy.ruleFormat = "latest";
                    resolve(existingRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(76543, 75, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject
        });
    });

    it('createNewProject with correct params', async function() {
        await devops.createNewProject({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726,
            environments: [
                "qa",
                "staging",
                "prod"
            ]
        });
    });

    it('createNewProject with propertyId', async function() {
        await devops.createNewProject({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726,
            environments: [
                "qa",
                "staging",
                "prod"
            ],
            propertyId: 76543
        });
    });

    it('createNewProject with duplicate environments', async function() {
        return throwsAsync(function() {
            return devops.createNewProject({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupId: 61726,
                environments: [
                    "qa",
                    "staging",
                    "qa",
                    "prod",
                    "staging"
                ]
            });
        }, "Error: Duplicate environment name in argument list: qa");
    });

    it('project exists', async function () {
        return throwsAsync(function() {
            return devops.createNewProject({
                projectName: "existingProject", //causes TestProject.exists() to return true
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupId: 61726,
                environments: ["qa", "staging", "production"]
            });
        }, function(exception) {
            let msg = exception.message;
            let parts = msg.split("'");
            assert.equal("Project folder ", parts[0]);
            assert.isTrue(parts[1].endsWith("tests/existingProject"));
            assert.equal(" already exists", parts[2]);
        });
    });

    it('project too many environments', async function () {
        return throwsAsync(function() {
            return devops.createNewProject({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupId: 61726,
                environments: [
                    "dev1", "dev2", "dev3", "qa1", "qa2", "qa3", "staging1", "stating2",
                    "staging3", "staging4", "uat1", "uat2", "prod"
                ]
            });
        }, "Error: Number of environments should not exceed 10");
    });
});


describe('merge integration tests', function() {
    let devops;

    before(function () {
        let papiClass = td.constructor(PAPI);
        let utilsClass = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variables.json")) {
                throw new Error('File not found variables.json');
            }
            return data;
        }, true);

        devops = createDevOps({
            devopsHome, papiClass, utilsClass
        });
    });

    it('Merge ', function() {
        return throwsAsync(function() {
            return devops.merge("testproject.com", "qa");
        }, "Error: File not found variables.json");
    });
});

describe('getProject test', function() {
    let devops;

    before(function () {
        devops = createDevOps({
            devopsHome
        });
    });

    it('getProject', function() {
        let project = devops.getProject("dummy", false);
        assert.isNotOk(project.exists());
    });
});

describe('Promote test', function() {
    let devops;
    let projectClass;

    beforeEach(function () {
        projectClass = td.constructor(Project);
        td.when(projectClass.prototype.exists()).thenReturn(true);
        devops = createDevOps({
            devopsHome,
            projectClass
        });
    });

    it('promote with command line email', function() {
        let results = devops.promote("foobar", "qa", "staging", "foo@bar.com,spam@egg.com");
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["foo@bar.com", "spam@egg.com"])));
    });

    it('promote with default emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        let results = devops.promote("foobar", "qa", "staging");
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["foo@bar.com", "spam@egg.com"])));
    });

    it('promote with default and cli option emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        let results = devops.promote("foobar", "qa", "staging", "fee@baz.com,spom@ugg.com");
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["foo@bar.com", "spam@egg.com", "fee@baz.com", "spom@ugg.com"])));
    });
});
