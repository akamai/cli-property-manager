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



const createDevOps = require('../../src/factory');
const PAPI = require("../../src/papi");

const logger = require("../../src/logging")
    .createLogger("snippets.merger_test");

const VerifyUtils = require('../verify-utils');
const createOverlayUtils = require('../overlay-utils');
const throwsAsync = require("../testutils").throwsAsync;

const baseDir = path.join(__dirname, "..");
const devopsHome = baseDir;


const DevOpsSnippets = require('../../src/pm/devops_property_manager');
const SnippetsProject = require('../../src/pm/project_property_manager');
const EnvironmentSnippets = require('../../src/pm/environment_property_manager');
const MergerSnippets = require('../../src/pm/merger_property_manager');


const devOpsClass = DevOpsSnippets;
const projectClass = SnippetsProject;
const environmentClass = EnvironmentSnippets;
const mergerClass = MergerSnippets;

describe('Merger Tests', function () {
    let project;
    let devops;
    let projectName = "merger.snippets.com";

    before(function () {
        let papiClass = td.constructor(PAPI);
        let utils = new VerifyUtils();
        let validationResults = utils.readJsonFile(path.join(baseDir, "testdata", "testruletree.waa.json"));
        validationResults.errors = [];
        validationResults.warnings = [];
        td.when(papiClass.prototype.validatePropertyVersionRules(
            td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.matchers.anything()))
            .thenReturn(validationResults);

        devops = createDevOps({
            devopsHome: devopsHome,
            utilsClass: VerifyUtils,
            papiClass: papiClass,
            devOpsClass,
            projectClass,
            environmentClass,
            mergerClass
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

    it('resolvePath test', function () {
        let environment = project.getEnvironment("qa");
        assert.deepEqual(environment.resolvePath("rules/children/0/criteria/0/name"), {
            "template": "config-snippets/compression.json",
            "value": "contentType",
            "location": "criteria/0/name",
            "variables": []
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/0/options/hostname"), {
            "template": "config-snippets/main.json",
            "location": "rules/behaviors/0/options/hostname",
            "value": "origin-new.snippets.com",
            "variables": []
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/1/options/value/id"), {
            "template": "config-snippets/main.json",
            "location": "rules/behaviors/1/options/value/id",
            "value": "INPUT_CPCODE_ID",
            "variables": []
        });
        assert.deepEqual(environment.resolvePath("rules/behaviors/2"), {
            "template": "config-snippets/main.json",
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
            "template": "config-snippets/static.json",
            "value": undefined,
            "variables": []
        });
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
        }, "Error: Can't load config snippet include: 'foobar.json'");
    });

});