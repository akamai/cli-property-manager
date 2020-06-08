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
    .createLogger("devops-prov.devops_tests");

const devopsHome = __dirname;

const helpers = require('../src/helpers');
const Utils = require('../src/utils');
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
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });
    });

    it('get Projectinfo', function () {
        let projectData = devops.getDefaultProject().getProjectInfo();
        assert.deepEqual(projectData,{
            "productId": "Web_App_Accel",
            "contractId": "1-1TJZH5",
            "edgeGridConfig": {
                "section": "credentials"
            },
            "environments": [
                "qa",
                "staging",
                "prod"
            ],
            "name": "testproject.com",
            "groupIds": [
                61726
            ],
            "isSecure": false,
            "version": "0.1.10"
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
        }, "Akamai pipeline 'blahblah' doesn't exist!");
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


describe('createPipeline integration tests', function() {
    let utils;
    let projectName = "new.testproject.com";
    let testProjectNoVarName = "testproject-novar.com";
    let testProjectUserVar = "testproject-uservar.com";
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
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(__dirname, "..", "resources", "template.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        let existingRuleTree = regularUtils.readJsonFile(
            path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"));
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.variables.json"));

        let testData = regularUtils.readJsonFile(path.join(__dirname, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );
        td.when(papiClass.prototype.createProperty("qa." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );
        td.when(papiClass.prototype.createProperty("staging." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.create);
                })
            );

        td.when(papiClass.prototype.createProperty("prod." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.createProperty("qa." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );
        td.when(papiClass.prototype.createProperty("staging." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.create);
                })
            );

        td.when(papiClass.prototype.createProperty("prod." + projectName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.createProperty("qa." + testProjectNoVarName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );
        td.when(papiClass.prototype.createProperty("staging." + testProjectNoVarName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.create);
                })
            );
        td.when(papiClass.prototype.createProperty("prod." + testProjectNoVarName, "Web_App_Accel", "1-1TJZH5", 61726,undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.createProperty("qa." + testProjectUserVar, "Web_App_Accel", "1-1TJZH5", 61726,"latest", 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );
        td.when(papiClass.prototype.createProperty("staging." + testProjectUserVar, "Web_App_Accel", "1-1TJZH5", 61726,"latest", 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.staging.create);
                })
            );
        td.when(papiClass.prototype.createProperty("prod." + testProjectUserVar, "Web_App_Accel", "1-1TJZH5", 61726,"latest", 98789, 75))
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

        td.when(papiClass.prototype.latestPropertyVersion(98789))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.userVarProperty.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "latest"))
            .thenReturn(new Promise((resolve, reject) => {
                    let existingRuleTreeCopy = helpers.clone(existingRuleTreeUserVar);
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
            projectClass: TestProject,
            version: "0.1.10"
        });
    });

    it('createPipeline with correct params', async function() {
        await devops.createPipeline({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupIds: [61726],
            environments: [
                "qa",
                "staging",
                "prod"
            ],
            environmentGroupIds: {
                qa: 61726,
                staging: 61726,
                prod: 61726
            },
            ruleFormat:undefined
        });
    });

    it('createPipeline with propertyId', async function() {
        await devops.createPipeline({
            projectName: projectName,
            environments: [
                "qa",
                "staging",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 76543,
        });
    });

    it('createPipeline with propertyId variablemode = no-var', async function() {
        //This should create a new project "testproject-novar.com" that should be just like testproject.com (no variables)
        await devops.createPipeline({
            projectName: testProjectNoVarName,
            environments: [
                "qa",
                "staging",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 76543,
            variableMode: "no-var"
        });
    });

    it('createPipeline with propertyId variablemode = user-var-value', async function() {
        //This should create a new project "testproject-novar.com" that should be just like testproject.com (no variables)
        await devops.createPipeline({
            projectName: testProjectUserVar,
            environments: [
                "qa",
                "staging",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 98789,
            variableMode: "user-var-value",
            ruleFormat:"latest"
        });
    });


    it('createPipeline with duplicate environments', async function() {
        return throwsAsync(function() {
            return devops.createPipeline({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupIds: [61726],
                environmentGroupIds: {
                    qa: 61726,
                    staging: 61726,
                    prod: 61726
                },
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
            return devops.createPipeline({
                projectName: "existingProject", //causes TestProject.exists() to return true
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupIds: [61726],
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
            var env =[];
            for (var i = 1; i <=32; i++) {
                env.push("dev"+i);
            }
            return devops.createPipeline({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupIds: [61726],
                environments: env
            });
        }, "Error: Number of environments should not exceed 30");
    });
});

describe('createPipeline custom property name integration tests', function() {
    let utils;
    let projectName = "new.customname.com";
    let testProjectNoVarName = "testproject-novar-customname.com";
    let testProjectUserVar = "testproject-uservar-customname.com";
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
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(__dirname, "..", "resources", "template.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        let existingRuleTree = regularUtils.readJsonFile(
            path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"));
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.variables.json"));

        let testData = regularUtils.readJsonFile(path.join(__dirname, "testdata", "createProjectDataCustomName.json"));
        let papiClass = td.constructor(PAPI);
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );
        td.when(papiClass.prototype.createProperty("foo", "Web_App_Accel", "1-1TJZH5", 61726, undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.create);
                })
            );
        td.when(papiClass.prototype.createProperty("bar", "Web_App_Accel", "1-1TJZH5", 61726, undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.create);
                })
            );

        td.when(papiClass.prototype.createProperty("prod", "Web_App_Accel", "1-1TJZH5", 61726, undefined, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.createProperty("foo", "Web_App_Accel", "1-1TJZH5", 61726, undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.create);
                })
            );
        td.when(papiClass.prototype.createProperty("bar", "Web_App_Accel", "1-1TJZH5", 61726, undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.create);
                })
            );

        td.when(papiClass.prototype.createProperty("prod", "Web_App_Accel", "1-1TJZH5", 61726, undefined, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );


        td.when(papiClass.prototype.createProperty("foo", "Web_App_Accel", "1-1TJZH5", 61726, "latest", 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.create);
                })
            );
        td.when(papiClass.prototype.createProperty("bar", "Web_App_Accel", "1-1TJZH5", 61726, "latest", 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.create);
                })
            );

        td.when(papiClass.prototype.createProperty("prod", "Web_App_Accel", "1-1TJZH5", 61726, "latest", 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.create);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.latestVersion);
                })
            );
        td.when(papiClass.prototype.latestPropertyVersion(411090))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.latestVersion);
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

        td.when(papiClass.prototype.latestPropertyVersion(98789))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.userVarProperty.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(98789, 75, "latest"))
            .thenReturn(new Promise((resolve, reject) => {
                    let existingRuleTreeCopy = helpers.clone(existingRuleTreeUserVar);
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
            projectClass: TestProject,
            version: "0.1.10"
        });
    });

    it('createPipeline with correct params (custom property names)', async function() {
        await devops.createPipeline({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            customPropertyName: true,
            groupIds: [61726],
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            environmentGroupIds: {
                foo: 61726,
                bar: 61726,
                prod: 61726
            },
            ruleFormat:undefined
        });
    });

    it('createPipeline with propertyId (custom property names)', async function() {
        await devops.createPipeline({
            projectName: projectName,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 76543,
            customPropertyName: true
        });
    });

    it('createPipeline with propertyId variablemode = no-var (custom property names)', async function() {
        //This should create a new project "testproject-novar.com" that should be just like testproject.com (no variables)
        await devops.createPipeline({
            projectName: testProjectNoVarName,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 76543,
            variableMode: "no-var",
            customPropertyName: true
        });
    });

    it('createPipeline with propertyId variablemode = user-var-value (custom property names)', async function() {
        //This should create a new project "testproject-novar.com" that should be just like testproject.com (no variables)
        await devops.createPipeline({
            projectName: testProjectUserVar,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 98789,
            variableMode: "user-var-value",
            customPropertyName: true
        });
    });

    it('createPipeline with duplicate environments (custom property names)', async function() {
        return throwsAsync(function() {
            return devops.createPipeline({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupIds: [61726],
                environmentGroupIds: {
                    foo: 61726,
                    bar: 61726,
                    prod: 61726
                },
                environments: [
                    "foo",
                    "bar",
                    "foo",
                    "bar",
                    "foo"
                ]
            });
        }, "Error: Duplicate environment name in argument list: foo");
    });
});

describe('createPipeline associate property name integration tests', function() {
    let utils;
    let projectName = "new.associate.com";
    let testProjectNoVarName = "testproject-novar-associate.com";
    let testProjectUserVar = "testproject-uservar-associate.com";
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
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(__dirname, "..", "resources", "template.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        let existingRuleTree = regularUtils.readJsonFile(
            path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"));
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.variables.json"));

        let testData = regularUtils.readJsonFile(path.join(__dirname, "testdata", "createProjectDataAssociateName.json"));
        let papiClass = td.constructor(PAPI);
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.findProperty("foo"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.associate);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion("518928"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.latestVersion);
                })
            );

        td.when(papiClass.prototype.findProperty("bar"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.associate);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion("518929"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.bar.latestVersion);
                })
            );
        td.when(papiClass.prototype.findProperty("prod"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.associate);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion("518930"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules("518928", 2, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules("518928", 2, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(518928))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518928, 2, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518928, 2, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(518929))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.foo.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518929, 2, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518929, 2, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTree);
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(518930))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.prod.latestVersion);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518930, 2, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(518930, 2, "v2017-06-19"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );

        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            version: "0.1.10"
        });
    });

    it('createPipeline with correct params (associate property names)', async function() {
        await devops.createPipeline({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            customPropertyName: true,
            associatePropertyName: true,
            groupIds: [15225],
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            environmentGroupIds: {
                foo: 15225,
                bar: 15225,
                prod: 15225
            }
        });
    });

    it('createPipeline with propertyId (associate property names)', async function() {
        await devops.createPipeline({
            projectName: projectName,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 518928,
            customPropertyName: true,
            associatePropertyName: true
        });
    });

    it('createPipeline with propertyId variablemode = no-var (associate property names)', async function() {
        //This should create a new project "testproject-novar-associate.com" that should be just like new.associate.com (no variables)
        await devops.createPipeline({
            projectName: testProjectNoVarName,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 518928,
            variableMode: "no-var",
            customPropertyName: true,
            associatePropertyName: true
        });
    });

    it('createPipeline with propertyId variablemode = user-var-value (associate property names)', async function() {
        //This should create a new project "testproject-useervar-associate.com" that should be just like new.associate.com (no variables)
        await devops.createPipeline({
            projectName: testProjectUserVar,
            environments: [
                "foo",
                "bar",
                "prod"
            ],
            groupIds: [],
            environmentGroupIds: {
            },
            propertyId: 518930,
            variableMode: "user-var-value",
            customPropertyName: true,
            associatePropertyName: true
        });
    });

    it('createPipeline with duplicate environments (associate property names)', async function() {
        return throwsAsync(function() {
            return devops.createPipeline({
                projectName: projectName,
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupIds: [61726],
                environmentGroupIds: {
                    foo: 61726,
                    bar: 61726,
                    prod: 61726
                },
                environments: [
                    "foo",
                    "bar",
                    "foo",
                    "bar",
                    "foo"
                ]
            });
        }, "Error: Duplicate environment name in argument list: foo");
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

describe('email validation test', function(){
    let devops;
    beforeEach(function () {
        devops = createDevOps({
            devopsHome
        });
        fakeUpdateDevopsSettings = td.func(["updateDevopsSettings"]);
        devops.updateDevopsSettings = fakeUpdateDevopsSettings;
    });

    it('validate single valid email', function() {
        emailParam = "somebody@somewhere.com";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray)
    });

    it('validate single valid email ignoring comma', function() {
        emailParam = ",somebody@somewhere.com";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray);

        emailParam = ",somebody@somewhere.com,";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray);

        emailParam = "somebody@somewhere.com,";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray)
    });

    it('validate multiple valid email', function() {
        emailParam = "somebody@somewhere.com,someotherperson@somewhere.com";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray)
    });

    it('validate multiple valid email ignoring commas', function() {
        emailParam = ",somebody@somewhere.com,someotherperson@somewhere.com";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray);

        emailParam = ",somebody@somewhere.com,someotherperson@somewhere.com,";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray);

        emailParam = "somebody@somewhere.com,someotherperson@somewhere.com,";
        emailArray = emailParam.split(",");
        devops.setDefaultEmails(emailParam);
        assert.deepEqual(devops.devopsSettings.emails, emailArray)
    });

    it('validate single invalid email', function() {
        emailParam = "somebodywhere.com";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The email \'somebodywhere.com\' is not valid.';
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);
    });
    it('validate single invalid email ignoring commas', function() {
        emailParam = ",somebodywhere.com";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The email \'somebodywhere.com\' is not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = ",somebodywhere.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = "somebodywhere.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);
    });


    it('validate multiple invalid email', function() {
        emailParam = "somebodywhere.com,abcdefghijklmnopqrstuvwxyz";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The emails \'somebodywhere.com,abcdefghijklmnopqrstuvwxyz\' are not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);
    });

    it('validate multiple invalid email ignoring commas', function() {
        emailParam = ",somebodywhere.com,abcdefghijklmnopqrstuvwxyz";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The emails \'somebodywhere.com,abcdefghijklmnopqrstuvwxyz\' are not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = ",somebodywhere.com,abcdefghijklmnopqrstuvwxyz,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = "somebodywhere.com,abcdefghijklmnopqrstuvwxyz,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

    });

    it('validate valid and invalid email', function() {
        emailParam = "somebodywhere.com,jachin@akamai.com";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The emails \'somebodywhere.com\' are not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, );
    });

    it('validate valid and invalid email ignoring commas', function() {
        emailParam = ",somebodywhere.com,jachin@akamai.com";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The email \'somebodywhere.com\' is not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = ",somebodywhere.com,jachin@akamai.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = "somebodywhere.com,jachin@akamai.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);
    });

    it('validate email ignoring spaces', function() {
        emailParam = " somebodywhere.com,jachin@akamai.com ";
        emailArray = emailParam.split(",");
        expectedErrorString = 'The email \'somebodywhere.com\' is not valid.';

        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = " ,somebodywhere.com , jachin@akamai.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);

        emailParam = " somebodywhere.com ,jachin@akamai.com,";
        emailArray = emailParam.split(",");
        assert.throws(() => {
            devops.setDefaultEmails(emailParam);
        }, expectedErrorString);
    });
});

describe('Update Devops-settings Test', function(){
    let devops;
    beforeEach(function () {
        devops = createDevOps({
            devopsHome
        });
        fakewriteJsonFile = td.func(["writeJsonFile"]);
        devops.utils.writeJsonFile = fakewriteJsonFile;
    });

    it('update saved settings', function() {
        update = {
            "defaultProject": "test-name",
            "emails": [
                "test1@test.com",
                "test2@test.com"
            ],
            "edgeGridConfig": {
                "section": "papi"
            }
        };

        devops.updateDevopsSettings(update);
        assert.deepEqual(devops.devopsSettings.__savedSettings, update)
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
        devops.promote("foobar", "qa", "staging", "foo@bar.com,spam@egg.com", "Message", true);
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["foo@bar.com", "spam@egg.com"]), "Message", true));
    });

    it('promote with default emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        devops.promote("foobar", "qa", "staging", undefined, "Message", false);
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["foo@bar.com", "spam@egg.com"]), "Message", false));
    });

    it('promote with default and cli option emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        devops.promote("foobar", "qa", "staging", "fee@baz.com,spom@ugg.com", "Message", true);
        td.verify(projectClass.prototype.promote("qa", "staging",
            new Set(["foo@bar.com", "spam@egg.com", "fee@baz.com", "spom@ugg.com"]), "Message", true));
    });

    it('promote with bad default and and a bad cli option emails', function() {
        devops.devopsSettings.emails = ["a ", "spam@egg.com"];
        assert.throws(() => {
            devops.promote("foobar", "qa", "staging", ", b,spom@ugg.com");
        }, "The emails 'b,a' are not valid.");    });
});
