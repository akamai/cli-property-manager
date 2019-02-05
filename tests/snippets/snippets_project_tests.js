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
const _ = require('underscore');
const path = require('path');

const VerifyUtils = require("../verify-utils");
const RoUtils = require("../ro-utils");

const Utils = require('../../src/utils');
const createDevOps = require('../../src/factory');

const SnippetsProject = require('../../src/pm/project_property_manager')

const baseDir = path.join(__dirname, "..");
describe('Snippets Project Tests', function () {
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
        let project = new SnippetsProject("Foobar", {
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
            groupId: 76342
        });
        let testDataFile = path.join(__dirname, "snippets.project_tests.data.json");
        utils.writeJsonFile(testDataFile, data);
    });
});


describe('Snippets Project check migration status test', function () {
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

describe('Snippets Project Promote and Deactivate Test', function () {
    let devops, utils, project;

    before(function () {
        utils = new RoUtils();

        devops = {
            devopsHome : baseDir
        };

        let createEnvironment = function(envName, project) {
            let envInfo = utils.readJsonFile(path.join(baseDir, `new.snippets.com/envInfo.json`));

            let env = {
                name: envName,
                project: project,
                promote: function() {},
                deactivate: function() {},
                getEnvironmentInfo: function() {},
                isPendingPromotion: function() {},
                checkPromotions: function() {},
                isActive: function() {},
                isDirty: function() {}
            };
            let tdEnv = td.object(env);
            if (envName === "new.snippets.com") {
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
            td.when(tdEnv.deactivate("STAGING", ["joe@foo.com"], "Akamai PD Deactivation")).thenReturn({
                envInfo, pending
            });
            td.when(tdEnv.getEnvironmentInfo()).thenReturn(envInfo);
            return tdEnv;
        };

        project = new SnippetsProject("new.snippets.com", {
            devops: devops,
            getUtils: function () {
                return utils;
            },
            getEnvironment: createEnvironment
        });
    });

    it('promote test', async function() {
        let result = await project.promote('new.snippets.com', 'STAGING', ["joe@foo.com"], "Akamai PD Activation");
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 12345
        });
        project.promote('new.snippets.com', 'STAGING', ["joe@foo.com"]);

    });

    it('deactivate test', async function() {
        let result = await project.deactivate('new.snippets.com', 'STAGING', ["joe@foo.com"], "Akamai PD Deactivation");
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 12345
        });
        project.deactivate('new.snippets.com', 'STAGING', ["joe@foo.com"]);

    });
});
