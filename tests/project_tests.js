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
const _ = require('underscore');
const path = require('path');

const VerifyUtils = require("./verify-utils");
const RoUtils = require("./ro-utils");
const throwsAsync = require("./testutils").throwsAsync;

const Project = require('../src/project');
const Utils = require('../src/utils');
const createDevOps = require('../src/factory');

describe('Project Tests', function () {
    let dummyUtil;
    let data;
    let devops;
    let utils;

    before(function () {
        utils = new VerifyUtils();
        data = [];

        dummyUtil = new Proxy({}, {
            get(receiver, name) {
                return function (...args) {
                    let params = args.slice();
                    params.unshift(name);
                    data.push(params);
                }
            }
        });

        devops = {
            devopsHome : "homeSweetHome"
        }
    });

    it('create Project', function () {
        let project = new Project("Foobar", {
            devops: devops,
            getUtils: function () {
                return dummyUtil;
            },
            version: "0.1.11"
        });
        assert.equal(project.getName(), "Foobar");
        project.createProjectFolders({
            projectName: "Foobar",
            productId: "WAA",
            contractId: "ABF543",
            groupIds: [76342],
            environments: ["qa", "staging", "production"]
        });
        let testDataFile = path.join(__dirname, "project_tests.data.json");
        utils.writeJsonFile(testDataFile, data);
    });

    it('change ruleformat test',  async function() {
        let createEnvironment = function(envName, project) {
            let env = {
                name: envName,
                project: project,
                checkEnvironmentName: function () {},
                getEnvironment: function () {},
                changeRuleFormat:function () {}
            };
            let result = {
                ruleFormat: "v2019-07-25"
            };
            let tdEnv = td.object(env);
            td.when(tdEnv.changeRuleFormat("qa","v2019-07-25")).thenReturn(result);
            return tdEnv;
        };

        devops = {
            devopsHome : __dirname
        };
        project = new Project("testproject.com", {
            devops: devops,
            getUtils: function () {
                return utils;
            },
            getEnvironment: createEnvironment
        });

        let r1 = await project.changeRuleFormat("qa","v2019-07-25");
        assert.equal(r1.ruleFormat, "v2019-07-25");
    });
});

describe('Project Tests (custom property name)', function () {
    let dummyUtil;
    let data;
    let devops;
    let utils;

    before(function () {
        utils = new VerifyUtils();
        data = [];

        dummyUtil = new Proxy({}, {
            get(receiver, name) {
                return function (...args) {
                    let params = args.slice();
                    params.unshift(name);
                    data.push(params);
                }
            }
        });

        devops = {
            devopsHome : "homeSweetHome"
        }
    });

    it('create Project (custom property name)', function () {
        let project = new Project("Foobar", {
            devops: devops,
            getUtils: function () {
                return dummyUtil;
            },
            version: "0.1.11"
        });
        assert.equal(project.getName(), "Foobar");
        project.createProjectFolders({
            projectName: "Foobar",
            productId: "WAA",
            contractId: "ABF543",
            groupIds: [76342],
            environments: ["foo", "bar", "prod"],
            "customPropertyName": true

        });
        let testDataFile = path.join(__dirname, "project_tests_custom_name.data.json");
        utils.writeJsonFile(testDataFile, data);
    });
});
describe('Project check migration status test', function () {
    let devops, utilsProto;

    before(function () {
        let utilsClass = td.constructor(Utils);
        utilsProto = utilsClass.prototype;

        td.when(utilsProto.fileExists("devopsSettings.json")).thenReturn(true);
        td.when(utilsProto.fileExists("dummy")).thenReturn(true);
        td.when(utilsProto.fileExists("dummy/projectInfo.json")).thenReturn(true);
        td.when(utilsProto.fileExists("dummy/environments/dev/envInfo.json")).thenReturn(true);
        td.when(utilsProto.fileExists("dummy/environments/qa/envInfo.json")).thenReturn(true);
        td.when(utilsProto.readJsonFile("devopsSettings.json")).thenReturn({
            edgeGridConfig: {
                path: "edgegrid.config",
                section: "papi"
            }
        });
        td.when(utilsProto.readJsonFile("dummy/projectInfo.json")).thenReturn({
            "environments": [
                "dev",
                "qa"
            ],
            "name": "dummy",
            "groupId": 61726
        });
        td.when(utilsProto.readJsonFile("dummy/environments/dev/envInfo.json")).thenReturn({
            "name": "dev",
            "propertyName": "dev.dummy",
            "propertyId": 411088
        });
        td.when(utilsProto.readJsonFile("dummy/environments/qa/envInfo.json")).thenReturn({
            "name": "qa",
            "propertyName": "qa.dummy",
            "propertyId": 411091
        });
        td.when(utilsProto.fileExists("edgegrid.config")).thenReturn(true);

        devops = createDevOps({
            devopsHome: '.',
            utilsClass: utilsClass,
            version: "0.1.10"
        });
    });

    it('does upgrade work', function () {
        let project = devops.getProject('dummy');
        td.verify(utilsProto.writeJsonFile("dummy/projectInfo.json", {
            "environments": [
                "dev",
                "qa"
            ],
            "name": "dummy",
            "groupIds": [61726],
            "version": "0.1.10"
        }));

        td.verify(utilsProto.writeJsonFile("dummy/environments/dev/envInfo.json", {
            "name": "dev",
            "propertyName": "dev.dummy",
            "propertyId": 411088,
            "groupId": 61726
        }));

        td.verify(utilsProto.writeJsonFile("dummy/environments/qa/envInfo.json", {
            "name": "qa",
            "propertyName": "qa.dummy",
            "propertyId": 411091,
            "groupId": 61726
        }));
    });
});

describe('Project Promote Test', function () {
    let devops, utils, project;

    before(function () {
        utils = new RoUtils();

        devops = {
            devopsHome : __dirname
        };

        let createEnvironment = function(envName, project) {
            let envInfo = utils.readJsonFile(path.join(__dirname, `testproject.com/environments/${envName}/envInfo.json`));

            let env = {
                name: envName,
                project: project,
                promote: function() {},
                getEnvironmentInfo: function() {},
                isPendingPromotion: function() {},
                checkPromotions: function() {},
                isActive: function() {},
                isDirty: function() {}
            };
            let tdEnv = td.object(env);
            if (envName === "qa") {
                envInfo.latestVersionInfo.stagingStatus = "ACTIVE";
                td.when(tdEnv.isActive("STAGING")).thenReturn(true);
                td.when(tdEnv.isDirty()).thenReturn(false);
                td.when(tdEnv.isPendingPromotion()).thenReturn(true);
                td.when(tdEnv.checkPromotions()).thenReturn({

                })
            } else {
                td.when(tdEnv.isActive("STAGING")).thenReturn(false);
                td.when(tdEnv.isDirty()).thenReturn(false);
            }
            let pending = {
                network: "STAGING",
                activationId: 12345
            };
            td.when(tdEnv.promote("STAGING", ["joe@foo.com"], "Akamai PD Activation")).thenReturn({
                envInfo, pending
            });
            td.when(tdEnv.getEnvironmentInfo()).thenReturn(envInfo);
            return tdEnv;
        };

        project = new Project("testproject.com", {
            devops: devops,
            getUtils: function () {
                return utils;
            },
            getEnvironment: createEnvironment
        });
    });

    it('prev environment', function () {
        assert.isNotOk(project.getPreviousEnvironment('qa'));
        let prevEnv = project.getPreviousEnvironment('staging');
        assert.isOk(prevEnv);
        assert.equal(prevEnv.name, "qa");
        prevEnv = project.getPreviousEnvironment('prod');
        assert.isOk(prevEnv);
        assert.equal(prevEnv.name, "staging");
        assert.isNotOk(project.getPreviousEnvironment('foobar'));
    });

    it('promote test', async function() {
        let result = await project.promote('staging', 'STAGING', ["joe@foo.com"], "Akamai PD Activation");
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 12345
        });

        let result2 = await project.promote('prod', 'STAGING', ["joe@foo.com"], "Akamai PD Activation");
        assert.deepEqual(result2.pending, {
            network: "STAGING",
            activationId: 12345
        });

    });

    describe('Project Promote dirty or not activated Test', function () {
        let devops, utils, project, tdQaEnv, tdStagEnv, tdProdEnv;

        before(function () {
            utils = new RoUtils();

            devops = {
                devopsHome: __dirname
            };

            project = new Project("testproject.com", {
                devops: devops,
                getUtils: function () {
                    return utils;
                }
            });
            let qaEnv = {
                name: "qa",
                project: project,
                promote: function() {},
                getEnvironmentInfo: function() {},
                isPendingPromotion: function() {},
                checkPromotions: function() {},
                isActive: function() {},
                isDirty: function() {}
            };
            let stagingEnv = {
                name: "staging",
                project: project,
                promote: function() {},
                getEnvironmentInfo: function() {},
                isPendingPromotion: function() {},
                checkPromotions: function() {},
                isActive: function() {},
                isDirty: function() {}
            };
            let prodEnv = {
                name: "prod",
                project: project,
                promote: function() {},
                getEnvironmentInfo: function() {},
                isPendingPromotion: function() {},
                checkPromotions: function() {},
                isActive: function() {},
                isDirty: function() {}
            };
            tdQaEnv = td.object(qaEnv);
            tdStagEnv = td.object(stagingEnv);
            tdProdEnv = td.object(prodEnv);

            let fakeGetEnvironment = td.function();
            project.getEnvironment = fakeGetEnvironment;

            td.when(project.getEnvironment("qa")).thenReturn(tdQaEnv);
            td.when(project.getEnvironment("staging")).thenReturn(tdStagEnv);
            td.when(project.getEnvironment("prod")).thenReturn(tdProdEnv);

            td.when(tdQaEnv.checkPromotions()).thenReturn({});
            td.when(tdStagEnv.checkPromotions()).thenReturn({});
            td.when(tdProdEnv.checkPromotions()).thenReturn({});

        });

        it('prev environment', function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdQaEnv.isDirty()).thenReturn(false);

            td.when(tdStagEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdStagEnv.isDirty()).thenReturn(true);

            td.when(tdProdEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdProdEnv.isDirty()).thenReturn(true);

            assert.isNotOk(project.getPreviousEnvironment('qa'));
            let prevEnv = project.getPreviousEnvironment('staging');
            assert.isOk(prevEnv);
            assert.equal(prevEnv.name, "qa");
            prevEnv = project.getPreviousEnvironment('prod');
            assert.isOk(prevEnv);
            assert.equal(prevEnv.name, "staging");
            assert.isNotOk(project.getPreviousEnvironment('foobar'));
        });

        it('promote test qa is dirty', async function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdQaEnv.isDirty()).thenReturn(true);

            td.when(tdProdEnv.isActive("STAGING")).thenReturn(false);
            td.when(tdProdEnv.isDirty()).thenReturn(true);

            await  project.promote('staging', 'STAGING', ["joe@foo.com"],"Akamai PD Activation");
            td.verify(project.getEnvironment("staging").promote("STAGING", ["joe@foo.com"], "Akamai PD Activation"));
        });

        it('promote staging test qa is dirty', async function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdQaEnv.isDirty()).thenReturn(true);

            td.when(tdProdEnv.isActive("STAGING")).thenReturn(false);
            td.when(tdProdEnv.isDirty()).thenReturn(true);
            await  project.promote('staging', 'STAGING', ["joe@foo.com"],"Akamai PD Activation");
            td.verify(project.getEnvironment("staging").promote("STAGING", ["joe@foo.com"], "Akamai PD Activation"));
        });

        it('promote test qa is pending', async function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(false);
            td.when(tdQaEnv.isDirty()).thenReturn(false);

            await  project.promote('prod', 'STAGING', ["joe@foo.com"],"Akamai PD Activation");
            td.verify(project.getEnvironment("prod").promote("STAGING", ["joe@foo.com"], "Akamai PD Activation"));
        });

        it('promote test staging is dirty', async function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdQaEnv.isDirty()).thenReturn(false);

            td.when(tdStagEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdStagEnv.isDirty()).thenReturn(true);

            await  project.promote('prod', 'STAGING', ["joe@foo.com"],"Akamai PD Activation");
            td.verify(project.getEnvironment("prod").promote("STAGING", ["joe@foo.com"], "Akamai PD Activation"));
        });

        it('promote test staging is pending', async function () {
            td.when(tdQaEnv.isActive("STAGING")).thenReturn(true);
            td.when(tdQaEnv.isDirty()).thenReturn(false);

            td.when(tdStagEnv.isActive("STAGING")).thenReturn(false);
            td.when(tdStagEnv.isDirty()).thenReturn(false);

            await  project.promote('prod', 'STAGING', ["joe@foo.com"],"Akamai PD Activation");
            td.verify(project.getEnvironment("prod").promote("STAGING", ["joe@foo.com"], "Akamai PD Activation"));
        });
    });
});
