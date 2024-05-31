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

const path = require("path");
const main = require("../../src/pm/property_manager_cli");
const chai = require('chai');
const assert = chai.assert;


const errors = require('../../src/errors');
const helpers = require('../../src/helpers');
const createDevOps = require("../../src/factory");
const DevOps = require("../../src/pm/devops_property_manager");
const projectClass = require("../../src/pm/project_property_manager");
const Utils = require('../../src/utils');
const RoUtils = require('./../ro-utils');
const logger = require("../../src/logging").createLogger("snippets.cli_tests");

const equalIgnoreWhiteSpaces = require('./../testutils').equalIgnoreWhiteSpaces;

const createCommand = function (...args) {
    let result = ['/usr/bin/node', 'bin/snippets'];
    result.push(...args);
    return result;
};

class TestConsole {
    constructor() {
        this.logs = [];
        this.errors = [];
    }

    debug(...args) {
        this.logs.push(args);
    }

    info(...args) {
        this.logs.push(args);
    }

    warn(...args) {
        this.logs.push(args);
    }

    error(...args) {
        this.errors.push(args);
    }
}

const mainTester = function (mainCaller, verifyCallback) {
    let errorCatcher = null;
    let reportError = function (error) {
        errorCatcher = {
            error
        };
    };

    mainCaller(reportError);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                verifyCallback(errorCatcher);
                resolve();
            } catch (e) {
                reject(e);
            }
        }, 60)
    });
};

const baseDir =  path.join(__dirname, "..");

describe('Commands with no action called', function () {
    it("just -v statement", function() {
        let cliArgs = createCommand("-v");
        return mainTester(errorReporter => {
            main(cliArgs, {}, {}, errorReporter, {});
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: No command called")
        });
    });

    it("just -f statement", function() {
        let cliArgs = createCommand("-f");
        let expectedError = 'Error: Option \'-f, --format <format>\' argument missing\'';
        return mainTester(errorReporter => {
            main(cliArgs, {}, {}, errorReporter, {});
        }, errorCatcher => {
            assert.equal(errorCatcher.error, expectedError)
        });
    });

    it("just -f json statement", function() {
        let cliArgs = createCommand("-f", "json");
        return mainTester(errorReporter => {
            main(cliArgs, {}, {}, errorReporter, {});
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: No command called")
        });
    });

    it("just -s statement", function() {
        let cliArgs = createCommand("-s");
        let expectedError = 'Error: Option \'-s, --section <section>\' argument missing\'';
        return mainTester(errorReporter => {
            main(cliArgs, {}, {}, errorReporter, {});
        }, errorCatcher => {
            assert.equal(errorCatcher.error, expectedError)
        });
    });

    it("just -a statement", function() {
        let cliArgs = createCommand("-a");
        let expectedError = 'Error: Option \'-a, --accountSwitchKey <accountSwitchKey>\' argument missing\'';
        return mainTester(errorReporter => {
            main(cliArgs, {}, {}, errorReporter, {});
        }, errorCatcher => {
            assert.equal(errorCatcher.error, expectedError)
        });
    });

});

describe('Snippets CLI create new project', function () {
    let createDevOpsFun;
    let devOpsClass;
    const devopsHome = baseDir;

    beforeEach(function () {
        devOpsClass = td.constructor(DevOps);
        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass, devopsHome
            };
            Object.assign(deps, newDeps);

            return createDevOps(deps);
        };
    });

    it('create new snippets project', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "default",
                contractId: "XYZ123",
                propertyId: undefined,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: false
            }));
        });
    });

    it('fail on environments - snippets new project', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "qa","dev");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'qa, dev'",
                    errorCatcher.error.stack)
        });
    });

    it('create new project with secure option', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "--secure", "-d", "NiceProduct");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "default",
                contractId: "XYZ123",
                propertyId: undefined,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: false,
                secureOption: true
            }));
        });
    });

    it('create new project with insecure option', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "--insecure", "-d", "NiceProduct");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "default",
                contractId: "XYZ123",
                propertyId: undefined,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: false,
                secureOption: false
            }));
        });
    });

    it('create new project with retry', function () {
        let cliArgs = createCommand("np", "--retry", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "default",
                contractId: "XYZ123",
                propertyId: undefined,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: true
            }));
        });
    });

    it('create new project with propertyId', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "no-var",
                contractId: "XYZ123",
                propertyId: 3456,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: false
            }));
        });
    });

    it('create new project with propertyId with prefix', function () {
        let cliArgs = createCommand("np", "-e", "prp_3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "no-var",
                contractId: "XYZ123",
                propertyId: 3456,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: undefined,
                isInRetryMode: false
            }));
        });
    });

    it('create new project with propertyId and version', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-n", "4", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                variableMode: "no-var",
                contractId: "XYZ123",
                propertyId: 3456,
                groupId: "62234",
                propertyName: undefined,
                propertyVersion: 4,
                isInRetryMode: false
            }));
        });
    });

    it('create new project with propertyId with prefix no account info', function () {
        let cliArgs = createCommand("np", "-e", "prp_3456", "-p", "testproject2.com");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupId: undefined,
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "no-var"
            }));
        });
    });

    it('create new project with property name no account info', function () {
        let cliArgs = createCommand("np", "-e", "www.foobar.com", "-p", "testproject2.com");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupId: undefined,
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: "www.foobar.com",
                propertyVersion: undefined,
                variableMode: "no-var"
            }));
        });
    });

    it('create new project with property name no account info and no local directory', function () {
        let cliArgs = createCommand("np", "-e", "www.foobar.com", "-p", "testproject2.com", "--nolocaldir");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupId: undefined,
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: "www.foobar.com",
                propertyVersion: undefined,
                variableMode: "no-var",
                noLocalFolders: true
            }));
        });
    });

    it('create new project with propertyId and version no account info', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-n", "4", "-p", "testproject2.com");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createProperty({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupId: undefined,
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: 4,
                variableMode: "no-var"
            }));
        });
    });

    it('create new project with bad version number', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "t43trb+", "-p", "testproject2.com",
            "-g", "grp_62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: 't43trb+' does not look like a valid property version.", errorCatcher.error.stack);
        });
    });

    it('create new project with version and no propertyId', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-n", "4", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: Version without propertyId provided. Also need property ID.", errorCatcher.error.stack);
        });
    });

    it('create new project with -e but no propertyId', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "testproject2.com", "-e");
        let expectedError = "Error: Option '-e, --propertyId <propertyId/propertyName>' argument missing'";
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                expectedError, errorCatcher.error.stack);
        });
    });

    it('create new project with missing group', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "testproject2.com", "-d", "testProduct", "-g");
        let expectedError = "Error: Option '-g, --groupId <groupId>' argument missing'";
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    expectedError, errorCatcher.error.stack);
        });
    });

    it('create new project with missing group due to next flag grabbed as group', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "testproject2.com", "-d", "testProduct", "-g", "-c");
        let expectedError = "Error: Unexpected/Missing group id";
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    expectedError, errorCatcher.error.stack);
        });
    });

    it('create new project with missing group due to next flag grabbed as groupId', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "testproject2.com", "-d", "testProduct", "-g", "-test", "-c", "1-ABC23");
        let expectedError = "Error: Unexpected/Missing group id";
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    expectedError, errorCatcher.error.stack);
        });
    });

    //TODO: Fix this case "-c" shouldn't be the pipeline name.
    it('create new project with non sensical options', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "-s", "-e", "-c");
        let expectedError = "Error: Unexpected/Missing property name";
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            console.info(errorCatcher.error)
            assert.equal(errorCatcher.error,
                expectedError, errorCatcher.error.stack);
        });
    });
});

describe('Snippets CLI import property', function () {
    let createDevOpsFun;
    let devOpsClass;
    let testConsole;
    let utils = new Utils();

    before(function() {
        devOpsClass = td.constructor(DevOps);
        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass
            };
            Object.assign(deps, newDeps);
            let devOps = createDevOps(deps);
            return devOps;
        };

        td.when(devOpsClass.prototype.importProperty({
            propertyName: "non_existent_property.com",
            variableMode: "no-var"
        }))
            .thenThrow(utils.readFile(path.join(baseDir, "testdata", "import.non.existent.property.output.txt")));
    });

    it('check if devops import function is called with correct parameters', function () {
        let cliArgs = createCommand("import", "-p", "propertyName.com");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.importProperty({
                propertyName: "propertyName.com",
                variableMode: "no-var"
            }));
        });
    });

    it('import non existent property', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("import", "-p", "non_existent_property.com");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                utils.readFile(path.join(baseDir, "testdata", "import.non.existent.property.output.txt")),
                    errorCatcher.error.stack);
        });
    });
});

describe('Snippets CLI show rule tree', function () {
    const devopsHome = baseDir;
    let createDevOpsFun;
    let getProject;

    before(function () {

        getPropertyRules = td.func();
        td.when(getPropertyRules(td.matchers.anything()))
            .thenReturn(new Promise((resolve, reject) => {
                resolve('{some rule tree stuff}');
            }));

        createDevOpsFun = function (deps) {
            let newDeps = {
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.getPropertyRules = getPropertyRules;
            return devOps;
        };
    });

    it('show rule tree test', function () {
        let cliArgs = createCommand("sr", "-p", "example.com");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, '"{some rule tree stuff}"');
        });
    });
});


describe('Snippets CLI PULL command', function () {
    const devopsHome = baseDir;
    let getProject;
    let project;
    before(function () {
        getProject = td.func();
        extractProjectName = td.func();

        project = td.object(["updateProperty", "getName", "loadEnvironmentInfo"]);

        td.when(project.getName()).thenReturn("testproject.com");
        td.when(project.loadEnvironmentInfo()).thenReturn({
            latestVersionInfo : {
                propertyVersion : 9
            },
            activeIn_STAGING_Info : {
                propertyVersion : 8
            },
            activeIn_PRODUCTION_Info : {
                propertyVersion : 5
            }
        });

    });

    it('update local output', function () {
        let createDevOpsFun = function (deps) {
            let newDeps = {
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.updateProperty = function(){
                return project;
            };
            return devOps;
        };

        let cliArgs = createCommand("update-local", "-p", "testproject.com", "--force-update");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 2);
            let output = testConsole.logs.join("\n");
            assert.equal(output, 'Updating and overwriting local files for testproject.com from PAPI...\nUpdated testproject.com to the latest: v9');
        });
    });

    it('update local output -no property', function () {

        let basedir2 =  path.join(__dirname, "..","..","tests_no_default");


        let createDevOpsFun2 = function (deps) {
            let newDeps = {
                devopsHome : basedir2
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.updateProperty = function(){
                return project;
            }
            return devOps;
        };
        let cliArgs = createCommand("update-local", "--force-update");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {devopsHome :  path.join(__dirname, "..")}, createDevOpsFun2, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, 'Error: Can\'t read default property name from snippetsSettings.json and no property name provided per -p <property name> option');
        });
    });

    it('update local output -with network', function () {
        let createDevOpsFun = function (deps) {
            let newDeps = {
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.updateProperty = function(){
                return project;
            };
            return devOps;
        };

        let cliArgs = createCommand("update-local", "-p", "testproject.com", "--force-update", "-n", "stg");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 2);
            let output = testConsole.logs.join("\n");
            assert.equal(output, 'Updating and overwriting local files for testproject.com from PAPI...\nUpdated testproject.com to the latest: v9');
        });
    });
});

describe('Snippets CLI search tests', function () {
    let createDevOpsFun;
    let devOps;
    let roUtils = new RoUtils();
    let getPAPI;

    before(function () {
        let utilsClass = RoUtils;

        getPAPI = td.func();

        let papi = td.object(["findProperty"]);

        let searchResultPath = path.join(baseDir, "testdata/search.json");
        let result = roUtils.readJsonFile(searchResultPath);

        td.when(getPAPI()).thenReturn(papi);
        td.when(papi.findProperty("FOOBAR")).thenReturn(
            new Promise((resolve, reject) => {
                resolve(result);
            })
        );

        createDevOpsFun = function(deps) {
            let newDeps = {
                utilsClass,
                devopsHome: baseDir
            };
            Object.assign(deps, newDeps);
            devOps = createDevOps(deps);
            devOps.getPAPI = getPAPI;

            return devOps;
        };
    });

    it('search test', function () {
        let cliArgs = createCommand("s", "FOOBAR");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, roUtils.readFile(path.join(baseDir, "testdata", "search.output.txt")))
        });
    });
});

describe('Snippets CLI set default tests', function () {
    let createDevOpsFun;
    let devOps;
    let utils = new RoUtils();

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass,
                devopsHome: baseDir
            };
            Object.assign(deps, newDeps);

            devOps = createDevOps(deps);
            return devOps;
        };
    });

    it('set Default test', function () {
        let cliArgs = createCommand("sd", "-p", "testproject.com");
        main(cliArgs, {}, createDevOpsFun);
    });

    it('set Default test set two defaults', function () {
        let cliArgs = createCommand("sd", "-p", "testproject.com", "-s", "credentials");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let roUtils = devOps.utils;
            let devopsSettingsPath = path.join(baseDir, "snippetsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "testproject.com",
                "edgeGridConfig": {
                    "section": "credentials"
                }
            })
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(baseDir, "testdata", "setDefault.output.txt")))
        });
    });

    it('set Default test add new default field', function () {
        let cliArgs = createCommand("sd", "-e", "test@akamai.com");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let roUtils = devOps.utils;
            let devopsSettingsPath = path.join(baseDir, "snippetsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "testproject.com",
                "edgeGridConfig": {
                    "section": "credentials"
                },
                "emails": [
                    "test@akamai.com"
                ]
            })
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(baseDir, "testdata", "setDefaultAdd.output.txt")))
        });
    });

    it('set Default test modify default values', function () {
        let cliArgs = createCommand("sd", "-p", "example.com", "-s", "frodo");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let roUtils = devOps.utils;
            let devopsSettingsPath = path.join(baseDir, "snippetsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "example.com",
                "edgeGridConfig": {
                    "section": "frodo"
                }
            })
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(baseDir, "testdata", "setDefaultModified.output.txt")))
        });
    });

    it('set Default test setting format', function () {
        let cliArgs = createCommand("sd", "-f", "json");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            let roUtils = devOps.utils;
            let devopsSettingsPath = path.join(baseDir, "snippetsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "testproject.com",
                "edgeGridConfig": {
                    "section": "credentials"
                },
                "outputFormat": "json"
            })
        });
    });

    it('set Default test, project does not exist', function () {
        let cliArgs = createCommand("sd", "-p", "foobar");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: PM CLI property 'foobar' doesn't exist!",
                errorCatcher.error.stack)
        });
    });

    it('set Default test, unexpected parameter', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("sd", "-p", "testproject.com", "andthensome");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'andthensome'",
                errorCatcher.error.stack)
        });
    });
});

describe('Devops-prov CLI show defaults tests', function () {
    let createDevOpsFun;
    let devOps;
    let utils = new RoUtils();

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass,
                devopsHome: baseDir
            };
            Object.assign(deps, newDeps);

            devOps = createDevOps(deps);
            return devOps;
        };
    });

    it('show default test', function () {
        let cliArgs = createCommand("sf");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(baseDir, "testdata", "setDefault.output.txt")))
        });
    });
});

describe('Snippets list tests', function () {
    let createDevOpsFun;
    let utils = new Utils();
    let testConsole;

    before(function () {
        let devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.listContracts())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "contractList.json")));
                })
            );

        td.when(devOpsClass.prototype.listProducts("1-1TJZH5"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "productList.json")));
                })
            );

        td.when(devOpsClass.prototype.listGroups())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "groupList.json")));
                })
            );

        td.when(devOpsClass.prototype.listRuleFormats())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "ruleFormatsList.json")));
                })
            );

        td.when(devOpsClass.prototype.listCpcodes("1-1TJZH5", 15231))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "CPCodeList.json")));
                })
            );

        td.when(devOpsClass.prototype.listProperties("1-3CV382", 18385))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertiesList.json")));
                })
            );

        td.when(devOpsClass.prototype.listPropertyHostnames(td.matchers.anything(), true))
            .thenReturn(new Promise((resolve, reject) => {
                resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertyHostnamesList.json")));
            }));

        td.when(devOpsClass.prototype.updatePropertyHostnames(td.matchers.anything(), td.matchers.anything()))
            .thenReturn(new Promise((resolve, reject) => {
                resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertyHostnamesList.json")));
            }));

        td.when(devOpsClass.prototype.patchPropertyHostnames(td.matchers.anything(), td.matchers.anything()))
            .thenReturn(new Promise((resolve, reject) => {
                resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertyHostnamesList.json")));
            }));

        td.when(devOpsClass.prototype.listEdgeHostnames("1-1TJZH5", 61726))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "edgeHostnames.json")));
                })
            );

        td.when(devOpsClass.prototype.getPropertyRules(td.matchers.anything()))
            .thenReturn(new Promise((resolve, reject) => {
                resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertyVariablesList.json")));
            }));

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.devopsSettings = {
                outputFormat: "table"
            };
            return devOps;
        };
    });


    it('listContracts test', function () {
        let cliArgs = createCommand("lc");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "contractList.output.txt")))
        }, createDevOpsFun);
    });

    it('listProducts test', function () {
        let cliArgs = createCommand("lp", "-c", "1-1TJZH5");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "productList.output.txt")))
        }, createDevOpsFun);
    });

    it('listGroups test', function () {
        let cliArgs = createCommand("lg");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "groupList.output.txt")))
        }, createDevOpsFun);
    });

    it('listRuleFormats test', function () {
        let cliArgs = createCommand("lrf");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "ruleFormatsList.output.txt")))
        }, createDevOpsFun);
    });

    it('listCPCodes test', function () {
        let cliArgs = createCommand("lcp", "-c", "1-1TJZH5", "-g", "15231");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "CPCodeList.output.txt")))
        }, createDevOpsFun);
    });

    it('listProperties test', function () {
        let cliArgs = createCommand("lpr", "-c", "1-3CV382", "-g", "18385");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "properties.output.txt")))
        }, createDevOpsFun);
    });

    it('listCPCodes test', function () {
        let cliArgs = createCommand("lcp", "-g", "-c");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: '-c' does not look like a valid groupId.",
                    errorCatcher.error.stack)
        }, createDevOpsFun);
    });

    it('listCPCodes test, with contract and group', function () {
        let cliArgs = createCommand("lcp");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: groupId needs to be provided as a number",
                    errorCatcher.error.stack)
        }, createDevOpsFun);
    });

    it('listEdgeHostNames test, no contract or group', function () {
        let cliArgs = createCommand("leh");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: groupId needs to be provided as a number",
                    errorCatcher.error.stack)
        }, createDevOpsFun);
    });

    it('listEdgeHostNames test', function () {
        let cliArgs = createCommand("leh", "-c", "1-1TJZH5", "-g", "61726");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "edgeHostnames.output.txt")))
        }, createDevOpsFun);
    });

    it('listPropertyVariables test', function () {
        let cliArgs = createCommand("lpv", "-p","dev.pipeline.com", "--propver", 1);
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "propertyVariables.output.txt")))
        }, createDevOpsFun);
    });

    it('listPropertyRuleformat test', function () {
        let cliArgs = createCommand("lprf", "-p","dev.pipeline.com", "--propver", 1);
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "propertyRuleformat.output.txt")))
        }, createDevOpsFun);
    });

    it('listPropertyHostnames test', function () {
        let cliArgs = createCommand("lph", "-p","dev.pipeline.com", "--propver", 1);
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "propertyHostnames.output.txt")))
        }, createDevOpsFun);
    });

    it('updatePropertyHostnames test', function () {
        let hostFilePath = path.join(baseDir, "testdata/host.json");
        let cliArgs = createCommand("hu", "-p","dev.pipeline.com", "--propver", 1, "--file", hostFilePath);
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            let expected = utils.readFile(path.join(baseDir,"testdata", "updatePropertyHostnamesOutput.json"))
            assert.deepEqual(output,expected)
        }, createDevOpsFun);
    });

    it('patchPropertyHostnames test', function () {
        let hostFilePath = path.join(baseDir, "testdata/patchhost.json");
        let cliArgs = createCommand("hu", "-p","dev.pipeline.com", "--propver", 1,"--patch","--file", hostFilePath, "-v");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            let expected = utils.readFile(path.join(baseDir,"testdata", "updatePropertyHostnamesOutput.json"))
            assert.deepEqual(output,expected)
        }, createDevOpsFun);
    });

    describe('merge tests', function () {
        let createDevOpsFun;
        let testConsole;
        let utils = new Utils();

        let runBefore = function (merge) {
            let devOpsClass = td.constructor(DevOps);

            td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
                .thenReturn("testproject.com");

            td.when(devOpsClass.prototype.merge("testproject.com", td.matchers.isA(Boolean)))
                .thenReturn(new Promise((resolve, reject) => {
                        resolve(merge);
                    })
                );

            td.when(devOpsClass.prototype.propertyUpdate(td.matchers.anything(), td.matchers.anything(), td.matchers.anything()))
                .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "propertyUpdateSuppressOutput.json")));
                }));

            var devopsHome = baseDir;

            createDevOpsFun = function (deps) {
                let newDeps = {
                    devOpsClass,
                    devopsHome
                };
                Object.assign(deps, newDeps);

                let devOps = createDevOps(deps);
                devOps.devopsSettings = {
                    outputFormat: "table"
                };
                return devOps;
            };
        }

        it('test merge', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");

            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.txt")))
            }, createDevOpsFun);
        });

        it('test merge with unexpected parameter', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge", "qa", "prod");
            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'qa, prod'");
            }, createDevOpsFun);
        });

        it('test merge, missing environment', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");
            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.txt")))
            }, createDevOpsFun);
        });

        it('test merge, no validate', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: false
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge", "-n");
            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.noValidate.output.txt")))
            }, createDevOpsFun);
        });


        it('test merge validation error', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true,
                validationErrors: [{error:true}]
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");

            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.validation.error.txt")))
            }, createDevOpsFun);
        });

        it('test merge validation warning', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true,
                validationWarnings: [{error:true}]
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");

            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.validation.warning.txt")))
            }, createDevOpsFun);
        });

        it('test merge hostname error', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true,
                hostnameErrors: [{error:true}]
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");

            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.hostname.error.txt")))
            }, createDevOpsFun);
        });

        it('test merge hostname warning', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true,
                hostnameWarnings: [{error:true}]
            });
            testConsole = new TestConsole();
            let cliArgs = createCommand("merge");

            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
                let output = testConsole.logs[0][0];
                assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "merge.output.hostname.warning.txt")))
            }, createDevOpsFun);
        });

        it('test property update with suppress parameter', function () {
            runBefore({
                fileName: "foobar.json",
                hash: "hash baby hash",
                changesDetected: true,
                validationPerformed: true
            });
            testConsole = new TestConsole();
            let rulesJsonFilePath = path.join(baseDir, "testdata/ruletreeError.json");
            let cliArgs = createCommand("property-update", "-p","example.com", "--propver", 1, "--file", rulesJsonFilePath, "--suppress");
            return mainTester(errorReporter => {
                main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
            }, errorCatcher => {
               assert.equal(null,errorCatcher);
               assert.equal(testConsole.logs.length, 1);
               assert.equal(testConsole.logs[0].length, 1);
                let output = testConsole.logs[0][0];
                // let expected = utils.readFile(path.join(baseDir,"testdata", "propertyUpdateSuppressOutput.json"))
                // assert.deepEqual(output,expected)
                assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "propertyUpdateSuppressOutput.json")))
            }, createDevOpsFun);
        });
    });


});

describe('activate version tests', function () {
    const devopsHome = baseDir;
    let createDevOpsFun;
    let getProject;
    let utils = new Utils();

    before(function () {
        let checkActivationsObject = helpers.clone(utils.readJsonFile(path.join(baseDir, "testdata", "activateVersionWait.json")));

        let activateVersion = td.func();
        td.when(activateVersion(td.matchers.anything(), "STAGING", "one@email.com, two@email.com", "activate version"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(baseDir, "testdata", "activateVersion.json")));
                })
            );

        let checkActivations = td.func();
        td.when(checkActivations(td.matchers.anything(), td.matchers.anything()))
            .thenReturn(
                new Promise((resolve, reject) => {
                    resolve(checkActivationsObject);
                })
            );

        createDevOpsFun = function (deps) {
            let newDeps = {
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.activateVersion = activateVersion;
            devOps.checkActivations = checkActivations;
            return devOps;
        };

    });


    it('activate version test success', function () {
        let cliArgs = createCommand("activate-version", "-p", "example.com", "--propver", "2", "-n", "stag", "-e", "one@email.com, two@email.com", "--message", "activate version");
       let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null,errorCatcher);
            assert.equal(testConsole.logs.length, 2);
            assert.equal(testConsole.logs[0].length, 1);
            assert.equal(testConsole.logs[1].length, 1);
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "activateVersion.output.txt")))
        }, createDevOpsFun);
    });

    it('activate version with wait option (polling) test success', function () {


        let cliArgs = createCommand("activate-version", "-p", "example.com", "--propver", "2", "-n", "stag", "-w", "-e", "one@email.com, two@email.com", "--message", "activate version");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": baseDir
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null, errorCatcher);
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir,"testdata", "activateVersionWait.output.txt")))
        }, createDevOpsFun);
    });

});

describe('Snippets activation tests', function () {
    let createDevOpsFun;
    let testConsole;
    let utils = new Utils();
    let devOpsClass;

    let checkPromotionsObject ={
        promotionUpdates: {
            "PRODUCTION": {
                "activationId": "5355534",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 1,
                "network": "PRODUCTION",
                "activationType": "ACTIVATE",
                "status": "ACTIVE",
                "submitDate": "2018-01-26T16:11:44Z",
                "updateDate": "2018-01-26T16:19:55Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"]
            },
            "STAGING": {
                "activationId": "5355810",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 3,
                "network": "STAGING",
                "activationType": "ACTIVATE",
                "status": "ACTIVE",
                "submitDate": "2018-01-30T18:37:23Z",
                "updateDate": "2018-01-30T18:38:41Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"],
                "fmaActivationState": "steady",
                "fallbackInfo": {
                    "fastFallbackAttempted": false,
                    "fallbackVersion": 1,
                    "canFastFallback": true,
                    "steadyStateTime": 1517337521,
                    "fastFallbackExpirationTime": 1517341121,
                    "fastFallbackRecoveryState": null
                }
            }
        }
    };

    after(function (){
        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );
    });

    before(function () {
        devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("new.snippets.com");

        td.when(devOpsClass.prototype.promote("new.snippets.com", "new.snippets.com", "PRODUCTION",
            "test@foo.com", undefined, undefined))
            .thenResolve({
                envInfo: {
                    "name": "new.snippets.com",
                    "propertyName": "new.snippets.comm",
                    "propertyId": 429569,
                    "latestVersionInfo": {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2018-01-19T22:21:15Z",
                        "productionStatus": "PENDING",
                        "stagingStatus": "ACTIVE",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    },
                    "environmentHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                    "ruleTreeHash": "9816b34c7e3ecbeab3b9086bff48a8b1221bc9bdc981759a0a4d96235de65b65",
                    "lastSavedHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                    "lastSavedHostnamesHash": "b37548ddec7ced2fd63422383b3f57acaad83218f2b3dd740b2a74ebb4fc9057",
                    "activeIn_STAGING_Info": {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2018-01-19T22:21:15Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "ACTIVE",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    },
                    "pendingActivations": {"PRODUCTION": 5355534}
                },
                pending: {
                    network: "STAGING",
                    activationId: 5355534
                }
            });
        //using stubbing and in this case rejection to test that message was passed as argument. Stubbing + verify causes mocha warning!
        td.when(devOpsClass.prototype.promote("new.snippets.com", "new.snippets.com", "PRODUCTION",
            "test@foo.com", "Message", undefined))
            .thenResolve({
                envInfo: {
                    "name": "new.snippets.com",
                    "propertyName": "new.snippets.comm",
                    "propertyId": 429569,
                    "latestVersionInfo": {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2018-01-19T22:21:15Z",
                        "productionStatus": "PENDING",
                        "stagingStatus": "ACTIVE",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    },
                    "environmentHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                    "ruleTreeHash": "9816b34c7e3ecbeab3b9086bff48a8b1221bc9bdc981759a0a4d96235de65b65",
                    "lastSavedHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                    "lastSavedHostnamesHash": "b37548ddec7ced2fd63422383b3f57acaad83218f2b3dd740b2a74ebb4fc9057",
                    "activeIn_STAGING_Info": {
                        "propertyVersion": 1,
                        "updatedByUser": "jpws7ubcv5jjsv37",
                        "updatedDate": "2018-01-19T22:21:15Z",
                        "productionStatus": "INACTIVE",
                        "stagingStatus": "ACTIVE",
                        "productId": "Web_App_Accel",
                        "ruleFormat": "latest"
                    },
                    "pendingActivations": {"PRODUCTION": 5355534}
                },
                pending: {
                    network: "STAGING",
                    activationId: 5355534
                }
            });

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        let devopsHome = baseDir;

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass,
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.devopsSettings = {
                outputFormat: "table"
            };
            return devOps;
        };
    });

    it('test activate', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-n", "PRODUCTION", "-e", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate with -m message', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("atv", "-m", "Message", "-n", "PRODUCTION", "-e", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate II', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("atv", "-n", "p", "-e", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w failed', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "FAILED";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.failed.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w with cancellation', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING_CANCELLATION";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ABORTED";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.cancelled.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w inactive', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "INACTIVE";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.inactive.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w deactivated', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING_DEACTIVATION";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING_DEACTIVATION";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "DEACTIVATED";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.deactive.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w aborted', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ABORTED";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.aborted.output.txt")))
        }, createDevOpsFun);
    });


    it('test activate -w with zones', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "NEW";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_1";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_2";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_3";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.activate.wait.zone.output.txt")))
        }, createDevOpsFun);
    });

    it('test activate -w wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-n", "foo");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });


    it('test activate wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("activate", "-w", "-n", "foo");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });

    it('test check activation status', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.output.txt")))
        }, createDevOpsFun);
    });

    it('test check activation status with -w', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs","-w");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.wait.output.txt")))
        }, createDevOpsFun);
    });

    it('test check activation status with -w, already checked', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs","-w");

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                            "promotionUpdates": {},
                            "promotionStatus": {
                                "latestVersion": 10,
                                "activeInStagingVersion": 10,
                                "activeInProductionVersion": 9
                            }
                        }
                    );
                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.wait.already.output.txt")))
        }, createDevOpsFun);
    });


    it('test check activation status with --wait-for-activate', function () {

        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        testConsole = new TestConsole();
        let cliArgs = createCommand("cs", "--wait-for-activate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");

            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.wait.delayed.output.txt")))
        }, createDevOpsFun);
    });

    it('test check activation status -w with zones', function () {
        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "NEW";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_1";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_2";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "ZONE_3";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        testConsole = new TestConsole();
        let cliArgs = createCommand("cs", "-w");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");

            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.wait.zone.delayed.output.txt")));
        }, createDevOpsFun);
    });

});

describe('Snippets deactivation tests', function () {
    let createDevOpsFun;
    let testConsole;
    let utils = new Utils();
    let devOpsClass;

    let checkPromotionsObject ={
        promotionUpdates: {
            "PRODUCTION": {
                "activationId": "5355534",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 1,
                "network": "PRODUCTION",
                "activationType": "DEACTIVATE",
                "status": "INACTIVE",
                "submitDate": "2018-01-26T16:11:44Z",
                "updateDate": "2018-01-26T16:19:55Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"]
            },
            "STAGING": {
                "activationId": "5355810",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 3,
                "network": "STAGING",
                "activationType": "DEACTIVATE",
                "status": "ACTIVE",
                "submitDate": "2018-01-30T18:37:23Z",
                "updateDate": "2018-01-30T18:38:41Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"],
                "fmaActivationState": "steady",
                "fallbackInfo": {
                    "fastFallbackAttempted": false,
                    "fallbackVersion": 1,
                    "canFastFallback": true,
                    "steadyStateTime": 1517337521,
                    "fastFallbackExpirationTime": 1517341121,
                    "fastFallbackRecoveryState": null
                }
            }
        }
    };

    let envInfoObj = {
        envInfo: {
            "name": "old.snippets.com",
            "propertyName": "old.snippets.comm",
            "propertyId": 429569,
            "latestVersionInfo": {
                "propertyVersion": 1,
                "updatedByUser": "jpws7ubcv5jjsv37",
                "updatedDate": "2018-01-19T22:21:15Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "PENDING",
                "productId": "Web_App_Accel",
                "ruleFormat": "latest"
            },
            "environmentHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
            "ruleTreeHash": "9816b34c7e3ecbeab3b9086bff48a8b1221bc9bdc981759a0a4d96235de65b65",
            "lastSavedHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
            "lastSavedHostnamesHash": "b37548ddec7ced2fd63422383b3f57acaad83218f2b3dd740b2a74ebb4fc9057",
            "activeIn_STAGING_Info": {
                "propertyVersion": 1,
                "updatedByUser": "jpws7ubcv5jjsv37",
                "updatedDate": "2018-01-19T22:21:15Z",
                "productionStatus": "ACTIVE",
                "stagingStatus": "ACTIVE",
                "productId": "Web_App_Accel",
                "ruleFormat": "latest"
            },
            "pendingActivations": {"STAGING": 5355534}
        },
        pending: {
            network: "STAGING",
            activationId: 5355534
        }
    };

        let envInfoObj2 = {
            envInfo: {
                "name": "old.snippets.com",
                "propertyName": "old.snippets.comm",
                "propertyId": 429569,
                "latestVersionInfo": {
                    "propertyVersion": 1,
                    "updatedByUser": "jpws7ubcv5jjsv37",
                    "updatedDate": "2018-01-19T22:21:15Z",
                    "productionStatus": "PENDING",
                    "stagingStatus": "ACTIVE",
                    "productId": "Web_App_Accel",
                    "ruleFormat": "latest"
                },
                "environmentHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                "ruleTreeHash": "9816b34c7e3ecbeab3b9086bff48a8b1221bc9bdc981759a0a4d96235de65b65",
                "lastSavedHash": "65552d50550e97f1ec9d4c42b8ad97e3069f1a6a5a0df34230b199cd75d7c222",
                "lastSavedHostnamesHash": "b37548ddec7ced2fd63422383b3f57acaad83218f2b3dd740b2a74ebb4fc9057",
                "activeIn_STAGING_Info": {
                    "propertyVersion": 1,
                    "updatedByUser": "jpws7ubcv5jjsv37",
                    "updatedDate": "2018-01-19T22:21:15Z",
                    "productionStatus": "ACTIVE",
                    "stagingStatus": "ACTIVE",
                    "productId": "Web_App_Accel",
                    "ruleFormat": "latest"
                },
                "pendingActivations": {"PRODUCTION": 5355534}
            },
            pending: {
                network: "PRODUCTION",
                activationId: 5355534
            }
    };


    after(function (){
        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );
    });

    before(function () {
        devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("old.snippets.com");

        td.when(devOpsClass.prototype.deactivate("old.snippets.com", "STAGING",
            "test@foo.com", undefined))
            .thenResolve(envInfoObj);

        td.when(devOpsClass.prototype.deactivate("old.snippets.com", "STAGING",
            "test@foo.com", "Message"))
            .thenResolve(envInfoObj);

        td.when(devOpsClass.prototype.deactivate("old.snippets.com", "PRODUCTION",
            "test@foo.com", undefined))
            .thenResolve(envInfoObj2);

        td.when(devOpsClass.prototype.checkPromotions("old.snippets.com", "old.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );
        td.when(devOpsClass.prototype.deactivate("old.snippets.com", "PRODUCTION", undefined, undefined))
            .thenThrow("PM CLI Error: 'no_property_active_error' occurred: \n" +
                " No version of the property with id = 494097 is active on STAGING network");

        let devopsHome = baseDir;

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass,
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.devopsSettings = {
                outputFormat: "table"
            };
            return devOps;
        };
    });

    it('test deactivate', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-n", "STAGING", "-e", "test@foo.com", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.deactivate.output.txt")))
        }, createDevOpsFun);
    });

    it('test deactivate with -m message', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-m", "Message", "-n", "STAGING", "-e", "test@foo.com", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.deactivate.output.txt")))
        }, createDevOpsFun);
    });

    it('test deactivate II', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-n", "s", "-e", "test@foo.com", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.deactivate.output.txt")))
        }, createDevOpsFun);
    });

    it('test deactivate when nothing is active', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-n", "p", "--force-deactivate");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "PM CLI Error: 'no_property_active_error' occurred: \n" +
                " No version of the property with id = 494097 is active on STAGING network")
        }, createDevOpsFun);
    });

    it('test deactivate -w', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "--force-deactivate");

        td.when(devOpsClass.prototype.checkPromotions("old.snippets.com", "old.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.deactivate.wait.output.txt")))
        }, createDevOpsFun);
    });

    it('test deactivate -w failed', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "--force-deactivate");

        td.when(devOpsClass.prototype.checkPromotions("old.snippets.com", "old.snippets.com"))
            .thenReturn(new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "PENDING";
                    resolve(clone);
                }),
                new Promise((resolve, reject) => {
                    let clone = helpers.clone(checkPromotionsObject);
                    clone.promotionUpdates.PRODUCTION.status = "FAILED";
                    resolve(clone);                })
            );

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.deactivate.wait.failed.output.txt")))
        }, createDevOpsFun);
    });

    it('test deactivate -w wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-n", "foo", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });

    it('test deactivate no network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Need network name, staging or production");
        }, createDevOpsFun);
    });

    it('test deactivate wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("deactivate", "-w", "-n", "foo", "--force-deactivate");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });

});

describe('Snippets Deactivate missing property name', function () {
    const devopsHome = baseDir;
    let getProject;
    let project;
    before(function () {
        getProject = td.func();
        extractProjectName = td.func();

        project = td.object(["updateProperty", "getName", "loadEnvironmentInfo"]);

        td.when(project.getName()).thenReturn("testproject.com");
        td.when(project.loadEnvironmentInfo()).thenReturn({
            latestVersionInfo : {
                propertyVersion : 9
            }
        });

    });

    it('deactivate output -no property', function () {

        let basedir2 =  path.join(__dirname, "..","..","tests_no_default");

        let createDevOpsFun2 = function (deps) {
            let newDeps = {
                devopsHome : basedir2
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.updateProperty = function(){
                return project;
            }
            return devOps;
        };
        let cliArgs = createCommand("datv", "--force-deactivate");
        let testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {devopsHome :  path.join(__dirname, "..")}, createDevOpsFun2, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, 'Error: Can\'t read default property name from snippetsSettings.json and no property name provided per -p <property name> option');
        });
    });
});


describe('Snippets activate tests with exceptions', function () {
    let createDevOpsFun;
    let devOpsClass;
    let checkPromotionsObject ={
        promotionUpdates: {
            "PRODUCTION": {
                "activationId": "5355534",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 1,
                "network": "PRODUCTION",
                "activationType": "ACTIVATE",
                "status": "ACTIVE",
                "submitDate": "2018-01-26T16:11:44Z",
                "updateDate": "2018-01-26T16:19:55Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"]
            },
            "STAGING": {
                "activationId": "5355810",
                "propertyName": "dev.devopsdemolive.com",
                "propertyId": "429569",
                "propertyVersion": 3,
                "network": "STAGING",
                "activationType": "ACTIVATE",
                "status": "ACTIVE",
                "submitDate": "2018-01-30T18:37:23Z",
                "updateDate": "2018-01-30T18:38:41Z",
                "note": "   ",
                "notifyEmails": ["j@m.com"],
                "fmaActivationState": "steady",
                "fallbackInfo": {
                    "fastFallbackAttempted": false,
                    "fallbackVersion": 1,
                    "canFastFallback": true,
                    "steadyStateTime": 1517337521,
                    "fastFallbackExpirationTime": 1517341121,
                    "fastFallbackRecoveryState": null
                }
            }
        }
    };

    before(function () {
        devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("new.snippets.com");

        let counter = 0;
        td.when(devOpsClass.prototype.checkPromotions("new.snippets.com", "new.snippets.com"))
            .thenDo(() => {
                counter++;
                if (counter === 1) {
                    return new Promise((resolve, reject) => {
                        let clone = helpers.clone(checkPromotionsObject);
                        clone.promotionUpdates.PRODUCTION.status = "NEW";
                        resolve(clone);
                    });
                } else if (counter === 2) {
                    return new Promise((resolve, reject) => {
                        let clone = helpers.clone(checkPromotionsObject);
                        clone.promotionUpdates.PRODUCTION.status = "PENDING";
                        resolve(clone);
                    });
                } else if (counter === 3) {
                    return new Promise((resolve, reject) => {
                        let clone = helpers.clone(checkPromotionsObject);
                        clone.promotionUpdates.PRODUCTION.status = "PENDING";
                        resolve(clone);
                    });
                } else {
                    return new Promise((resolve, reject) => {
                        reject(new errors.RestApiError("Some bad stuff happened", "bad_error", 400, {"boo": "bar"}));
                    });
                }

            });

        let devopsHome = baseDir;

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass,
                devopsHome
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.devopsSettings = {
                outputFormat: "table"
            };
            return devOps;
        };
    });

    it('test check promotion status -w with errors after some time', function () {
        let testConsole = new TestConsole();
        let utils = new Utils();
        let cliArgs = createCommand("-v", "cs", "-w");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(baseDir, "testdata", "snippets.checkActivations.wait.exception.delayed.output.txt")));
            assert.exists(errorCatcher.error);
            assert.equal(errorCatcher.error.message, "Some bad stuff happened");
            assert.equal(errorCatcher.error.messageId, "bad_error");
        }, createDevOpsFun);
    });
});