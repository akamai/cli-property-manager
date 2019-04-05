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

const logger = require("../../src/logging")
    .createLogger("snippets.environment_tests");

const {throwsAsync, equalIgnoreWhiteSpaces} = require("../testutils");

const VerifyUtils = require('../verify-utils');
const RoUtils = require('../ro-utils');
const createOverlayUtils = require('../overlay-utils');

const Template = require('../../src/template');
const EL = require('../../src/el');
const errors = require('../../src/errors');
const helpers = require('../../src/helpers');

const DevOpsSnippets = require('../../src/pm/devops_property_manager');
const SnippetsProject = require('../../src/pm/project_property_manager');
const EnvironmentSnippets = require('../../src/pm/environment_property_manager');


const baseDir = path.join(__dirname, "..");


describe('Snippets Environment static function tests', function () {
    it('_extractPropertyId should be able to extract the propertyId ', function () {
        let pcData = {
            "propertyLink": "/papi/v0/properties/prp_410651?groupId=grp_61726&contractId=ctr_1-1TJZH5"
        };
        assert.equal(EnvironmentSnippets._extractPropertyId(pcData), 410651);

        pcData.propertyLink = "/papi/v0/properties/410651?groupId=grp_61726&contractId=ctr_1-1TJZH5";
        assert.equal(EnvironmentSnippets._extractPropertyId(pcData), 410651);
    });


    it('_extractActivationId testing extraction of activation ID', function () {
        let activationData = {
            "activationLink" : "/papi/v0/properties/414298/activations/4998030"
        };

        assert.equal(EnvironmentSnippets._extractActivationId(activationData), 4998030);

        activationData.edgeHostnameLink = "/papi/v0/properties/prp_414298/activations/atv_4998030";
        assert.equal(EnvironmentSnippets._extractActivationId(activationData), 4998030);
    });

    it('_extractVersionId testing extraction of version id', function () {
        let versionData = {
            "versionLink": "/papi/v0/properties/429569/versions/2"
        };

        assert.equal(EnvironmentSnippets._extractVersionId(versionData), 2);

        versionData.versionLink = "/papi/v0/properties/prp_429569/versions/2";
        assert.equal(EnvironmentSnippets._extractVersionId(versionData), 2);
    });

});

describe('Snippets Environment save with hostnames - creating edge hostname', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets-hostname.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "11d6a9eb700504cad14a5f31810958781bf717a7fc7b36427656811d2b83d9cd",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets-hostname.com", "dist", "saveTest.snippets-hostname.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "templates/main.json",
            variables: [
                "environments/qa/variables.json"
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules', 'listEdgeHostnames', 'createEdgeHostname']);

        td.when(papi.listEdgeHostnames("1-1TJZH5",61726)).thenReturn(
            {
                "accountId": "act_1-1TJZFB",
                "contractId": "ctr_1-1TJZH5",
                "groupId": "grp_15225",
                "edgeHostnames": {
                    "items": [{
                        "edgeHostnameId": "ehn_3448422",
                        "domainPrefix": "193release.com",
                        "domainSuffix": "edgesuite.net",
                        "status": "CREATED",
                        "ipVersionBehavior": "IPV6_COMPLIANCE",
                        "secure": false,
                        "edgeHostnameDomain": "193release.com.edgesuite.net"
                    }]
                }
            }
        );


        qaEnvironment = new EnvironmentSnippets('saveTest.snippets-hostname.com', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });


    it('create hostname test with 400', async function () {
        td.when(papi.createEdgeHostname("1-1TJZH5",61726, td.matchers.anything())).thenReject(new errors.RestApiError("error message", "api_client_error", 400, {
            "type": "https://problems.luna.akamaiapis.net/papi/v0/invalid-record-name",
            "title": "record name is invalid",
            "status": 400,
            "detail" : "Name james-sqa2-snippets-hostname-..bug555 is invalid for creating a hostname",
            "instance": "https://akaa-tatppzhhc4l6xvmi-baxl5ufbibzjxtmb.luna-dev.akamaiapis.net/papi/v0/properties/470629/versions/1/rules#6054d222-c3a8-4b44-94ac-3d24c40a446f"}))
        try {
            let results = await qaEnvironment.save();
        }catch(exception){
            assert.equal(exception.args[1], {"type":"https://problems.luna.akamaiapis.net/papi/v0/invalid-record-name","title":"record name is invalid","status":400,"detail":"Name james-sqa2-snippets-hostname-..bug555 is invalid for creating a hostname","instance":"https://akaa-tatppzhhc4l6xvmi-baxl5ufbibzjxtmb.luna-dev.akamaiapis.net/papi/v0/properties/470629/versions/1/rules#6054d222-c3a8-4b44-94ac-3d24c40a446f"});
        }
        //console.log(results);
        //assert.equal(results.edgeHostnames.errors, [{"messageId":"api_client_error","args":[400,{"type":"https://problems.luna.akamaiapis.net/papi/v0/invalid-record-name","title":"record name is invalid","status":400,"detail":"Name james-sqa2-snippets-hostname-..bug555 is invalid for creating a hostname","instance":"https://akaa-tatppzhhc4l6xvmi-baxl5ufbibzjxtmb.luna-dev.akamaiapis.net/papi/v0/properties/470629/versions/1/rules#6054d222-c3a8-4b44-94ac-3d24c40a446f"}]}]);
    });

});

describe('snippets Environment save with hostnames - associating hostname with property', function () {
    let papi, merger, project, devOps, qaEnvironment, brokenError, someWarning;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets-hostname.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "11d6a9eb700504cad14a5f31810958781bf717a7fc7b36427656811d2b83d9cd",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets-hostname.com", "dist", "saveTest.snippets-hostname.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "templates/main.json",
            variables: [
                "environments/qa/variables.json"
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules', 'listEdgeHostnames', 'createEdgeHostname', "storePropertyVersionHostnames"]);

        td.when(papi.listEdgeHostnames("1-1TJZH5",61726)).thenReturn(
            {
                "accountId": "act_1-1TJZFB",
                "contractId": "ctr_1-1TJZH5",
                "groupId": "grp_15225",
                "edgeHostnames": {
                    "items": [{
                        "edgeHostnameId": "ehn_3448422",
                        "domainPrefix": "193release.com",
                        "domainSuffix": "edgesuite.net",
                        "status": "CREATED",
                        "ipVersionBehavior": "IPV6_COMPLIANCE",
                        "secure": false,
                        "edgeHostnameDomain": "193release.com.edgesuite.net"
                    }]
                }
            }
        );
        brokenError = {
            "broken":"something broken"
        }

        someWarning = {
            "warn":"a warning about something"
        }


        td.when(papi.storePropertyVersionHostnames(td.matchers.anything(), td.matchers.anything(),td.matchers.anything(),"1-1TJZH5",61726 )).thenReturn(
            {
                "accountId" : "act_1-1TJZFB",
                "contractId" : "ctr_1-1TJZH5",
                "groupId" : "grp_15225",
                "propertyId" : "prp_525933",
                "propertyName" : "james-sqa2-snippets-hostname-bug1",
                "propertyVersion" : 1,
                "etag" : "f16cb5339b68af378d30fa56aced3a1f62c6c56e",
                "hostnames" : {
                    "items" : [ {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449359",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug1.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug1.edgesuite.net"
                    }, {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449434",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug123.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug111.edgesuite.net"
                    }, {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449409",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug789.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug789.edgesuite.net"
                    } ]
                },
                "errors": [
                    brokenError
                ],
                "warnings": [
                    someWarning
                ]
            }
        )



        qaEnvironment = new EnvironmentSnippets("saveTest.snippets-hostname.com", {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });

    it('save hostname test - 200 with validation and warnings', async function () {
        td.when(papi.createEdgeHostname("1-1TJZH5",61726, td.matchers.anything())).thenReturn({
            edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726'
        })
        let results = await qaEnvironment.save();

        assert.equal(results.storedHostnames, true);
        assert.equal(results.hostnameErrors[0].broken, brokenError.broken);
        assert.equal(results.hostnameWarnings[0].warn, someWarning.warn);
        //assert.equal(results.edgeHostnames.errors, [{"messageId":"api_client_error","args":[400,{"type":"https://problems.luna.akamaiapis.net/papi/v0/invalid-record-name","title":"record name is invalid","status":400,"detail":"Name james-sqa2-snippets-hostname-..bug555 is invalid for creating a hostname","instance":"https://akaa-tatppzhhc4l6xvmi-baxl5ufbibzjxtmb.luna-dev.akamaiapis.net/papi/v0/properties/470629/versions/1/rules#6054d222-c3a8-4b44-94ac-3d24c40a446f"}]}]);
    });
});


describe('snippets Environment save with hostnames - clear warnings and errors', function () {
    let papi, merger, project, devOps, qaEnvironment, brokenError, someWarning;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets-hostname.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "11d6a9eb700504cad14a5f31810958781bf717a7fc7b36427656811d2b83d9cd",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets-hostname.com", "dist", "saveTest.snippets-hostname.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "templates/main.json",
            variables: [
                "environments/qa/variables.json"
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules', 'listEdgeHostnames', 'createEdgeHostname', "storePropertyVersionHostnames"]);

        td.when(papi.listEdgeHostnames("1-1TJZH5",61726)).thenReturn(
            {
                "accountId": "act_1-1TJZFB",
                "contractId": "ctr_1-1TJZH5",
                "groupId": "grp_15225",
                "edgeHostnames": {
                    "items": [{
                        "edgeHostnameId": "ehn_3448422",
                        "domainPrefix": "193release.com",
                        "domainSuffix": "edgesuite.net",
                        "status": "CREATED",
                        "ipVersionBehavior": "IPV6_COMPLIANCE",
                        "secure": false,
                        "edgeHostnameDomain": "193release.com.edgesuite.net"
                    }]
                }
            }
        );
        brokenError = {
            "broken":"something broken"
        }

        someWarning = {
            "warn":"a warning about something"
        }


        td.when(papi.storePropertyVersionHostnames(td.matchers.anything(), td.matchers.anything(),td.matchers.anything(),"1-1TJZH5",61726 )).thenReturn(
            {
                "accountId" : "act_1-1TJZFB",
                "contractId" : "ctr_1-1TJZH5",
                "groupId" : "grp_15225",
                "propertyId" : "prp_525933",
                "propertyName" : "james-sqa2-snippets-hostname-bug1",
                "propertyVersion" : 1,
                "etag" : "f16cb5339b68af378d30fa56aced3a1f62c6c56e",
                "hostnames" : {
                    "items" : [ {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449359",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug1.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug1.edgesuite.net"
                    }, {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449434",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug123.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug111.edgesuite.net"
                    }, {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3449409",
                        "cnameFrom" : "james-sqa2-snippets-hostname-bug789.com",
                        "cnameTo" : "james-sqa2-snippets-hostname-bug789.edgesuite.net"
                    } ]
                }
            }
        )



        qaEnvironment = new EnvironmentSnippets('saveTest.snippets-hostname.com', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });



    it('save hostname test - clear warning', async function () {
        td.when(papi.createEdgeHostname("1-1TJZH5",61726, td.matchers.anything())).thenReturn({
            edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726'
        })
        qaEnvironment.getEnvironmentInfo = td.function();
        let envInfoPath = path.join(baseDir, "saveTest.snippets-hostname.com/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.lastSaveHostnameWarnings=[someWarning];
        envInfo.lastSaveHostnameErrors=[brokenError];


        td.when(qaEnvironment.getEnvironmentInfo()).thenReturn(envInfo);

        let results = await qaEnvironment.save();

        assert.equal(results.storedHostnames, true);
        assert.isEmpty(results.hostnameErrors);
        assert.isEmpty(results.hostnameWarnings);
    });


});

describe('pipeline Environment save with hostnames - replay warnings and errors', function () {
    let papi, merger, project, devOps, qaEnvironment, brokenError, someWarning;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets-hostname.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "11d6a9eb700504cad14a5f31810958781bf717a7fc7b36427656811d2b83d9cd",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets-hostname.com", "dist", "saveTest.snippets-hostname.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "templates/main.json",
            variables: [
                "environments/qa/variables.json"
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules', 'listEdgeHostnames', 'createEdgeHostname', "storePropertyVersionHostnames"]);


        brokenError = {
            "broken":"something broken"
        }

        someWarning = {
            "warn":"a warning about something"
        }


        qaEnvironment = new EnvironmentSnippets('saveTest.snippets-hostname.com', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });
    it('save hostname test - replay warnings and errors', async function () {
        td.when(papi.createEdgeHostname("1-1TJZH5",61726, td.matchers.anything())).thenReturn({
            edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726'
        })
        qaEnvironment.getEnvironmentInfo = td.function();
        let envInfoPath = path.join(baseDir, "saveTest.snippets-hostname.com/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.lastSaveHostnameWarnings=[someWarning];
        envInfo.lastSaveHostnameErrors=[brokenError];
        envInfo.lastSavedHostnamesHash = "ed0af3f48d15f2f57920fc7a81e3853e8e3546cf63d3f0553e28ec2b58b821f1"

        td.when(qaEnvironment.getEnvironmentInfo()).thenReturn(envInfo);

        let results = await qaEnvironment.save();

        assert.isNotEmpty(results.hostnameWarnings);
        assert.equal(results.hostnameWarnings[0], someWarning);
        assert.isNotEmpty(results.hostnameErrors);
        assert.equal(results.hostnameErrors[0], brokenError);
    });

});

describe('Snippets Environment method unit tests', function() {
    let papi;
    let project;
    let env;
    let projectName = "unitTests.com";
    before(function () {
        project = td.object(['storeEnvironmentInfo', 'loadEnvironmentInfo', 'loadEnvironmentHostnames', 'getProjectInfo', 'getName']);
        td.when(project.getProjectInfo()).thenReturn({
            name: projectName,
            productId: "WAA",
            contractId: "BAZ234",
            groupId: 666
        });
        td.when(project.getName()).thenReturn(projectName);

        papi = td.object(['createProperty', 'latestPropertyVersion']);
        td.when(papi.createProperty(projectName, "WAA", "BAZ234", 666)).thenReturn({
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


    it('environment is not pending', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "james-12",
            "propertyId": 472716
        });

        assert.equal(env.isPendingPromotion(),false);
    });

    it('environment is pending', function () {
        env = new EnvironmentSnippets('james-12', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("james-12")).thenReturn({
            "name": "james-12",
            "propertyName": "james-12",
            "propertyId": 472716,
            "pendingActivations": {
                "STAGING": 5867427
            }
        });

        assert.equal(env.isPendingPromotion(), true);
        assert.equal(env.isPendingPromotion("STAGING"), true);
        assert.equal(env.isPendingPromotion("PRODUCTION"), false);

        env = new EnvironmentSnippets('stag', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("stag")).thenReturn({
            "name": "stag",
            "propertyName": "james-12312",
            "propertyId": 472716,
            "pendingActivations": {
                "PRODUCTION": 5867427
            }
        });
    
        //The name of the env doesn't really matter
        assert.equal(env.name,"stag");
        assert.equal(env.propertyName,"unitTests.com");
        assert.equal(env.isPendingPromotion(), true);
        assert.equal(env.isPendingPromotion("PRODUCTION"), true);
        assert.equal(env.isPendingPromotion("STAGING"), false);

    });

    it('environment is active', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "james-12",
            "propertyId": 472716,
            "latestVersionInfo": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_STAGING_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_PRODUCTION_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            }
        });

        assert.equal(env.isActive("PRODUCTION"), true);
        assert.equal(env.isActive("STAGING"), true);
    });

    it('environment is not active because of no active items', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "james-12",
            "propertyId": 472716
        });

        assert.equal(env.isActive("PRODUCTION"), false);
        assert.equal(env.isActive("STAGING"), false);
    });

    it('environment is not active because items are pending', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "james-12",
            "propertyId": 472716,
            "latestVersionInfo": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_STAGING_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_PRODUCTION_Info": {
                "propertyVersion": 4,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "DEACTIVATED",
                "etag": "677646b7fa5aefe24dcf9ee54b21f79cdc46aac2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },"pendingActivations": {
                "PRODUCTION": 5867427
            }
        });

        assert.equal(env.isActive("PRODUCTION"), false);
        assert.equal(env.isActive("STAGING"), true);

        env = new EnvironmentSnippets('stag', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("stag")).thenReturn({
            "name": "stag",
            "propertyName": "qa.james-12",
            "propertyId": 472716,
            "latestVersionInfo": {
                "propertyVersion": 4,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "DEACTIVATED",
                "etag": "677646b7fa5aefe24dcf9ee54b21f79cdc46aac2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_STAGING_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_PRODUCTION_Info": {
                "propertyVersion": 4,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "DEACTIVATED",
                "etag": "677646b7fa5aefe24dcf9ee54b21f79cdc46aac2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "pendingActivations": {
                "STAGING": 5867427
            }
        });

        assert.equal(env.isActive("PRODUCTION"), true);
        assert.equal(env.isActive("STAGING"), false);

    });

    it('environment is not active because items saved but not promoted', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "qa.james-12",
            "propertyId": 472716,
            "latestVersionInfo": {
                "propertyVersion": 19,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "INACTIVE",
                "etag": "abcbababababab",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_STAGING_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_PRODUCTION_Info": {
                "propertyVersion": 4,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "DEACTIVATED",
                "etag": "677646b7fa5aefe24dcf9ee54b21f79cdc46aac2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            }
        });

        assert.equal(env.isActive("PRODUCTION"), false);
        assert.equal(env.isActive("STAGING"), false);

        env = new EnvironmentSnippets('stag', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        td.when(project.loadEnvironmentInfo("stag")).thenReturn({
            "name": "stag",
            "propertyName": "qa.james-12",
            "propertyId": 472716,
            "latestVersionInfo": {
                "propertyVersion": 19,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "INACTIVE",
                "etag": "ababcbba",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_STAGING_Info": {
                "propertyVersion": 18,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-19T16:58:50Z",
                "productionStatus": "INACTIVE",
                "stagingStatus": "ACTIVE",
                "etag": "381adc2d64d98ff5a05f76812c849e75cb15a2a2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            },
            "activeIn_PRODUCTION_Info": {
                "propertyVersion": 4,
                "updatedByUser": "gemv4gsgtxnhgza3",
                "updatedDate": "2018-06-12T15:43:35Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "DEACTIVATED",
                "etag": "677646b7fa5aefe24dcf9ee54b21f79cdc46aac2",
                "productId": "prd_Web_App_Accel",
                "ruleFormat": "v2018-02-27"
            }
        });

        assert.equal(env.isActive("PRODUCTION"), false);
        assert.equal(env.isActive("STAGING"), false);
    });

    it('environment is not dirty', function () {
        env = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });

        var merge = td.function("merge");
        env.merge = merge;
        td.when(project.loadEnvironmentInfo("qa")).thenReturn({
            "name": "qa",
            "propertyName": "qa.james-12",
            "propertyId": 472716,
            "environmentHash": "8355744c4e4b866c697a11d825bdf8659069a791ac95b8e55e71cea79cced42e",
            "lastSavedHash": "8355744c4e4b866c697a11d825bdf8659069a791ac95b8e55e71cea79cced42e",
            "lastSavedHostnamesHash": "6cc43f858fbb763301637b5af970e2a46b46f461f27e5a0f41e009c59b827b25"

        });
        //the "hostname" abc will eventually be hashed, and should match the "lastSavedHostnamesHash"
        td.when(project.loadEnvironmentHostnames(td.matchers.anything())).thenReturn("abc");

        assert.equal(env.isDirty(),false);
        td.verify(env.merge(false));

    });



});

describe('Snippets Create environment tests', function () {
    let papi;
    let project;
    let projectName = "awesomeproject.com";
    before(function () {
        project = td.object(['storeEnvironmentInfo', 'storeEnvironmentHostnames', 'loadEnvironmentInfo', 'getProjectInfo', 'getName']);
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
        td.when(papi.createProperty(projectName, "WAA", "BAZ234", 666, null, undefined, undefined)).thenReturn({
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
        let env = new EnvironmentSnippets('testenv', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });
        await env.create({
            isInRetryMode: false,
            groupId: 666,
            secureOption: false
        });
        td.verify(project.storeEnvironmentInfo(td.matchers.contains({
            name: "testenv",
            propertyId: 410651,
            propertyName: "awesomeproject.com",
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

    it('create Environment template', async function () {
        let utils = new RoUtils();
        let devOps = {
            "devopsHome": baseDir
        };
        let myProject = new SnippetsProject("new.snippets.com", {
            devops: devOps,
            getUtils : function() {
                return utils;
            },
            getEL: function (context, loadFunction) {
                return new EL(context, loadFunction)
            },
            getEnvironment: function(name, dependencies) {
                return env;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }

        });
        myProject.projectInfo = {
            productId: "Web_App_Accel"
        };
        let env = new EnvironmentSnippets('qa', {
            project: myProject,
            getPAPI: function () {
                return papi;
            }
        });
        let testRuleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        await myProject.setupPropertyTemplate(testRuleTree);
    });
});

describe('Snippets create edgehostname tests', function () {
    let papi, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };
        papi = td.object(['createEdgeHostname', 'listEdgeHostnames']);
        td.when(papi.createEdgeHostname("1-1TJZH5", 61726, td.matchers.isA(Object))).thenReturn(    {
                edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726'
            },
            {
                edgeHostnameLink: '/papi/v0/edgehostnames/2683120?contractId=1-1TJZH5&groupId=61726'
            }
        );

        let edgeHostnames = utils.readJsonFile(path.join(baseDir, "testdata", "edgeHostnames.json"));
        td.when(papi.listEdgeHostnames("1-1TJZH5", 61726)).thenReturn(edgeHostnames);

        project = new SnippetsProject("snippets.hostnameTests.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        qaEnvironment = new EnvironmentSnippets('qa', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            }
        });
    });

    it('createEdgeHostnames all tests', async function () {
        let reportData = await qaEnvironment.createEdgeHostnames(qaEnvironment.getHostnames());

        assert.deepEqual(reportData, {
            "errors": [
                {
                    "edgehostname": "qa.testproject.com.customEdgeHostname.net",
                    "message": "'qa.testproject.com.customEdgeHostname.net' is not a supported edge hostname for creation, only edge hostnames under 'edgesuite.net' or 'edgekey.net' domains can be created. Please create manually",
                    "messageId": "unsupported_edgehostname",
                },
                {
                    "edgehostname": null,
                    "message": "hostname.cnameTo can not be set to null",
                    "messageId": "null_hostname_cnameTo",
                },
                {
                    "edgehostname": "qa.noCertEnrollmentId.com.edgekey.net",
                    "message": "Need 'certEnrollmentId' of hostname in order to create secure edge hostname",
                    "messageId": "missing_certEnrollmentId",
                }
            ],
            "hostnamesCreated": [
                {
                    "id": 2683119,
                    "name": "qa.testproject.com.edgesuite.net"
                },
                {
                    "id": 2683120,
                    "name": "qa.testproject.com.edgekey.net"
                }
            ],
            "hostnamesFound": [
                {
                    "id": 2922843,
                    "name": "qa.securesite.com.edgekey.net"
                }
            ]
        });
        let hostnames = utils.readJsonFile(path.join(baseDir, "snippets.hostnameTests.com/hostnames.json"));
        assert.strictEqual(hostnames[0].edgeHostnameId, 2683119);
        assert.strictEqual(hostnames[1].edgeHostnameId, 2683120);
        assert.strictEqual(hostnames[2].edgeHostnameId, 2922843);
    });
});

describe('Snippets Environment save with errors test', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir,
        };

        project = new SnippetsProject("new.snippets.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "testproject.com", "dist", "qa.testproject.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "config-snippets/main.json",
            variables: [
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules']);

        td.when(papi.storePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything()))
            .thenThrow(new errors.RestApiError("error message", "api_client_error", 400, {
                "type": "https://problems.luna.akamaiapis.net/papi/v0/json-schema-invalid",
                "title": "Input does not match schema",
                "status": 400,
                "detail": "Your input has a syntax problem.  Please double check against the schema.",
                "instance": "https://akaa-tatppzhhc4l6xvmi-baxl5ufbibzjxtmb.luna-dev.akamaiapis.net/papi/v0/properties/470629/versions/1/rules#6054d222-c3a8-4b44-94ac-3d24c40a446f",
                "schemaLink": "/papi/v0/schemas/products/prd_Web_App_Accel/v2018-02-27",
                "errors": [
                    {
                        "location" : "/rules/behaviors/1/options/value/id",
                        "schemaLocation" : "/definitions/catalog/option_types/cpcode/properties/id",
                        "detail" : "instance type (string) does not match any allowed primitive type (allowed: [\"integer\",\"number\"])",
                        "foundType" : "string",
                        "allowedTypes" : [ "integer", "number" ]
                    }
                ]
            }));


        qaEnvironment = new EnvironmentSnippets('qa', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });


    it('save test with exception', async function () {
        let results = await qaEnvironment.save();
        assert.deepEqual(results.validationErrors, [
        {
            location: {
                template: "config-snippets/main.json",
                variables: [],
                location: "rules/behaviors/1/options/value/id",
                value: "9876543"
            },
            schemaLocation: "/definitions/catalog/option_types/cpcode/properties/id",
            detail: "instance type (string) does not match any allowed primitive type (allowed: [\"integer\",\"number\"])",
            foundType: "string",
            allowedTypes: [
                "integer",
                    "number"
                ]
        }]);
    });
});

describe('Snippets Environment save with bad-request response test', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir,
        };

        project = new SnippetsProject("new.snippets.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "testproject.com", "dist", "qa.testproject.com.papi.json"))
        });

        td.when(merger.resolvePath("rules/behaviors/1/options/value/id", "main.json")).thenReturn({
            template: "config-snippets/main.json",
            variables: [
            ],
            location: "rules/behaviors/1/options/value/id",
            value: "9876543"
        });

        papi = td.object(['storePropertyVersionRules']);

        let badRequestError = {
            "type": "https://problems.luna-dev.akamaiapis.net/-/pep-authn/request-error",
            "title": "Bad request",
            "status": 400,
            "detail": "Invalid timestamp",
            "instance": "https://akaa-ccfpy4b4dprx6i6v-zbi3gwyae7fir2qh.luna-dev.akamaiapis.net/papi/v0/properties/516701/versions/latest",
            "method": "GET",
            "serverIp": "104.97.22.58",
            "clientIp": "72.246.3.14",
            "requestId": "51a792b",
            "requestTime": "2019-02-19T13:16:33Z"
        };

        td.when(papi.storePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything()))
            .thenThrow(new errors.RestApiError("error message", "api_client_error", 400, badRequestError));


        qaEnvironment = new EnvironmentSnippets('qa', {
            project: project,
            shouldProcessPapiErrors: true,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });
    });


    it('save test with bad-request response', async function () {
        let badRequestError = {
            "type": "https://problems.luna-dev.akamaiapis.net/-/pep-authn/request-error",
            "title": "Bad request",
            "status": 400,
            "detail": "Invalid timestamp",
            "instance": "https://akaa-ccfpy4b4dprx6i6v-zbi3gwyae7fir2qh.luna-dev.akamaiapis.net/papi/v0/properties/516701/versions/latest",
            "method": "GET",
            "serverIp": "104.97.22.58",
            "clientIp": "72.246.3.14",
            "requestId": "51a792b",
            "requestTime": "2019-02-19T13:16:33Z"
        };
        try {
            await qaEnvironment.save();
            return false;
        } catch (error){
            assert.deepEqual(error.args[1], badRequestError);
        }
    });
});

/**
 * These tests need to be run in the order they show up in the code.
 * They depend on the same state and in the order the state is being changed
 * by one test after the other.
 */
describe('Environment Merge, Save, Promote and check status tests', function () {
    let papi, merger, project, devOps, snippetEnv;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("snippets.environment.tests.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge', 'resolvePath']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com", "dist", "snippets.environment.tests.com.papi.json"))
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

        let edgeHostnames = utils.readJsonFile(path.join(baseDir, "testdata", "edgeHostnames.json"));

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

        //IMPORTANT This etag is what is used to save when a hostname is present (last to save)
        td.when(papi.storePropertyVersionHostnames(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenReturn(
            {
                "accountId" : "act_1-1TJZFB",
                "contractId" : "ctr_1-1TJZH5",
                "groupId" : "grp_15225",
                "propertyId" : "prp_521554",
                "propertyName" : "james-sqa2-uservar-test6",
                "propertyVersion" : 1,
                "etag" : "7cf327786d5a73aa6340452a064fb77589f750b0",
                "hostnames" : {
                    "items" : [ {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3444495",
                        "cnameFrom" : "james-sqa2-uservar-test6.com",
                        "cnameTo" : "james-sqa2-uservar-test6.edgesuite.net"
                    } ]
                }
            }
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
                        "productionStatus": "ACTIVE",
                        "stagingStatus": "INACTIVE",
                        "etag": "42f95e8b3cd22579a09cd68f27a477f53cfd2f5e",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    }
                ]
            }
        });

        td.when(papi.activateProperty(411089, 1, "STAGING", ['foo@bar.com'], "Message")).thenReturn({
            "activationLink" : "/papi/v0/properties/411089/activations/5355264"
        });

        td.when(papi.activateProperty(411089, 1, "PRODUCTION", ['foo@bar.com'], "Message")).thenReturn({
            "activationLink" : "/papi/v0/properties/411089/activations/5355557"
        });

        td.when(papi.activateProperty(411089, 2, "PRODUCTION", ['foo@bar.com'], "Message")).thenReturn({
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

        snippetEnv = new EnvironmentSnippets('snippets.environment.tests.com', {
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
        let validateResponse = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));

        validateResponse.errors = [ {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/generic_behavior_issue.cpcode_not_available",
            "errorLocation" : "#/rules/behaviors/1/options/value",
            "detail" : "The CP Code within `Content Provider Code` cannot be used with this property. If you just created this CP Code, please try again later. For more information see <a href=\"/dl/rd/propmgr/PropMgr_CSH.htm#1069\" target=\"_blank\">Content Provider Codes</a>."
        } ];

        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            validateResponse
        );

        let results = await snippetEnv.merge();
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
        let ruleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        ruleTree.errors = [];
        ruleTree.warnings = [ {
            "type" : "https://problems.luna.akamaiapis.net/papi/v0/validation/product_behavior_issue.cpcode_incorrect_product",
            "errorLocation" : "#/rules/behaviors/1/options/value",
            "detail" : "The CP Code within `Content Provider Code` is not configured for use with the product used by this property, Web Application Accelerator. Traffic for this property might not show up under the correct traffic reports."
        } ];

        snippetEnv.getEnvironmentInfo().lastValidatedHash = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221aaa2";

        let results = await snippetEnv.merge();
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

        assert.deepEqual(snippetEnv.getEnvironmentInfo().lastSaveWarnings, [{
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
        let ruleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        ruleTree.errors = [];
        ruleTree.warnings = [];

        snippetEnv.getEnvironmentInfo().lastValidatedHash = "f91b2efb777cc1a6124d844e4a707676c9e2c105b8852f4700071193b221bbb2";

        let results = await snippetEnv.merge();
        assert.deepEqual(snippetEnv.getEnvironmentInfo().lastSaveWarnings, []);
    });

    it('isDirty and isActive tests', function () {
        assert.equal(snippetEnv.isDirty(), true);
        assert.equal(snippetEnv.isActive("STAGING"), false);
    });

    it('createEdgeHostnames test', async function () {
        reportData = await snippetEnv.createEdgeHostnames(snippetEnv.getHostnames());
        assert.deepEqual(reportData, {
            "errors": [],
            "hostnamesCreated": [
                {
                  "id": 2683119,
                  "name": "snippets.environment.tests.com.edgesuite.net"
               }
          ],
          "hostnamesFound": [
                {
                  "id": 2922843,
                    "name": "qa.securesite.com.edgekey.net"
            }
          ]
        });
        let hostnames = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/hostnames.json"));
        assert.strictEqual(hostnames[0].edgeHostnameId, 2683119);
        assert.strictEqual(hostnames[1].edgeHostnameId, 2922843);
    });

    it('save test', async function () {
        snippetEnv.getEnvironmentInfo().lastSaveErrors = [{
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
        let results = await snippetEnv.save();
        assert.equal(results.storedRules, true);
        let envInfo = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/envInfo.json"));
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7");
        let hostnames = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/hostnames.json"));
        assert.equal(hostnames[0].edgeHostnameId, 2683119);
        assert.equal(snippetEnv.isDirty(), false);
        snippetEnv.getEnvironmentInfo().lastSaveErrors = [];
    });

    it('promote test staging', async function () {
        let result = await snippetEnv.promote("STAGING", ['foo@bar.com'], "Message");
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 5355264
        });
        let envInfo = result.envInfo;
        assert.equal(envInfo.pendingActivations['STAGING'], 5355264);
        assert.deepEqual(envInfo, {
            name: "snippets.environment.tests.com",
            groupId: 61726,
            propertyName: "snippets.environment.tests.com",
            propertyId: 411089,
            isSecure: false,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveHostnameWarnings: [],
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
        let results = await snippetEnv.checkPromotions();
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

        results = await snippetEnv.checkPromotions();
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

        envInfo = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'snippets.environment.tests.com',
            groupId: 61726,
            propertyName: 'snippets.environment.tests.com',
            propertyId: 411089,
            isSecure: false,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveHostnameWarnings: [],
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
        assert.equal(snippetEnv.isActive("STAGING"), true);
    });

    it('check production promotion failed activation test', async function () {
        let promotionResult = await snippetEnv.promote("PRODUCTION", ['foo@bar.com'], "Message");
        assert.deepEqual(promotionResult.pending, {
            network: "PRODUCTION",
            activationId: 5355557
        });
        let envInfo = promotionResult.envInfo;
        assert.equal(envInfo.pendingActivations['PRODUCTION'], 5355557);

        let results = await snippetEnv.checkPromotions();
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

        envInfo = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'snippets.environment.tests.com',
            groupId: 61726,
            propertyName: 'snippets.environment.tests.com',
            propertyId: 411089,
            isSecure: false,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveHostnameWarnings: [],
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
        snippetEnv.getEnvironmentInfo().latestVersionInfo.propertyVersion = 2;
        snippetEnv.getEnvironmentInfo().latestVersionInfo.stagingStatus = "INACTIVE";

        let result = await snippetEnv.promote("PRODUCTION", ['foo@bar.com'], "Message");
        assert.deepEqual(result.pending, {
            network: "PRODUCTION",
            activationId: 5355558
        });
        let envInfo = result.envInfo;
        assert.equal(envInfo.pendingActivations['PRODUCTION'], 5355558);
        assert.deepEqual(envInfo, {
            name: "snippets.environment.tests.com",
            groupId: 61726,
            propertyName: "snippets.environment.tests.com",
            propertyId: 411089,
            isSecure: false,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveHostnameWarnings: [],
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
        //The promote function now first immediately checksPromotion status in PAPI before checking if its pending
        return throwsAsync(function() {
            return snippetEnv.promote("PRODUCTION", ['foo@bar.com'], "Message");
        }, "Error: Latest version already active in 'PRODUCTION' network");
    });

    it('check production promotion status test', async function () {
        //The promotion updates is now blank, since the previous call "promote" now does a check promotions
        let results = await snippetEnv.checkPromotions();
        assert.deepEqual(results, {
            "promotionStatus": {
                "activeInProductionVersion": 2,
                "activeInStagingVersion": 1,
                "latestVersion": 2
            },
            "promotionUpdates": {}
        });

        envInfo = utils.readJsonFile(path.join(baseDir, "snippets.environment.tests.com/envInfo.json"));
        assert.deepEqual(envInfo, {
            name: 'snippets.environment.tests.com',
            groupId: 61726,
            propertyName: 'snippets.environment.tests.com',
            propertyId: 411089,
            isSecure: false,
            environmentHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSavedHostnamesHash: "a20a7262d60517327494204afcb41e29e4ec20735688571f0176acdac09058a7",
            ruleTreeHash: "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            lastValidatedHash: "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            lastSaveErrors: [],
            lastSaveHostnameErrors: [],
            lastSaveHostnameWarnings: [],
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
        //This is now false, since the latest item is property version 2,
        // implying that a change was saved but NOT promoted to staging
        assert.equal(snippetEnv.isActive("STAGING"), false);
        assert.equal(snippetEnv.isActive("PRODUCTION"), true);
    });

    it('promote test production already active', async function () {
        return throwsAsync(function() {
            return snippetEnv.promote("PRODUCTION", ['foo@bar.com'], "Message");
        }, "Error: Latest version already active in 'PRODUCTION' network");
    });

    it('Merge test with and without validation errors and 400 error response', async function () {
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

        let badRequestError = {
            "type": "https://problems.luna-dev.akamaiapis.net/-/pep-authn/request-error",
            "title": "Bad request",
            "status": 400,
            "detail": "Invalid timestamp",
            "instance": "https://akaa-ccfpy4b4dprx6i6v-zbi3gwyae7fir2qh.luna-dev.akamaiapis.net/papi/v0/properties/516701/versions/latest",
            "method": "GET",
            "serverIp": "104.97.22.58",
            "clientIp": "72.246.3.14",
            "requestId": "51a792b",
            "requestTime": "2019-02-19T13:16:33Z"
        }

        td.when(papi.validatePropertyVersionRules(411089, 1, td.matchers.isA(Object), td.matchers.anything())).thenThrow(
            new errors.RestApiError(`Request failed, status code: 400,` +
                `\nResponse Body: '${validationError}'`, "api_client_error", 400, validationError),
            new errors.RestApiError(`Request failed, status code: 400,` +
                `\nResponse Body: '${badRequestError}'`, "api_client_error", 400, badRequestError)
        );

        snippetEnv.__envInfo = null;

        let results = await snippetEnv.merge();
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
        try {
            await snippetEnv.merge();
            return false;
        } catch (error){
            assert.deepEqual(error.args[1], badRequestError);
        }
    });

});

describe('Snippets Environment merge and save new version after activation', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();
    let envInfoPath;

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets.com", "dist", "saveTest.snippets.com.papi.json"))
        });

        papi = td.object(['validatePropertyVersionRules', 'setRuleFormat', 'storePropertyVersionHostnames',
            'getPropertyVersion', 'listEdgeHostnames', 'storePropertyVersionRules', 'createNewPropertyVersion']);

        //IMPORTANT This etag is what is used to save when a hostname is present (last to save)
        td.when(papi.storePropertyVersionHostnames(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenReturn(
            {
                "accountId" : "act_1-1TJZFB",
                "contractId" : "ctr_1-1TJZH5",
                "groupId" : "grp_15225",
                "propertyId" : "prp_521554",
                "propertyName" : "james-sqa2-uservar-test6",
                "propertyVersion" : 1,
                "etag" : "7cf327786d5a73aa6340452a064fb77589f750b0",
                "hostnames" : {
                    "items" : [ {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3444495",
                        "cnameFrom" : "james-sqa2-uservar-test6.com",
                        "cnameTo" : "james-sqa2-uservar-test6.edgesuite.net"
                    } ]
                }
            }
        );

        let edgeHostnames = utils.readJsonFile(path.join(baseDir, "testdata", "edgeHostnames.json"));

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


        qaEnvironment = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });

        envInfoPath = path.join(baseDir, "saveTest.snippets.com/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.latestVersionInfo.stagingStatus = "ACTIVE";
        utils.writeJsonFile(envInfoPath, envInfo);
        let hostnamesPath = path.join(baseDir, "saveTest.snippets.com/hostnames.json");
        let hostnames = utils.readJsonFile(hostnamesPath);
        hostnames[0].edgeHostnameId = 2683119;
        utils.writeJsonFile(hostnamesPath, hostnames);

    });

    it('save test, create new version', async function () {
        let ruleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        ruleTree.errors = [];
        td.when(papi.validatePropertyVersionRules(411089, 2, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        await qaEnvironment.merge();
        let results = await qaEnvironment.save();
        let envInfo = utils.readJsonFile(envInfoPath);
        assert.equal(envInfo.latestVersionInfo.propertyVersion, 2);
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "0692a8d14e80ec21e81b449639f5622c0f31bf5bbf58aef74913aaf7f54d3a1b");
    });
});

describe('Snippets Environment merge and save new version after abort', function () {
    let papi, merger, project, devOps, qaEnvironment;
    let utils = new RoUtils();

    before(function () {
        devOps = {
            "devopsHome": baseDir
        };

        project = new SnippetsProject("saveTest.snippets.com", {
            devops: devOps,
            getUtils: function () {
                return utils;
            }
        });

        merger = td.object(['merge']);

        td.when(merger.merge("main.json")).thenReturn({
            "hash": "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31",
            "ruleTreeHash": "6ac5ef477dbdc1abbc1c8957a0b6faef28f9d21b2f92e5771f29391da00a7744",
            "ruleTree": utils.readJsonFile(path.join(baseDir, "saveTest.snippets.com", "dist", "saveTest.snippets.com.papi.json"))
        });

        papi = td.object(['validatePropertyVersionRules', 'setRuleFormat', 'storePropertyVersionHostnames',
            'getPropertyVersion', 'listEdgeHostnames', 'storePropertyVersionRules', 'createNewPropertyVersion']);

        let edgeHostnames = utils.readJsonFile(path.join(baseDir, "testdata", "edgeHostnames.json"));

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

        //IMPORTANT This etag is what is used to save when a hostname is present (last to save)
        td.when(papi.storePropertyVersionHostnames(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything())).thenReturn(
            {
                "accountId" : "act_1-1TJZFB",
                "contractId" : "ctr_1-1TJZH5",
                "groupId" : "grp_15225",
                "propertyId" : "prp_521554",
                "propertyName" : "james-sqa2-uservar-test6",
                "propertyVersion" : 1,
                "etag" : "7cf327786d5a73aa6340452a064fb77589f750b0",
                "hostnames" : {
                    "items" : [ {
                        "cnameType" : "EDGE_HOSTNAME",
                        "edgeHostnameId" : "ehn_3444495",
                        "cnameFrom" : "james-sqa2-uservar-test6.com",
                        "cnameTo" : "james-sqa2-uservar-test6.edgesuite.net"
                    } ]
                }
            }
        );

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


        qaEnvironment = new EnvironmentSnippets('qa', {
            project: project,
            getPAPI: function () {
                return papi;
            },
            getMerger: function () {
                return merger;
            }
        });


        let hostnamesPath = path.join(baseDir, "saveTest.snippets.com/hostnames.json");
        let hostnames = utils.readJsonFile(hostnamesPath);
        hostnames[0].edgeHostnameId = 2683119;
        utils.writeJsonFile(hostnamesPath, hostnames);

    });

    it('save test, create new version after staging aborted', async function () {
        let envInfoPath;
        envInfoPath = path.join(baseDir, "saveTest.snippets.com/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.latestVersionInfo.stagingStatus = "ABORTED";
        utils.writeJsonFile(envInfoPath, envInfo);

        let ruleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        ruleTree.errors = [];
        td.when(papi.validatePropertyVersionRules(411089, 2, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        await qaEnvironment.merge();
        let results = await qaEnvironment.save();
        envInfo = utils.readJsonFile(envInfoPath);
        assert.equal(envInfo.latestVersionInfo.propertyVersion, 2);
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "0692a8d14e80ec21e81b449639f5622c0f31bf5bbf58aef74913aaf7f54d3a1b");
    });

    it('save test, create new version after production aborted', async function () {
        let envInfoPath;
        envInfoPath = path.join(baseDir, "saveTest.snippets.com/envInfo.json");
        let envInfo = utils.readJsonFile(envInfoPath);
        envInfo.latestVersionInfo.productionStatus = "ABORTED";
        utils.writeJsonFile(envInfoPath, envInfo);

        let ruleTree = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        ruleTree.errors = [];
        td.when(papi.validatePropertyVersionRules(411089, 2, td.matchers.isA(Object), td.matchers.anything())).thenReturn(
            ruleTree
        );
        await qaEnvironment.merge();
        let results = await qaEnvironment.save();
        envInfo = utils.readJsonFile(envInfoPath);
        assert.equal(envInfo.latestVersionInfo.propertyVersion, 2);
        assert.equal(envInfo.lastSavedHash, "33e96e8ff7288ead357e4e866da601cddb3c73e23e9e495665e001b7e1c32d31");
        assert.equal(envInfo.lastSavedHostnamesHash, "0692a8d14e80ec21e81b449639f5622c0f31bf5bbf58aef74913aaf7f54d3a1b");
    });
});