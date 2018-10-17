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
            "etag": "7cf327786d5a73aa6340452a064fb77589f750b0",
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
            "etag": "7cf327786d5a73aa6340452a064fb77589f750b0",
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
        td.when(papiClass.prototype.createProperty(projectName, "Web_App_Accel", "1-1TJZH5", 61726))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(testData.qa.create);
                })
            );

        td.when(papiClass.prototype.createProperty(testProjectExistingName, "Web_App_Accel", "1-1TJZH5", 61726))
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

    it('promote with bad default and and a bad cli option emails', function() {
        devops.devopsSettings.emails = ["a ", "spam@egg.com"];
        assert.throws(() => {
            devops.promote("foobar", "qa", "staging", ", b,spom@ugg.com");
        }, "The emails 'b,a' are not valid.");    });
});
