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

const logger = require("../../src/logging")
    .createLogger("snippets.devops_tests");


const devopsHome =  path.join(__dirname, "..");
const baseDir = devopsHome;

const helpers = require('../../src/helpers');
const Utils = require('../../src/utils');
const createDevOps = require('../../src/factory');
const VerifyUtils = require('../verify-utils');
const OpenClient = require('../../src/openclient');
const PAPI = require('../../src/papi');
const createOverlayUtils = require('../overlay-utils');
const throwsAsync = require("../testutils").throwsAsync;

const DevOpsSnippets = require('../../src/pm/devops_property_manager');
const SnippetsProject = require('../../src/pm/project_property_manager');
const EnvironmentSnippets = require('../../src/pm/environment_property_manager');

const devOpsClass = DevOpsSnippets;
const projectClass = SnippetsProject;
const environmentClass = EnvironmentSnippets;

const EdgeDomains = require('../../src/edgehostname_manager').EdgeDomains;

describe('Snippets getEnvironment tests', function() {
    let devops;
    before(function() {
        devops = createDevOps({
            devopsHome,
            devOpsClass,
            projectClass,
            environmentClass
        });
    });

    it('getEnvironment with correct params', function() {
        //Should re-add get DEFAULT project when we have this working
        //        let environment = devops.getDefaultProject().getEnvironment("prod");
        let environment = devops.getProject("new.snippets.com").getEnvironment("new.snippets.com");
        let envInfo = environment.getEnvironmentInfo();
        assert.equal(envInfo.propertyId, 411089);
        assert.deepEqual(envInfo.latestVersionInfo, {
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:05Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });
    });

    it('get Projectinfo', function () {
        let projectData = devops.getProject("new.snippets.com").getProjectInfo();

        assert.deepEqual(projectData, {
            "productId": "Web_App_Accel",
            "contractId": "1-1TJZH5",
            "groupId": 61726,
            "edgeGridConfig": {
                "section": "credentials"
            },
            "name": "new.snippets.com",
            "isSecure": false,
            "version": "0.1.10"
        });
    });

    it('PASSES - getEnvironment with wrong env name', function() {
        let environment = devops.getProject("new.snippets.com").getEnvironment("foobar");
        let envInfo = environment.getEnvironmentInfo();
        assert.equal(envInfo.propertyId, 411089);
        assert.deepEqual(envInfo.latestVersionInfo, {
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:05Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });
    });

    it('getEnvironment with wrong project name', function() {
        assert.throws(() => {
            let environment = devops.getProject("blahblah").getEnvironment("foobar");
        }, "PM CLI property 'blahblah' doesn't exist!");
    });
});

describe('Snippets getRuleTree tests', function() {
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
            devOpsClass,
            projectClass,
            environmentClass,
            openClientClass
        });
    });

    it('getEnvironment with correct params', async function() {
        let ruletree = await devops.getProject("new.snippets.com").getRuleTree("prod");
        assert.exists(ruletree);
    });
});

describe('Snippets createPipeline integration tests', function() {
    let utils;
    let projectName = "new.snippets.com";
    let testProjectExistingName = "new.snipppets.existing.com";
    let testProjectUserVar = "snippets-uservar.com";

    let devops;

    class TestProject extends SnippetsProject {
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
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        let existingRuleTree = regularUtils.readJsonFile(
            path.join(baseDir, "testproject.com", "dist", "qa.testproject.com.papi.json"));
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.variables.json"));

        let testData = regularUtils.readJsonFile(path.join(baseDir, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );
        td.when(papiClass.prototype.createProperty(projectName, "Web_App_Accel", "1-1TJZH5", 61726, null, undefined, undefined))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );

        td.when(papiClass.prototype.createProperty(testProjectExistingName, "Web_App_Accel", "1-1TJZH5", 61726, null, 76543, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );

        td.when(papiClass.prototype.createProperty(testProjectUserVar, "Web_App_Accel", "1-1TJZH5", 61726, null, 98789, 75))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
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
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });
    });

    it('createPipeline with correct params', async function() {
        await devops.createProperty({
            projectName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726
        });
    });

    it('createPipeline with propertyId variablemode = user-var-value', async function() {
        //This should create a new project "testproject-uservar.com" that should be just like testproject.com (user-var-values)
        await devops.createProperty({
            projectName: testProjectUserVar,
            contractId: null,
            groupId: null,
            propertyId: 98789,
            variableMode: "user-var-value"
        });
    });

    it('createPipeline with propertyId no local directory = true', async function() {
        //This should create a new project without local directory
        await devops.createProperty({
            projectName: testProjectUserVar,
            contractId: null,
            groupId: null,
            propertyId: 98789,
            noLocalFolders: true
        });
    });

    it('createPipeline with propertyId', async function() {
        await devops.createProperty({
            projectName: testProjectExistingName,
            groupId: undefined,
            propertyId: 76543,
            variableMode: "no-var"
        });
    });



    it('project exists', async function () {
        return throwsAsync(function() {
            return devops.createProperty({
                projectName: "existingProject", //causes TestProject.exists() to return true
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupId: 61726
            });
        }, function(exception) {
            let msg = exception.message;
            let parts = msg.split("'");
            assert.equal("Property folder ", parts[0]);
            assert.isTrue(parts[1].endsWith("tests/existingProject"));
            assert.equal(" already exists", parts[2]);
        });
    });

});


describe('Snippets Import property Tests', function () {
    let utils;
    let projectName = "import.snippets.com";
    let devops;
    let environment;
    let project;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);
        }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        utils.touch(path.join(baseDir,"import.snippets.com", "projectInfo.json"));
        let regularUtils = new Utils();
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(baseDir, "testdata", "import.testruletree.variables.json"));
        let papiClass = td.constructor(PAPI);

        td.when(papiClass.prototype.findProperty("import.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                resolve({
                    "versions" : {
                        "items" : [{
                            "propertyId": 501778
                        }]
                    }
                })
            }));
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(501778, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );


        td.when(papiClass.prototype.getPropertyInfo(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "501778",
                                    "propertyname": "import.snippets.com",
                                    "latestVersion": 1,
                                    "stagingVersion": 1,
                                    "productionVersion": 1,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                let info = {
                    "versions": {
                        "items": [
                            {
                                propertyVersion: 1,
                                updatedByUser: 'dummy@gmail.com',
                                updatedDate: '2018-11-06T15:39:49Z',
                                productionStatus: 'INACTIVE',
                                stagingStatus: 'INACTIVE',
                                productId: 'Web_App_Accel',
                                ruleFormat: 'v2018-09-12'
                            }
                        ]
                    }
                }
                    resolve(info);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionHostnames(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                let info = {
                    "hostnames": {
                            "items": [{
                                "cnameFrom": "import.snippets.com",
                                "cnameTo": "import.snippets.com.edgesuite.net",
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": 12345
                            }]

                    }
                }
                    resolve(info);
                })
            );


        td.when(papiClass.prototype.latestPropertyVersion(501778))
            .thenReturn(new Promise((resolve, reject) => {
                let info = {
                    propertyId: 501778,
                    propertyName: "import.snippets.com",
                    groupId: 61726,
                    contractId: "1-1TJZH5",
                    updatedByUser: 'dummy@gmail.com',
                    updatedDate: '2018-11-06T15:39:49Z',
                    productionStatus: 'INACTIVE',
                    stagingStatus: 'INACTIVE',
                    ruleFormat: 'v2018-09-12',
                    versions: {
                        items: [
                            {
                                propertyVersion: 1,
                                updatedByUser: 'dummy@gmail.com',
                                updatedDate: '2018-11-06T15:39:49Z',
                                productionStatus: 'INACTIVE',
                                stagingStatus: 'INACTIVE',
                                productId: 'Web_App_Accel',
                                ruleFormat: 'v2018-09-12'
                            }
                        ]
                    }
                }
                resolve(info);
            })
            );
        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });

        project = devops.getProject(projectName, false);
        environment = project.getEnvironment(projectName);

        let existsTD= td.function();
        td.when(existsTD()).thenReturn(false, false, true);
        project.exists = existsTD;

        let createHostnamesFileTD = td.function();
        td.when(createHostnamesFileTD()).thenDo(function(){
            const domain = this.project.projectName;
            const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

            let hostnames = [{
                "cnameFrom": domain,
                "cnameTo": domain + edgeDomain,
                "cnameType": "EDGE_HOSTNAME",
                "edgeHostnameId": 12345
            }];
            this.project.storeEnvironmentHostnames(this.name, hostnames);
            }, function(){
                const domain = this.project.projectName;
                const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

                let hostnames = [{
                    "cnameFrom": domain,
                    "cnameTo": domain + edgeDomain,
                    "cnameType": "EDGE_HOSTNAME",
                    "edgeHostnameId": null
                }];
                this.project.storeEnvironmentHostnames(this.name, hostnames);
            }
            );

        environment.createHostnamesFile = createHostnamesFileTD;

    });

    it('import property with correct params and has edges with id', async function() {
        devops.getProject = function(){
            return project;
        }
        project.getEnvironment = function(projectName){
            return environment;
        }
        await devops.importProperty({
            propertyName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726
        });
    });

    it('import property that exists locally', async function () {
        return throwsAsync(function() {
            return devops.importProperty({
                propertyName: "import.snippets.com", //causes TestProject.exists() to return true
                productId: "Web_App_Accel",
                contractId: "1-1TJZH5",
                groupId: 61726
            });
        }, function(exception) {
            let msg = exception.message;
            let parts = msg.split("'");
            assert.equal("Property folder ", parts[0]);
            assert.equal("import.snippets.com", parts[1]);
            assert.equal(" already exists locally", parts[2]);
        });
    });

});



describe('Snippets Import property Tests', function () {
    let utils;
    let projectName = "import-uservar.snippets.com";
    let devops;
    let environment;
    let project;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);
        }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        utils.touch(path.join(baseDir,"import-uservar.snippets.com", "projectInfo.json"));
        let regularUtils = new Utils();
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(baseDir, "testdata", "import.testruletree.variables.json"));
        let papiClass = td.constructor(PAPI);

        td.when(papiClass.prototype.findProperty("import-uservar.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                resolve({
                    "versions" : {
                        "items" : [{
                            "propertyId": 501778
                        }]
                    }
                })
            }));
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(501778, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );


        td.when(papiClass.prototype.getPropertyInfo(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "501778",
                                    "propertyname": "import-uservar.snippets.com",
                                    "latestVersion": 1,
                                    "stagingVersion": 1,
                                    "productionVersion": 1,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        "versions": {
                            "items": [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionHostnames(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        "hostnames": {
                            "items": [{
                                "cnameFrom": "import-uservar.snippets.com",
                                "cnameTo": "import-uservar.snippets.com.edgesuite.net",
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": 12345
                            }]

                        }
                    }
                    resolve(info);
                })
            );


        td.when(papiClass.prototype.latestPropertyVersion(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        propertyId: 501778,
                        propertyName: "import.snippets.com",
                        groupId: 61726,
                        contractId: "1-1TJZH5",
                        updatedByUser: 'dummy@gmail.com',
                        updatedDate: '2018-11-06T15:39:49Z',
                        productionStatus: 'INACTIVE',
                        stagingStatus: 'INACTIVE',
                        ruleFormat: 'v2018-09-12',
                        versions: {
                            items: [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );
        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });

        project = devops.getProject(projectName, false);
        environment = project.getEnvironment(projectName);

        let existsTD= td.function();
        td.when(existsTD()).thenReturn(false, false, true);
        project.exists = existsTD;

        let createHostnamesFileTD = td.function();
        td.when(createHostnamesFileTD()).thenDo(function(){
                const domain = this.project.projectName;
                const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

                let hostnames = [{
                    "cnameFrom": domain,
                    "cnameTo": domain + edgeDomain,
                    "cnameType": "EDGE_HOSTNAME",
                    "edgeHostnameId": 12345
                }];
                this.project.storeEnvironmentHostnames(this.name, hostnames);
            }, function(){
                const domain = this.project.projectName;
                const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

                let hostnames = [{
                    "cnameFrom": domain,
                    "cnameTo": domain + edgeDomain,
                    "cnameType": "EDGE_HOSTNAME",
                    "edgeHostnameId": null
                }];
                this.project.storeEnvironmentHostnames(this.name, hostnames);
            }
        );

        environment.createHostnamesFile = createHostnamesFileTD;

    });

    it('user-var import property with correct params and has edges with id', async function() {
        devops.getProject = function(){
            return project;
        }
        project.getEnvironment = function(projectName){
            return environment;
        }
        await devops.importProperty({
            propertyName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726,
            variableMode: "user-var-value"

        });
    });
});


describe('Snippets Import property test without EdgeHostnameID', function () {
    let utils;
    let projectName = "import.snippets.noHostnameID.com";
    let devops;
    let environment;
    let project;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);
        }
    }
    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        utils.touch(path.join(baseDir,"import.snippets.noHostnameID.com", "projectInfo.json"));
        let regularUtils = new Utils();
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(baseDir, "testdata", "import.testruletree.variables.json"));
        let papiClass = td.constructor(PAPI);

        td.when(papiClass.prototype.findProperty("import.snippets.noHostnameID.com"))
            .thenReturn(new Promise((resolve, reject) => {
                resolve({
                    "versions" : {
                        "items" : [{
                            "propertyId": 501778
                        }]
                    }
                })
            }));
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(501778, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );


        td.when(papiClass.prototype.getPropertyInfo(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "501778",
                                    "propertyname": "import.snippets.noHostnameID.com",
                                    "latestVersion": 1,
                                    "stagingVersion": 1,
                                    "productionVersion": 1,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        "versions": {
                            "items": [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionHostnames(501778, 1))
            .thenReturn(
                new Promise((resolve, reject) => {
                    let info = {
                        "hostnames": {
                            "items": [{
                                "cnameFrom": "import.snippets.noHostnameID.com",
                                "cnameTo": "import.snippets.noHostnameID.com.edgesuite.net",
                                "cnameType": "EDGE_HOSTNAME"
                            }]

                        }
                    }
                    resolve(info);
                })
            );


        td.when(papiClass.prototype.latestPropertyVersion(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        propertyId: 501778,
                        propertyName: "import.snippets.noHostnameID.com",
                        groupId: 61726,
                        contractId: "1-1TJZH5",
                        updatedByUser: 'dummy@gmail.com',
                        updatedDate: '2018-11-06T15:39:49Z',
                        productionStatus: 'INACTIVE',
                        stagingStatus: 'INACTIVE',
                        ruleFormat: 'v2018-09-12',
                        versions: {
                            items: [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );
        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });

        project = devops.getProject(projectName, false);
        environment = project.getEnvironment(projectName);

        let existsTD= td.function();
        td.when(existsTD()).thenReturn(false, false);
        project.exists = existsTD;

        let createHostnamesFileTD = td.function();
        td.when(createHostnamesFileTD()).thenDo(function(){
                const domain = this.project.projectName;
                const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

                let hostnames = [{
                    "cnameFrom": domain,
                    "cnameTo": domain + edgeDomain,
                    "cnameType": "EDGE_HOSTNAME"
                }];
                this.project.storeEnvironmentHostnames(this.name, hostnames);
            }
        );

        environment.createHostnamesFile = createHostnamesFileTD;

    });

    it('import property with correct params and has edges without', async function() {
        devops.getProject = function(){
            return project;
        }
        project.getEnvironment = function(projectName){
            return environment;
        }
        await devops.importProperty({
            propertyName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726
        });
    });
});

describe('Snippets Import property test without EdgeHostnames', function () {
    let utils;
    let projectName = "import.snippets.noHostnames.com";
    let devops;
    let environment;
    let project;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);
        }
    }
    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        utils.touch(path.join(baseDir,"import.snippets.noHostnames.com", "projectInfo.json"));
        let regularUtils = new Utils();
        let existingRuleTreeUserVar = regularUtils.readJsonFile(path.join(baseDir, "testdata", "import.testruletree.variables.json"));
        let papiClass = td.constructor(PAPI);

        td.when(papiClass.prototype.findProperty("import.snippets.noHostnames.com"))
            .thenReturn(new Promise((resolve, reject) => {
                resolve({
                    "versions" : {
                        "items" : [{
                            "propertyId": 501778
                        }]
                    }
                })
            }));
        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.getPropertyVersionRules(501778, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(existingRuleTreeUserVar);
                })
            );


        td.when(papiClass.prototype.getPropertyInfo(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "501778",
                                    "propertyname": "import.snippets.noHostnames.com",
                                    "latestVersion": 1,
                                    "stagingVersion": 1,
                                    "productionVersion": 1,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(501778, 1))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        "versions": {
                            "items": [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );

        td.when(papiClass.prototype.getPropertyVersionHostnames(501778, 1))
            .thenReturn(
                new Promise((resolve, reject) => {
                    let info = {
                        "hostnames": {
                            "items": []

                        }
                    }
                    resolve(info);
                })
            );


        td.when(papiClass.prototype.latestPropertyVersion(501778))
            .thenReturn(new Promise((resolve, reject) => {
                    let info = {
                        propertyId: 501778,
                        propertyName: "import.snippets.noHostnames.com",
                        groupId: 61726,
                        contractId: "1-1TJZH5",
                        updatedByUser: 'dummy@gmail.com',
                        updatedDate: '2018-11-06T15:39:49Z',
                        productionStatus: 'INACTIVE',
                        stagingStatus: 'INACTIVE',
                        ruleFormat: 'v2018-09-12',
                        versions: {
                            items: [
                                {
                                    propertyVersion: 1,
                                    updatedByUser: 'dummy@gmail.com',
                                    updatedDate: '2018-11-06T15:39:49Z',
                                    productionStatus: 'INACTIVE',
                                    stagingStatus: 'INACTIVE',
                                    productId: 'Web_App_Accel',
                                    ruleFormat: 'v2018-09-12'
                                }
                            ]
                        }
                    }
                    resolve(info);
                })
            );
        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });

        project = devops.getProject(projectName, false);
        environment = project.getEnvironment(projectName);

        let existsTD= td.function();
        td.when(existsTD()).thenReturn(false, false);
        project.exists = existsTD;

        let createHostnamesFileTD = td.function();
        td.when(createHostnamesFileTD()).thenDo(function(){
                const domain = this.project.projectName;
                const edgeDomain = this.getEnvironmentInfo().isSecure ? EdgeDomains.EDGE_KEY : EdgeDomains.EDGE_SUITE;

                let hostnames = [];
                this.project.storeEnvironmentHostnames(this.name, hostnames);
            }
        );

        environment.createHostnamesFile = createHostnamesFileTD;

    });

    it('import property with correct params and has edges without', async function() {
        devops.getProject = function(){
            return project;
        }
        project.getEnvironment = function(projectName){
            return environment;
        }
        await devops.importProperty({
            propertyName: projectName,
            productId: "Web_App_Accel",
            contractId: "1-1TJZH5",
            groupId: 61726
        });
    });
});

describe('Snippets update property integration tests', function() {
    let utils;
    let projectName = "new.snippets.com";
    let testProjectExistingName = "pull-snippets.com";
    let devops;
    let regularUtils;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);

        }

        exists() {
            return this.projectName === testProjectExistingName;
        }

        loadEnvironmentInfo() {
            let infoPath = path.join(this.projectFolder, "envInfo.json");
            utils.touch(infoPath);
            if (this.utils.fileExists(infoPath)) {
                return this.utils.readJsonFile(infoPath);
            }
            return null;
        }

        checkInfoPath(infoPath){
            utils.touch(infoPath);
        }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));

        let testData = regularUtils.readJsonFile(path.join(baseDir, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);

        let searchResultPath = path.join(baseDir, "testdata/update.json");
        let result = regularUtils.readJsonFile(searchResultPath);
        td.when(papiClass.prototype.findProperty(testProjectExistingName)).thenReturn(
            new Promise((resolve, reject) => {
                resolve(result);
            })
        );

        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.latestVersion);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionRules(411089, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = helpers.clone(testRuleTree);
                    delete testRuleTreeCopy["warnings"];
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyInfo(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "411089",
                                    "propertyName": "pull-snippets.com",
                                    "latestVersion": 9,
                                    "stagingVersion": 4,
                                    "productionVersion": 2,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.propertyActivateStatus(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let activations = {
                        "accountId": "act_1-1TJZFB",
                        "contractId": "ctr_1-1TJZH5",
                        "groupId": "grp_15225",
                        "activations": {
                            "items": [
                                {
                                    "activationId": "atv_6405831",
                                    "propertyName": "pull-snippets.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 2,
                                    "network": "PRODUCTION",
                                    "activationType": "ACTIVATE",
                                    "status": "ACTIVE",
                                    "submitDate": "2019-01-15T14:06:47Z",
                                    "updateDate": "2019-01-15T14:06:50Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ]
                                },
                                {
                                    "activationId": "atv_6405830",
                                    "propertyName": "pull-snippets.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 4,
                                    "network": "STAGING",
                                    "activationType": "ACTIVATE",
                                    "status": "ACTIVE",
                                    "submitDate": "2019-01-15T14:05:42Z",
                                    "updateDate": "2019-01-15T14:06:40Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ],
                                    "fmaActivationState": "deployed"
                                }
                            ]
                        }
                    };
                    resolve(activations);
                })
            );



        td.when(papiClass.prototype.getPropertyVersion(411089,9))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 9,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "INACTIVE",
                                "stagingStatus" : "INACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,2))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 2,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "ACTIVE",
                                "stagingStatus" : "INACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,4))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 4,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "INACTIVE",
                                "stagingStatus" : "ACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionHostnames(411089, 9))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "accountId": "1-1TJZFB",
                        "contractId": "1-1TJZH5",
                        "groupId": "15225",
                        "propertyId": "488349",
                        "propertyName": "testing-snippets",
                        "propertyVersion": 9,
                        "hostnames": {
                            "items": [{
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3248236",
                                "cnameFrom": "testing-snippets-pull.com",
                                "cnameTo": "testing-snippets-pull.com.edgesuite.net"
                            }, {
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3216762",
                                "cnameFrom": "testing-snippets.com",
                                "cnameTo": "testing-snippets.edgesuite.net"
                            }]
                        }
                    })
                })
            );


        let envSnippets = td.constructor(EnvironmentSnippets);

        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });
    });

    it('createPipeline with propertyId', async function() {
        await devops.updateProperty({
            projectName: testProjectExistingName,
            variableMode: "no-var"
        });
    });
});


describe('Snippets update uservar property integration tests', function() {
    let utils;
    let testProjectExistingName = "pull-snippets-uservar.com";
    let devops;
    let regularUtils;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);

        }

        exists() {
            return this.projectName === testProjectExistingName;
        }

        loadEnvironmentInfo() {
            let infoPath = path.join(this.projectFolder, "envInfo.json");
            utils.touch(infoPath);
            if (this.utils.fileExists(infoPath)) {
                return this.utils.readJsonFile(infoPath);
            }
            return null;
        }

        checkInfoPath(infoPath){
            utils.touch(infoPath);
        }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(baseDir, "testdata", "import.testruletree.variables.json"));

        let testData = regularUtils.readJsonFile(path.join(baseDir, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);

        let searchResultPath = path.join(baseDir, "testdata/update.json");
        let result = regularUtils.readJsonFile(searchResultPath);
        td.when(papiClass.prototype.findProperty(testProjectExistingName)).thenReturn(
            new Promise((resolve, reject) => {
                resolve(result);
            })
        );

        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.latestVersion);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionRules(411089, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = helpers.clone(testRuleTree);
                    delete testRuleTreeCopy["warnings"];
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyInfo(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "411089",
                                    "propertyName": "pull-snippets.com",
                                    "latestVersion": 9,
                                    "stagingVersion": 4,
                                    "productionVersion": 2,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.propertyActivateStatus(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let activations = {
                        "accountId": "act_1-1TJZFB",
                        "contractId": "ctr_1-1TJZH5",
                        "groupId": "grp_15225",
                        "activations": {
                            "items": [
                                {
                                    "activationId": "atv_6405831",
                                    "propertyName": "pull-snippets.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 2,
                                    "network": "PRODUCTION",
                                    "activationType": "ACTIVATE",
                                    "status": "ACTIVE",
                                    "submitDate": "2019-01-15T14:06:47Z",
                                    "updateDate": "2019-01-15T14:06:50Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ]
                                },
                                {
                                    "activationId": "atv_6405830",
                                    "propertyName": "pull-snippets.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 4,
                                    "network": "STAGING",
                                    "activationType": "ACTIVATE",
                                    "status": "ACTIVE",
                                    "submitDate": "2019-01-15T14:05:42Z",
                                    "updateDate": "2019-01-15T14:06:40Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ],
                                    "fmaActivationState": "deployed"
                                }
                            ]
                        }
                    };
                    resolve(activations);
                })
            );



        td.when(papiClass.prototype.getPropertyVersion(411089,9))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 9,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "INACTIVE",
                                "stagingStatus" : "INACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,2))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 2,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "ACTIVE",
                                "stagingStatus" : "INACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,4))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 4,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "INACTIVE",
                                "stagingStatus" : "ACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionHostnames(411089, 9))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "accountId": "1-1TJZFB",
                        "contractId": "1-1TJZH5",
                        "groupId": "15225",
                        "propertyId": "488349",
                        "propertyName": "testing-snippets",
                        "propertyVersion": 9,
                        "hostnames": {
                            "items": [{
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3248236",
                                "cnameFrom": "testing-snippets-pull.com",
                                "cnameTo": "testing-snippets-pull.com.edgesuite.net"
                            }, {
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3216762",
                                "cnameFrom": "testing-snippets.com",
                                "cnameTo": "testing-snippets.edgesuite.net"
                            }]
                        }
                    })
                })
            );


        let envSnippets = td.constructor(EnvironmentSnippets);

        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });
    });

    it('createPipeline with propertyId', async function() {
        await devops.updateProperty({
            projectName: testProjectExistingName,
            variableMode: "user-var-value"
        });
    });
});

describe('Snippets update property integration tests - with pending activations', function() {
    let utils;
    let projectName = "new.snippets.com";
    let testProjectExistingName = "pull-snippets-pending.com";
    let devops;
    let regularUtils;

    class TestProject extends SnippetsProject {
        constructor(projectName, dependencies) {
            dependencies.getUtils = function() {
                return utils;
            };
            super(projectName, dependencies);

        }

        exists() {
            return this.projectName === testProjectExistingName;
        }

        loadEnvironmentInfo() {
            let infoPath = path.join(this.projectFolder, "envInfo.json");
            utils.touch(infoPath);
            if (this.utils.fileExists(infoPath)) {
                return this.utils.readJsonFile(infoPath);
            }
            return null;
        }

        checkInfoPath(infoPath){
            utils.touch(infoPath);
        }
    }

    before(function () {
        //these changes represent user edits after project creation.
        utils = new VerifyUtils(pretendEmpty = true);
        utils.touch(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
        let regularUtils = new Utils();
        let testRuleTree = regularUtils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));

        let testData = regularUtils.readJsonFile(path.join(baseDir, "testdata", "createProjectData.json"));
        let papiClass = td.constructor(PAPI);

        let searchResultPath = path.join(baseDir, "testdata/update.json");
        let result = regularUtils.readJsonFile(searchResultPath);
        td.when(papiClass.prototype.findProperty(testProjectExistingName)).thenReturn(
            new Promise((resolve, reject) => {
                resolve(result);
            })
        );

        td.when(papiClass.prototype.getClientSettings())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "ruleFormat" : "v2018-02-27",
                        "usePrefixes" : false
                    });
                })
            );

        td.when(papiClass.prototype.latestPropertyVersion(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.latestVersion);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionRules(411089, 1, "v2018-02-27"))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = helpers.clone(testRuleTree);
                    delete testRuleTreeCopy["warnings"];
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyInfo(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "properties": {
                            "items": [
                                {
                                    "accountId": "1-1TJZFB",
                                    "contractId": "1-1TJZH5",
                                    "groupId": "15225",
                                    "propertyId": "411089",
                                    "propertyName": "pull-snippets-pending.com",
                                    "latestVersion": 9,
                                    "stagingVersion": 4,
                                    "productionVersion": 2,
                                    "assetId": "10597561"
                                }
                            ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.activationStatus(411089, 6405831)).thenReturn(new Promise((resolve, reject) => {
                let activations = {
                    "accountId": "1-1TJZFB",
                    "contractId": "1-1TJZH5",
                    "groupId": "61726",
                    "activations": {
                        "items": [{
                            "activationId": "6405831",
                            "propertyName": "pull-snippets-pending.com",
                            "propertyId": "prp_411089",
                            "propertyVersion": 9,
                            "network": "PRODUCTION",
                            "activationType": "ACTIVATE",
                            "status": "PENDING",
                            "submitDate": "2018-01-26T18:26:38Z",
                            "updateDate": "2018-01-26T18:26:56Z",
                            "note": "   ",
                            "notifyEmails": ["j@m.com"]
                        }]
                    }
                };
                resolve(activations);

            })
        );
        td.when(papiClass.prototype.activationStatus(411089, 6405830)).thenReturn(new Promise((resolve, reject) => {
            let activations = {
                "accountId": "1-1TJZFB",
                "contractId": "1-1TJZH5",
                "groupId": "61726",
                "activations": {
                    "items": [{
                        "activationId": "6405831",
                        "propertyName": "pull-snippets-pending.com",
                        "propertyId": "prp_411089",
                        "propertyVersion": 9,
                        "network": "STAGING",
                        "activationType": "ACTIVATE",
                        "status": "PENDING",
                        "submitDate": "2018-01-26T18:26:38Z",
                        "updateDate": "2018-01-26T18:26:56Z",
                        "note": "   ",
                        "notifyEmails": ["j@m.com"]
                    }]
                }
            };
            resolve(activations);

        }));

        td.when(papiClass.prototype.propertyActivateStatus(411089))
            .thenReturn(new Promise((resolve, reject) => {
                    let activations = {
                        "accountId": "act_1-1TJZFB",
                        "contractId": "ctr_1-1TJZH5",
                        "groupId": "grp_15225",
                        "activations": {
                            "items": [
                                {
                                    "activationId": "atv_6405831",
                                    "propertyName": "pull-snippets-pending.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 9,
                                    "network": "PRODUCTION",
                                    "activationType": "ACTIVATE",
                                    "status": "PENDING",
                                    "submitDate": "2019-01-15T14:06:47Z",
                                    "updateDate": "2019-01-15T14:06:50Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ]
                                },
                                {
                                    "activationId": "atv_6405830",
                                    "propertyName": "pull-snippets-pending.com",
                                    "propertyId": "prp_411089",
                                    "propertyVersion": 9,
                                    "network": "STAGING",
                                    "activationType": "ACTIVATE",
                                    "status": "PENDING",
                                    "submitDate": "2019-01-15T14:05:42Z",
                                    "updateDate": "2019-01-15T14:06:40Z",
                                    "note": "Property Manager CLI Activation",
                                    "notifyEmails": [
                                        "jachin@akamai.com"
                                    ],
                                    "fmaActivationState": "deployed"
                                }
                            ]
                        }
                    };
                    resolve(activations);
                })
            );



        td.when(papiClass.prototype.getPropertyVersion(411089,9))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 9,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "PENDING",
                                "stagingStatus" : "PENDING",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,2))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 2,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "ACTIVE",
                                "stagingStatus" : "INACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );

        td.when(papiClass.prototype.getPropertyVersion(411089,4))
            .thenReturn(new Promise((resolve, reject) => {
                    let testRuleTreeCopy = {
                        "propertyId" : "411089",
                        "propertyName" : "pull-snippets.com",
                        "accountId" : "1-1TJZFB",
                        "contractId" : "1-1TJZH5",
                        "groupId" : "15225",
                        "assetId" : "10597561",
                        "versions" : {
                            "items" : [ {
                                "propertyVersion" : 4,
                                "updatedByUser" : "z35aszfk53n362pc",
                                "updatedDate" : "2018-09-27T18:30:45Z",
                                "productionStatus" : "INACTIVE",
                                "stagingStatus" : "ACTIVE",
                                "productId" : "Web_App_Accel",
                                "ruleFormat" : "v2018-02-27"
                            } ]
                        }
                    };
                    resolve(testRuleTreeCopy);
                })
            );


        td.when(papiClass.prototype.getPropertyVersionHostnames(411089, 9))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        "accountId": "1-1TJZFB",
                        "contractId": "1-1TJZH5",
                        "groupId": "15225",
                        "propertyId": "488349",
                        "propertyName": "testing-snippets",
                        "propertyVersion": 9,
                        "hostnames": {
                            "items": [{
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3248236",
                                "cnameFrom": "testing-snippets-pull.com",
                                "cnameTo": "testing-snippets-pull.com.edgesuite.net"
                            }, {
                                "cnameType": "EDGE_HOSTNAME",
                                "edgeHostnameId": "3216762",
                                "cnameFrom": "testing-snippets.com",
                                "cnameTo": "testing-snippets.edgesuite.net"
                            }]
                        }
                    })
                })
            );


        let envSnippets = td.constructor(EnvironmentSnippets);

        devops = createDevOps({
            devopsHome : devopsHome,
            papiClass: papiClass,
            projectClass: TestProject,
            devOpsClass: DevOpsSnippets,
            environmentClass: EnvironmentSnippets,
            version: "0.1.10"
        });
    });

    it('createPipeline with propertyId', async function() {
        await devops.updateProperty({
            projectName: testProjectExistingName,
            variableMode: "no-var"
        });
    });


});


describe('Snippets merge integration tests', function() {
    //This integration tests looks incomplete.
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
            devopsHome, papiClass, utilsClass,
        });
    });

    it('Merge ', function() {
        return throwsAsync(function() {
            return devops.merge("testproject.com", "qa");
        }, "Error: File not found variables.json");
    });
});

describe('Snippets getProject test', function() {
    let devops;

    before(function () {
        devops = createDevOps({
            devopsHome,
            devOpsClass,
            projectClass,
            environmentClass
        });
    });

    it('getProject', function() {
        let project = devops.getProject("dummy", false);
        assert.isNotOk(project.exists());
    });
});

describe('Snippets email validation test', function(){
    let devops;
    beforeEach(function () {
        devops = createDevOps({
            devopsHome,
            devOpsClass,
            projectClass,
            environmentClass
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

describe('Snippets Update Devops-settings Test', function(){
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

describe('Snippets Promote test', function() {
    let devops;
    let projectClass;

    beforeEach(function () {
        projectClass = td.constructor(SnippetsProject);
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

    it('promote with no email', function() {
        devops.promote("foobar", "qa", "staging", "", "Message", true);
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["noreply@akamai.com"]), "Message", true));
    });

    it('activate with bad default and and a bad cli option emails', function() {
        devops.devopsSettings.emails = ["a ", "spam@egg.com"];
        assert.throws(() => {
            devops.promote("foobar", "qa", "staging", ", b,spom@ugg.com");
        }, "The emails 'b,a' are not valid.");
    });
});


describe('Snippets Deactivate test', function() {
    let devops;
    let projectClass;

    beforeEach(function () {
        projectClass = td.constructor(SnippetsProject);
        td.when(projectClass.prototype.exists()).thenReturn(true);
        devops = createDevOps({
            devopsHome,
            devOpsClass,
            projectClass,
        });
    });

    it('deactivate with command line email', function() {
        devops.deactivate("foobar", "staging", "foo@bar.com,spam@egg.com", "Message");
        td.verify(projectClass.prototype.deactivate("foobar", "staging", new Set(["foo@bar.com", "spam@egg.com"]), "Message"));
    });

    it('deactivate with default emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        devops.deactivate("foobar", "staging", undefined, "Message");
        td.verify(projectClass.prototype.deactivate("foobar", "staging", new Set(["foo@bar.com", "spam@egg.com"]), "Message"));
    });
    it('deactivate with default and cli option emails', function() {
        devops.devopsSettings.emails = ["foo@bar.com", "spam@egg.com"];
        devops.deactivate("foobar", "staging", "fee@baz.com,spom@ugg.com", "Message");
        td.verify(projectClass.prototype.deactivate("foobar", "staging",
            new Set(["foo@bar.com", "spam@egg.com", "fee@baz.com", "spom@ugg.com"]), "Message"));
    });

    it('deactivate with no email', function() {
        devops.promote("foobar", "qa", "staging", "", "Message", true);
        td.verify(projectClass.prototype.promote("qa", "staging", new Set(["noreply@akamai.com"]), "Message", true));
    });

    it('deactivate with bad default and and a bad cli option emails', function() {
        devops.devopsSettings.emails = ["a ", "spam@egg.com"];
        assert.throws(() => {
            devops.deactivate("foobar", "staging", ", b,spom@ugg.com");
        }, "The emails 'b,a' are not valid.");
    });
});