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


global.td = require('testdouble');
const path = require('path');
const chai = require('chai');
const assert = chai.assert;

const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.environment_tests");
const throwsAsync = require("./testutils").throwsAsync;

const VerifyUtils = require('./verify-utils');
const RoUtils = require('./ro-utils');
const createOverlayUtils = require('./overlay-utils');
const Project = require('../src/project');
const Environment = require('../src/environment');
const Template = require('../src/template');
const EL = require('../src/el');
const errors = require('../src/errors');
const helpers = require('../src/helpers');

describe('Environment static function tests', function () {
    it('_extractPropertyId should be able to extract the propertyId ', function () {
        let pcData = {
            "propertyLink": "/papi/v0/properties/prp_410651?groupId=grp_61726&contractId=ctr_1-1TJZH5"
        };
        assert.equal(Environment._extractPropertyId(pcData), 410651);

        pcData.propertyLink = "/papi/v0/properties/410651?groupId=grp_61726&contractId=ctr_1-1TJZH5";
        assert.equal(Environment._extractPropertyId(pcData), 410651);
    });


    it('_extractEdgeHostnameId should be able to extract the edgehostnameId ', function () {
        let pcData = { edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726' };
        assert.equal(Environment._extractEdgeHostnameId(pcData), 2683119);

        pcData.edgeHostnameLink = '/papi/v0/edgehostnames/ehn_2683119?contractId=1-1TJZH5&groupId=61726';
        assert.equal(Environment._extractEdgeHostnameId(pcData), 2683119);
    });

    it('_extractActivationId testing extraction of activation ID', function () {
        let activationData = {
            "activationLink" : "/papi/v0/properties/414298/activations/4998030"
        };

        assert.equal(Environment._extractActivationId(activationData), 4998030);

        activationData.edgeHostnameLink = "/papi/v0/properties/prp_414298/activations/atv_4998030";
        assert.equal(Environment._extractActivationId(activationData), 4998030);
    });

    it('_extractVersionId testing extraction of version id', function () {
        let versionData = {
            "versionLink": "/papi/v0/properties/429569/versions/2"
        };

        assert.equal(Environment._extractVersionId(versionData), 2);

        versionData.versionLink = "/papi/v0/properties/prp_429569/versions/2";
        assert.equal(Environment._extractVersionId(versionData), 2);
    });

});

describe('Create environment tests', function () {
    let papi;
    let project;
    let projectName = "awesomeproject.com";
    before(function () {
        project = td.object(['storeEnvironmentInfo', 'loadEnvironmentInfo', 'getProjectInfo', 'getName']);
        td.when(project.getProjectInfo()).thenReturn({
            name: projectName,
            productId: "WAA",
            contractId: "BAZ234",
            groupId: 666,
            environments: ["blah", "blubb", "zuck"]
        });
        td.when(project.getName()).thenReturn(projectName);
        td.when(project.loadEnvironmentInfo("testenv")).thenReturn(null);

        papi = td.object(['createProperty', 'latestPropertyVersion']);
        td.when(papi.createProperty("testenv." + projectName, "WAA", "BAZ234", 666)).thenReturn({
            "propertyLink": "/papi/v0/properties/prp_410651?groupId=grp_61726&contractId=ctr_1-1TJZH5"
        });
        td.when(papi.latestPropertyVersion(410651)).thenReturn({
            "propertyId": "410651",
            "propertyName": "jmtestdevops1",
            "accountId": "1-1TJZFB",
            "contractId": "1-1TJZH5",
            "groupId": "61726",
            "assetId": "10501028",
            "versions": {
                "items": [
                    {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2017-11-07T19:45:55Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "INACTIVE",
                        "etag": "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });
    });

    it('create Environment', async function () {
        let env = new Environment('testenv', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });
        await env.create();
        td.verify(project.storeEnvironmentInfo(td.matchers.contains({
            name: "testenv",
            propertyId: 410651,
            propertyName: "testenv.awesomeproject.com",
            latestVersionInfo: {
                propertyVersion: 1,
                updatedByUser: "jpws7ubcv5jjsv37",
                updatedDate: "2017-11-07T19:45:55Z",
                productionStatus: "INACTIVE",
                stagingStatus: "INACTIVE",
                etag: "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                productId: "Web_App_Accel",
                ruleFormat: "latest"
            }
        })));
    });

    it('create Environment template', function () {
        let utils = createOverlayUtils(VerifyUtils, function (path, data) {
            if (path.endsWith("variableDefinitions.json")) {
                data.definitions.cpCode.default = 98765;
            }
            return data;
        });

        let devOps = {
            "devopsHome": __dirname
        };
        let myProject = new Project("testproject.com", {
            devops: devOps,
            getUtils : function() {
                return utils;
            },
            getEL: function (context, loadFunction) {
                return new EL(context, loadFunction)
            }
        });
        myProject.projectInfo = {
            productId: "Web_App_Accel"
        };
        let env = new Environment('qa', {
            project: myProject,
            getPAPI: function () {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });
        let testRuleTree = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        env.createTemplate(testRuleTree);
    });
});

/**
 * These tests need to be run in the order they show up in the code.
 * They depend on the same state and in the order the state is being changed
 * by one test after the other.
 */
describe('Environment Merge, Save, Promote and check status tests', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": __dirname
        };

        project = new Project("testproject.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/4/options/tieredDistributionMap", "main.json")).thenReturn({
            template: "main.json",
            variables: [],
            value: "CH9"
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value", "main.json")).thenReturn({
            template: "main.json",
            variables: [],
            value: {
                "id": 98765
            }
        });

        papi = td.object(['validatePropertyVersionRules', 'setRuleFormat', 'createEdgeHostname',
            'storePropertyVersionRules', 'storePropertyVersionHostnames', 'listEdgeHostnames',
            'activateProperty', 'activationStatus', 'latestPropertyVersion', 'getPropertyVersion']);

        td.when(papi.createEdgeHostname("1-1TJZH5", 61726, td.matchers.isA(Object))).thenReturn(    {
                edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726'
            }
        );

        let edgeHostnames = utils.readJsonFile(path.join(__dirname, "testdata", "edgeHostnames.json"));

        td.when(papi.listEdgeHostnames("1-1TJZH5", 61726)).thenReturn(edgeHostnames);

        td.when(papi.storePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn({
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:05Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "etag": "7cf327786d5a73aa6340452a064fb77589f750b0",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });

        td.when(papi.latestPropertyVersion(411089)).thenReturn({
            "propertyId": "411089",
            "propertyName": "jmtestdevops1",
            "accountId": "1-1TJZFB",
            "contractId": "1-1TJZH5",
            "groupId": "61726",
            "assetId": "10501028",
            "versions": {
                "items": [
                    {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2017-11-07T19:45:55Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "ACTIVE",
                        "etag": "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });

        td.when(papi.getPropertyVersion(411089, 1)).thenReturn({
            "propertyId": "411089",
            "propertyName": "jmtestdevops1",
            "accountId": "1-1TJZFB",
            "contractId": "1-1TJZH5",
            "groupId": "61726",
            "assetId": "10501028",
            "versions": {
                "items": [
                    {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2017-11-07T19:45:55Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "ACTIVE",
                        "etag": "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });

        td.when(papi.getPropertyVersion(411089, 2)).thenReturn({
            "propertyId": "411089",
            "propertyName": "jmtestdevops1",
            "accountId": "1-1TJZFB",
            "contractId": "1-1TJZH5",
            "groupId": "61726",
            "assetId": "10501028",
            "versions": {
                "items": [
                    {
                        "propertyVersion": 2,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2017-11-07T19:45:55Z",
                        "productionStatus": "ACTIVE",
                        "stagingStatus": "INACTIVE",
                        "etag": "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });

        td.when(papi.activateProperty(411089, 1, "STAGING", ['foo@bar.com'])).thenReturn({
            "activationLink" : "/papi/v0/properties/411089/activations/5355264"
        });

        td.when(papi.activateProperty(411089, 1, "PRODUCTION", ['foo@bar.com'])).thenReturn({
            "activationLink" : "/papi/v0/properties/411089/activations/5355557"
        });

        td.when(papi.activateProperty(411089, 2, "PRODUCTION", ['foo@bar.com'])).thenReturn({
            "activationLink" : "/papi/v0/properties/411089/activations/5355558"
        });

        td.when(papi.activationStatus(411089, 5355264)).thenReturn(helpers.clone({
            "accountId" : "1-1TJZFB",
            "contractId" : "1-1TJZH5",
            "groupId" : "61726",
            "activations" : {
                "items" : [ {
                    "activationId" : "5355264",
                    "propertyName" : "qa.devopsdemolive.com",
                    "propertyId" : "411089",
                    "propertyVersion" : 1,
                    "network" : "STAGING",
                    "activationType" : "ACTIVATE",
                    "status" : "PENDING",
                    "submitDate" : "2018-01-22T15:35:45Z",
                    "updateDate" : "2018-01-22T15:40:21Z",
                    "note" : "   ",
                    "notifyEmails" : [ "jm@menzel.com" ]
                } ]
            }
        }), helpers.clone({
            "accountId" : "1-1TJZFB",
            "contractId" : "1-1TJZH5",
            "groupId" : "61726",
            "activations" : {
                "items" : [ {
                    "activationId" : "5355264",
                    "propertyName" : "qa.devopsdemolive.com",
                    "propertyId" : "411089",
                    "propertyVersion" : 1,
                    "network" : "STAGING",
                    "activationType" : "ACTIVATE",
                    "status" : "ACTIVE",
                    "submitDate" : "2018-01-22T15:35:45Z",
                    "updateDate" : "2018-01-22T15:40:21Z",
                    "note" : "   ",
                    "notifyEmails" : [ "jm@menzel.com" ]
                } ]
            }
        }));

        td.when(papi.activationStatus(411089, 5355557)).thenReturn({
            "accountId" : "1-1TJZFB",
                "contractId" : "1-1TJZH5",
                "groupId" : "61726",
                "activations" : {
                "items" : [ {
                    "activationId" : "5355557",
                    "propertyName" : "qa.devopsdemolive.com",
                    "propertyId" : "411089",
                    "propertyVersion" : 1,
                    "network" : "PRODUCTION",
                    "activationType" : "ACTIVATE",
                    "status" : "FAILED",
                    "submitDate" : "2018-01-26T18:26:38Z",
                    "updateDate" : "2018-01-26T18:26:56Z",
                    "note" : "   ",
                    "notifyEmails" : [ "j@m.com" ]
                } ]
            }
        });

        td.when(papi.activationStatus(411089, 5355558)).thenReturn({
            "accountId" : "1-1TJZFB",
            "contractId" : "1-1TJZH5",
            "groupId" : "61726",
            "activations" : {
                "items" : [ {
                    "activationId" : "5355558",
                    "propertyName" : "qa.devopsdemolive.com",
                    "propertyId" : "411089",
                    "propertyVersion" : 2,
                    "network" : "PRODUCTION",
                    "activationType" : "ACTIVATE",
                    "status" : "ACTIVE",
                    "submitDate" : "2018-01-26T18:26:38Z",
                    "updateDate" : "2018-01-26T18:26:56Z",
                    "note" : "   ",
                    "notifyEmails" : [ "j@m.com" ]
                } ]
            }
        });

        qaEnvironment = new Environment('qa', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function() {
                return merger;
            }
        });
    });

    it('Merge test with validation errors', async function () {
        let validateResponse = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));

        validateResponse.errors = [ {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/generic_behavior_issue.cpcode_not_available",
            "errorLocation" : "#/rules/behaviors/1/options/value",
            "detail" : "The CP Code within `Content Provider Code` cannot be used with this property. If you just created this CP Code, please try again later. For more information see <a href=\"/dl/rd/propmgr/PropMgr_CSH.htm#1069\" target=\"_blank\">Content Provider Codes</a>."
        } ];

        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            validateResponse
        );

        let results = await qaEnvironment.merge();
        assert.deepEqual(results.validationErrors, [{
            "type": "https://problems.luna.akamaiapis.net/papi/v0/validation/generic_behavior_issue.cpcode_not_available",
            "errorLocation": {
                "template": "main.json",
                "variables": [],
                "value": {
                    "id": 98765
                }
            },
            "detail": 'The CP Code within \`Content Provider Code\` cannot be used with this property. If you just created this CP Code, please try again later. For more information see <a href="/dl/rd/propmgr/PropMgr_CSH.htm#1069" target="_blank">Content Provider Codes</a>.'
        }]);
    });

    it('regular merge test with warnings', async function () {
        let ruleTree = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        ruleTree.errors = [];
        ruleTree.warnings = [ {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/product_behavior_issue.cpcode_incorrect_product",
            "errorLocation" : "#/rules/behaviors/1/options/value",
            "detail" : "The CP Code within `Content Provider Code` is not configured for use with the product used by this property, Web Application Accelerator. Traffic for this property might not show up under the correct traffic reports."
        } ];

        qaEnvironment.getEnvironmentInfo().lastValidatedHash = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221aaa2";

        let results = await qaEnvironment.merge();
        assert.deepEqual(results.validationWarnings, [ {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/product_behavior_issue.cpcode_incorrect_product",
            "errorLocation": {
                "template": "main.json",
                "value": {
                    "id": 98765
                },
                "variables": []
            },
            "detail" : "The CP Code within `Content Provider Code` is not configured for use with the product used by this property, Web Application Accelerator. Traffic for this property might not show up under the correct traffic reports."
        } ]);

        assert.deepEqual(qaEnvironment.getEnvironmentInfo().lastSaveWarnings, [{
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/product_behavior_issue.cpcode_incorrect_product",
            "errorLocation": {
                "template": "main.json",
                "value": {
                    "id": 98765
                },
                "variables": []
            },
            "detail" : "The CP Code within `Content Provider Code` is not configured for use with the product used by this property, Web Application Accelerator. Traffic for this property might not show up under the correct traffic reports."
        } ]);
    });

    it('regular merge test no warnings', async function () {
        let ruleTree = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        ruleTree.errors = [];
        ruleTree.warnings = [];

        qaEnvironment.getEnvironmentInfo().lastValidatedHash = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221bbb2";

        let results = await qaEnvironment.merge();
        assert.deepEqual(qaEnvironment.getEnvironmentInfo().lastSaveWarnings, []);
    });

    it('isDirty and isActive tests', function () {
        assert.equal(qaEnvironment.isDirty(), true);
        assert.equal(qaEnvironment.isActive("STAGING"), false);
    });

    it('createEdgeHostnames test', async function () {
        reportData = await qaEnvironment.createEdgeHostnames(qaEnvironment.getHostnames());
        assert.deepEqual(reportData, {
            "errors": [],
            "hostnamesCreated": [
                {
                  "id": 2683119,
                  "name": "qa.testproject.com.edgesuite.net"
               }
          ],
          "hostnamesFound": [
                {
                  "id": 2922843,
                    "name": "qa.securesite.com.edgekey.net"
            }
          ]
        });
        let hostnames = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/hostnames.json"));
        assert.strictEqual(hostnames[0].edgeHostnameId, 2683119);
        assert.strictEqual(hostnames[1].edgeHostnameId, 2922843);
    });

    it('save test', async function () {
        qaEnvironment.getEnvironmentInfo().lastSaveErrors = [{
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/product_behavior_issue.cpcode_incorrect_product",
            "errorLocation": {
                "template": "main.json",
                "value": {
                    "id": 98765
                },
                "variables": []
            },
            "detail" : "The CP Code within `Content Provider Code` is not configured for use with the product used by this property, Web Application Accelerator. Traffic for this property might not show up under the correct traffic reports."
        } ];
        let results = await qaEnvironment.save();
        assert.equal(results.storedRules, true);
        let envInfo = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/envInfo.json"));
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979");
        let hostnames = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/hostnames.json"));
        assert.equal(hostnames[0].edgeHostnameId, 2683119);
        assert.equal(qaEnvironment.isDirty(), false);
        qaEnvironment.getEnvironmentInfo().lastSaveErrors = [];
    });

    it('promote test staging', async function () {
        let result = await qaEnvironment.promote("STAGING", ['foo@bar.com']);
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 5355264
        });
        let envInfo = result.envInfo;
        assert.equal(envInfo.pendingActivations['STAGING'], 5355264);
        assert.deepEqual(envInfo, {
            name: "qa",
            propertyName: "qa.testproject.com",
            propertyId: 411089,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveWarnings: [],
            latestVersionInfo: {
                propertyVersion: 1,
                updatedByUser: "jpws7ubcv5jjsv37",
                updatedDate: "2017-11-13T21:49:05Z",
                productionStatus: "INACTIVE",
                stagingStatus: "PENDING",
                etag: "7cf327786d5a73aa6340452a064fb77589f750b0",
                productId: "Web_App_Accel",
                ruleFormat: "latest"
            },
            pendingActivations: {
                STAGING: 5355264
            }
        });
    });

    it('check staging promotion status test', async function () {
        let results = await qaEnvironment.checkPromotions();
        assert.deepEqual(results, {
            "promotionStatus": {
                "activeInProductionVersion": null,
                "activeInStagingVersion": null,
                "latestVersion": 1
            },
            "promotionUpdates": {
                "STAGING": {
                    "activationId": "5355264",
                    "activationType": "ACTIVATE",
                    "network": "STAGING",
                    "note": "   ",
                    "notifyEmails": [
                        "jm@menzel.com"
                    ],
                    "propertyId": "411089",
                    "propertyName": "qa.devopsdemolive.com",
                    "propertyVersion": 1,
                    "status": "PENDING",
                    "submitDate": "2018-01-22T15:35:45Z",
                    "updateDate": "2018-01-22T15:40:21Z"
                }
            }
        });

        results = await qaEnvironment.checkPromotions();
        assert.deepEqual(results, {
            "promotionStatus": {
                "activeInProductionVersion": null,
                "activeInStagingVersion": 1,
                "latestVersion": 1
            },
            "promotionUpdates": {
                "STAGING": {
                    "activationId": "5355264",
                    "activationType": "ACTIVATE",
                    "network": "STAGING",
                    "note": "   ",
                    "notifyEmails": [
                        "jm@menzel.com"
                    ],
                    "propertyId": "411089",
                    "propertyName": "qa.devopsdemolive.com",
                    "propertyVersion": 1,
                    "status": "ACTIVE",
                    "submitDate": "2018-01-22T15:35:45Z",
                    "updateDate": "2018-01-22T15:40:21Z"
                }
            }
        });

        envInfo = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'qa',
            propertyName: 'qa.testproject.com',
            propertyId: 411089,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveWarnings: [],
            latestVersionInfo:
            {
                propertyVersion: 1,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'INACTIVE',
                stagingStatus: 'ACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            },
            activeIn_STAGING_Info: {
                propertyVersion: 1,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'INACTIVE',
                stagingStatus: 'ACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            }
        });
        assert.equal(qaEnvironment.isActive("STAGING"), true);
    });

    it('check production promotion failed activation test', async function () {
        let promotionResult = await qaEnvironment.promote("PRODUCTION", ['foo@bar.com']);
        assert.deepEqual(promotionResult.pending, {
            network: "PRODUCTION",
            activationId: 5355557
        });
        let envInfo = promotionResult.envInfo;
        assert.equal(envInfo.pendingActivations['PRODUCTION'], 5355557);

        let results = await qaEnvironment.checkPromotions();
        versionInfo = await papi.latestPropertyVersion(411089).versions.items[0];
        assert.equal(versionInfo.productionStatus, "INACTIVE");

        assert.deepEqual(results, {
            "promotionStatus": {
                "activeInProductionVersion": null,
                "activeInStagingVersion": 1,
                "latestVersion": 1
            },
            "promotionUpdates": {
                "PRODUCTION": {
                    "activationId": "5355557",
                    "activationType": "ACTIVATE",
                    "network": "PRODUCTION",
                    "note": "   ",
                    "notifyEmails": [
                        "j@m.com"
                    ],
                    "propertyId": "411089",
                    "propertyName": "qa.devopsdemolive.com",
                    "propertyVersion": 1,
                    "status": "FAILED",
                    "submitDate": "2018-01-26T18:26:38Z",
                    "updateDate": "2018-01-26T18:26:56Z",
                }
            }
        });

        envInfo = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'qa',
            propertyName: 'qa.testproject.com',
            propertyId: 411089,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveWarnings: [],
            latestVersionInfo:
                {
                    propertyVersion: 1,
                    updatedByUser: 'jpws7ubcv5jjsv37',
                    updatedDate: '2017-11-07T19:45:55Z',
                    productionStatus: 'INACTIVE',
                    stagingStatus: 'ACTIVE',
                    etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                    productId: 'Web_App_Accel',
                    ruleFormat: 'latest'
                },
            activeIn_STAGING_Info: {
                propertyVersion: 1,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'INACTIVE',
                stagingStatus: 'ACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            }
        });
    });

    it('promote test production', async function () {
        qaEnvironment.getEnvironmentInfo().latestVersionInfo.propertyVersion = 2;
        qaEnvironment.getEnvironmentInfo().latestVersionInfo.stagingStatus = "INACTIVE";

        let result = await qaEnvironment.promote("PRODUCTION", ['foo@bar.com']);
        assert.deepEqual(result.pending, {
            network: "PRODUCTION",
            activationId: 5355558
        });
        let envInfo = result.envInfo;
        assert.equal(envInfo.pendingActivations['PRODUCTION'], 5355558);
        assert.deepEqual(envInfo, {
            name: "qa",
            propertyName: "qa.testproject.com",
            propertyId: 411089,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveWarnings: [],
            latestVersionInfo: {
                propertyVersion: 2,
                updatedByUser: "jpws7ubcv5jjsv37",
                updatedDate: "2017-11-07T19:45:55Z",
                productionStatus: "PENDING",
                stagingStatus: "INACTIVE",
                etag: "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                productId: "Web_App_Accel",
                ruleFormat: "latest"
            },
            activeIn_STAGING_Info: {
                propertyVersion: 1,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'INACTIVE',
                stagingStatus: 'ACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            },
            pendingActivations: {
                PRODUCTION: 5355558
            }
        });
    });

    it('promote test production already active', async function () {
        return throwsAsync(function() {
            return qaEnvironment.promote("PRODUCTION", ['foo@bar.com']);
        }, "Error: Activation for 'PRODUCTION' network already pending");
    });

    it('check production promotion status test', async function () {
        let results = await qaEnvironment.checkPromotions();
        assert.deepEqual(results, {
            "promotionStatus": {
                "activeInProductionVersion": 2,
                "activeInStagingVersion": 1,
                "latestVersion": 2
            },
            "promotionUpdates": {
                "PRODUCTION": {
                    "activationId": "5355558",
                    "activationType": "ACTIVATE",
                    "network": "PRODUCTION",
                    "note": "   ",
                    "notifyEmails": [
                        "j@m.com"
                    ],
                    "propertyId": "411089",
                    "propertyName": "qa.devopsdemolive.com",
                    "propertyVersion": 2,
                    "status": "ACTIVE",
                    "submitDate": "2018-01-26T18:26:38Z",
                    "updateDate": "2018-01-26T18:26:56Z",
                }
            }
        });

        envInfo = utils.readJsonFile(path.join(__dirname, "testproject.com/environments/qa/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'qa',
            propertyName: 'qa.testproject.com',
            propertyId: 411089,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveWarnings: [],
            latestVersionInfo: {
                propertyVersion: 2,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'ACTIVE',
                stagingStatus: 'INACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            },
            activeIn_STAGING_Info: {
                propertyVersion: 1,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'INACTIVE',
                stagingStatus: 'ACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            },
            activeIn_PRODUCTION_Info: {
                propertyVersion: 2,
                updatedByUser: 'jpws7ubcv5jjsv37',
                updatedDate: '2017-11-07T19:45:55Z',
                productionStatus: 'ACTIVE',
                stagingStatus: 'INACTIVE',
                etag: '42f95e8b3cd22579a09cd68f27a477f53cfd2f5e',
                productId: 'Web_App_Accel',
                ruleFormat: 'latest'
            }
        });
        assert.equal(qaEnvironment.isActive("STAGING"), true);
        assert.equal(qaEnvironment.isActive("PRODUCTION"), true);
    });

    it('promote test production already active', async function () {
        return throwsAsync(function() {
            return qaEnvironment.promote("PRODUCTION", ['foo@bar.com']);
        }, "Error: Latest version already active in 'PRODUCTION' network");
    });

    it('Merge test with validation errors and 400 error response', async function () {
        utils.clear(); //clears all the changes in RoUtils.
        let validationError = {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/json-schema-invalid",
            "title" : "Input does not match schema",
            "status" : 400,
            "detail" : "Your input has a syntax problem.  Please double check against the schema.",
            "instance" : "https://akab-tharcicd7r6rf4id-lufdm6gk73m2ihqb.luna.akamaiapis.net/papi/v0/properties/444809/versions/15/rules?dryRun=true#04823546-5e91-45ca-9d41-14bdcb428f41",
            "schemaLink" : "/papi/v0/schemas/products/Rich_Media_Accel/v2017-06-19",
            "errors" : [ {
                "location" : "/rules/behaviors/4/options/tieredDistributionMap",
                "schemaLocation" : "/definitions/catalog/behaviors/tieredDistribution/properties/options/properties/tieredDistributionMap",
                "detail" : "instance value (\"CH9\") not found in enum (possible values: [\"CH2\",\"CHAPAC\",\"CHEU2\",\"CHEUS2\",\"CHCUS2\",\"CHWUS2\",\"CHAUS\",\"CH\"])",
                "foundValue" : "CH9",
                "allowedValues" : [ "CH2", "CHAPAC", "CHEU2", "CHEUS2", "CHCUS2", "CHWUS2", "CHAUS", "CH" ]
            } ]
        };

        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenThrow(
            new errors.RestApiError(`Request failed, status code: 400,` +
                `\nResponse Body: '${validationError}'`, "api_client_error", 400, validationError)
        );

        qaEnvironment.__envInfo = null;

        let results = await qaEnvironment.merge();
        assert.deepEqual(results.validationErrors, [{
            "allowedValues": [
                "CH2",
                "CHAPAC",
                "CHEU2",
                "CHEUS2",
                "CHCUS2",
                "CHWUS2",
                "CHAUS",
                "CH"
            ],
            "detail": "instance value (\"CH9\") not found in enum (possible values: [\"CH2\",\"CHAPAC\",\"CHEU2\",\"CHEUS2\",\"CHCUS2\",\"CHWUS2\",\"CHAUS\",\"CH\"])",
            "foundValue": "CH9",
            "location": {
                "template": "main.json",
                "value": "CH9",
                "variables": []
            },
            "schemaLocation": "/definitions/catalog/behaviors/tieredDistribution/properties/options/properties/tieredDistributionMap"
        }]);
    });

});

describe('Environment merge and save new version after activation', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();
    let envInfoPath;

    before(function () {
        devOps = {
            "devopsHome": __dirname
        };

        project = new Project("testproject.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(__dirname, "testproject.com", "dist", "qa.testproject.com.papi.json"))
        });

        papi = td.object(['validatePropertyVersionRules', 'setRuleFormat', 'storePropertyVersionHostnames',
            'getPropertyVersion', 'listEdgeHostnames', 'storePropertyVersionRules', 'createNewPropertyVersion']);

        let edgeHostnames = utils.readJsonFile(path.join(__dirname, "testdata", "edgeHostnames.json"));

        td.when(papi.listEdgeHostnames("1-1TJZH5", 61726)).thenReturn(edgeHostnames);

        td.when(papi.createNewPropertyVersion(411089, 1, "7cf327786d5a73aa6340452a064fb77589f750b0")).thenReturn(
            {"versionLink" : "/papi/v0/properties/429569/versions/2"}
        );

        td.when(papi.getPropertyVersion(411089, 2)).thenReturn({
            "propertyId": "411089",
            "propertyName": "jmtestdevops1",
            "accountId": "1-1TJZFB",
            "contractId": "1-1TJZH5",
            "groupId": "61726",
            "assetId": "10501028",
            "versions": {
                "items": [
                    {
                        "propertyVersion": 2,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2017-11-07T19:45:55Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "INACTIVE",
                        "etag": "7cf327786d5a73aa6340452a064fb77589f750b0",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });

        td.when(papi.storePropertyVersionRules(411089, 2, td.matchers.isA(Object), td.matchers.anything())).thenReturn({
            "propertyVersion": 2,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:05Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "etag": "7cf327786d5a73aa6340452a064fb77589f750b0",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });


        qaEnvironment = new Environment('qa', {
            project: project,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });

        envInfoPath = path.join(__dirname, "testproject.com/environments/qa/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.latestVersionInfo.stagingStatus = "ACTIVE";
        utils.writeJsonFile(envInfoPath, envInfo);
        let hostnamesPath = path.join(__dirname, "testproject.com/environments/qa/hostnames.json");
        let hostnames = utils.readJsonFile(hostnamesPath);
        hostnames[0].edgeHostnameId = 2683119;
        utils.writeJsonFile(hostnamesPath, hostnames);

    });

    it('save test, create new version', async function () {
        let ruleTree = utils.readJsonFile(path.join(__dirname, "testdata", "testruletree.waa.json"));
        ruleTree.errors = [];
        td.when(papi.validatePropertyVersionRules(411089, 2, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        await qaEnvironment.merge();
        let results = await qaEnvironment.save();
        let envInfo = utils.readJsonFile(envInfoPath);
        assert.equal(envInfo.latestVersionInfo.propertyVersion, 2);
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "687372a29ed8ec68ae9977f6c6386ddbb8b9cb74ddbb76d2c97322d15bc27979");
    });
});
