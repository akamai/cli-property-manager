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

const VerifyUtils = require("./verify-utils");
const RoUtils = require("./ro-utils");
const throwsAsync = require("./testutils").throwsAsync;

const Project = require('../src/project');

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
            }
        });
        assert.equal(project.getName(), "Foobar");
        project.createProjectFolders({
            projectName: "Foobar",
            productId: "WAA",
            contractId: "ABF543",
            groupId: 76342,
            environments: ["qa", "staging", "production"]
        });
        let testDataFile = path.join(__dirname, "project_tests.data.json");
        utils.writeJsonFile(testDataFile, data);
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
            td.when(tdEnv.promote("STAGING", ["joe@foo.com"])).thenReturn({
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
        let result = await project.promote('staging', 'STAGING', ["joe@foo.com"]);
        assert.deepEqual(result.pending, {
            network: "STAGING",
            activationId: 12345
        });

        return throwsAsync(function() {
            return project.promote('prod', 'STAGING', ["joe@foo.com"]);
        }, "Error: Environment 'staging' needs to be active without any pending changes");
    });
});
