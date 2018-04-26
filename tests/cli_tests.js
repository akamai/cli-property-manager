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

const path = require("path");
const main = require("../src/cli");
const chai = require('chai');
const assert = chai.assert;


const createDevOps = require("../src/factory");
const DevOps = require("../src/devops");
const Utils = require('../src/utils');
const RoUtils = require('./ro-utils');
const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.project_tests");

const createCommand = function (...args) {
    let result = ['/usr/bin/node', 'bin/devops-prov'];
    result.push(...args);
    return result;
};

class TestConsole {
    constructor() {
        this.logs = [];
        this.errors = [];
    }

    info(...args) {
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
        }, 20)
    });
};

const whiteSpaceRegex = /\s+/g;
const eatWhiteSpaces = function(text) {
    return text.replace(whiteSpaceRegex, " ");
};

const equalIgnoreWhiteSpaces = function(actual, expected, message) {
    assert.equal(eatWhiteSpaces(actual), eatWhiteSpaces(expected), message);
};

describe('Eat white spaces test', function () {

    it("eat them white spaces, yum yum", function() {
        const textWithManySpaces = `Lala la       text with
            multiple     white space     es 
                                            let's see where they go!`;
        const textWithSingleSpaces = `Lala la text with multiple white space es let's see where they go!`;

        equalIgnoreWhiteSpaces(textWithManySpaces, textWithSingleSpaces);
    });
});

describe('Devops-prov CLI provide help test', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let utils = new RoUtils();

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass
            };
            Object.assign(newDeps, deps);

            return createDevOps(newDeps);
        };
    });

    it('No command test', function () {
        let cliArgs = createCommand();
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "help.output.txt")))
        });
    });

    it('Help command test', function () {
        let cliArgs = createCommand("help");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "help.output.txt")))
        });
    });

    it('Help command lstat', function () {
        let cliArgs = createCommand("help", "lstat");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "lstat.output.txt")))
        });
    });
});


describe('Devops-prov CLI set default tests', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let devopsHolder = {};

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass, devopsHome
            };
            Object.assign(newDeps, deps);

            let devOps = createDevOps(newDeps);
            devopsHolder.devops = devOps;
            return devOps;
        };
    });

    it('set Default test', function () {
        let cliArgs = createCommand("sd", "-p", "testproject.com");
        main(cliArgs, {}, createDevOpsFun);
    });

    it('set Default test set two defaults', function () {
        let cliArgs = createCommand("sd", "-p", "example.com", "-s", "frodo");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            let roUtils = devopsHolder.devops.utils;
            let devopsSettingsPath = path.join(__dirname, "devopsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "example.com",
                "edgeGridConfig": {
                    "section": "frodo"
                }
            })
        });
    });

    it('set Default test, project does not exist', function () {
        let cliArgs = createCommand("sd", "-p", "foobar");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Pipeline 'foobar' doesn't exist!",
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

describe('Devops-prov CLI list status', function () {
    const devopsHome = __dirname;

    it('list status test', function () {
        let cliArgs = createCommand("lstat");
        let testConsole = new TestConsole();
        let utils = new Utils();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "listStatus.output.txt")))
        });
    });

    it('list status test unexpected parameter', function () {
        let cliArgs = createCommand("-v", "lstat", "foobar");
        let testConsole = new TestConsole();
        let utils = new Utils();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'foobar'");
        });
    });

    it('list status test unexpected option', function () {
        let cliArgs = createCommand("-v", "lstat", "-f", "something");
        let testConsole = new TestConsole();
        let utils = new Utils();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Unknown option: '-f'");
        });
    });
});


describe('Devops-prov CLI create new project', function () {
    let createDevOpsFun;
    let devOpsClass;

    beforeEach(function () {
        devOpsClass = td.constructor(DevOps);
        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass
            };
            Object.assign(newDeps, deps);

            return createDevOps(newDeps);
        };
    });

    it('create new project', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createNewProject({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupId: 62234,
                environments: ["foo", "bar"],
                isInRetryMode: false
            }));
        });
    });

    it('create new project with retry', function () {
        let cliArgs = createCommand("np", "--retry", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createNewProject({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupId: 62234,
                environments: ["foo", "bar"],
                isInRetryMode: true
            }));
        });
    });

    it('create new project with propertyId', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createNewProject({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupId: 62234,
                environments: ["foo", "bar"],
                isInRetryMode: false,
                propertyId: 3456
            }));
        });
    });

    it('create new project with propertyId with prefix', function () {
        let cliArgs = createCommand("np", "-e", "prp_3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createNewProject({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupId: 62234,
                environments: ["foo", "bar"],
                isInRetryMode: false,
                propertyId: 3456
            }));
        });
    });

    it('create new project with propertyId and version', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-n", "4", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createNewProject({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupId: 62234,
                environments: ["foo", "bar"],
                isInRetryMode: false,
                propertyId: 3456,
                version: 4
            }));
        });
    });

    it('create new project with bad propertyId', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "foobarbaz", "-n", "4", "-p", "testproject2.com",
            "-g", "grp_62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: 'foobarbaz' does not look like a valid propertyId.", errorCatcher.error.stack);
        });
    });

    it('create new project with bad version number', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "t43trb+", "-p", "testproject2.com",
            "-g", "grp_62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
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
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: Version without propertyId provided. Also need property ID.", errorCatcher.error.stack);
        });
    });
});

describe('list tests', function () {
    let createDevOpsFun;
    let utils = new Utils();
    let testConsole;

    before(function () {
        let devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.listProducts("1-1TJZH5"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve('');
                })
            );

        td.when(devOpsClass.prototype.listGroups())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(__dirname, "testdata", "groupList.json")));
                })
            );

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass
            };
            Object.assign(newDeps, deps);

            return createDevOps(newDeps);
        };
        testConsole = new TestConsole();
    });

    it('listProducts test', function () {
        let cliArgs = createCommand("lp", "-c", "1-1TJZH5");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "TypeError: Cannot read property 'items' of undefined", errorCatcher.error.stack);
        }, createDevOpsFun);
    });

    it('listGroups test', function () {
        let cliArgs = createCommand("lg");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PD_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null, errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "groupList.output.txt")))
        }, createDevOpsFun);
    });
});

describe('merge tests', function () {
    let createDevOpsFun;
    let testConsole;
    let utils = new Utils();

    before(function () {
        let devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("testproject.com");

        td.when(devOpsClass.prototype.merge("testproject.com", "qa", true))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        fileName: "foobar.json",
                        hash: "hash baby hash",
                        changesDetected: true,
                        validationPerformed: true
                    });
                })
            );

        td.when(devOpsClass.prototype.merge("testproject.com", "qa", false))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        fileName: "foobar.json",
                        hash: "hash baby hash",
                        changesDetected: true,
                        validationPerformed: false
                    });
                })
            );

        var devopsHome = __dirname;

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass,
                devopsHome
            };
            Object.assign(newDeps, deps);

            return createDevOps(newDeps);
        };
    });

    it('test merge', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.txt")))
        }, createDevOpsFun);
    });

    it('test merge with unexpected parameter', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("merge", "qa", "prod");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'prod'");
        }, createDevOpsFun);
    });

    it('test merge, missing environment', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("merge");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Missing required argument 'environment'");
        }, createDevOpsFun);
    });

    it('test merge, no validate', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("merge", "-n", "qa");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.noValidate.output.txt")))
        }, createDevOpsFun);
    });
});

describe('promotion tests', function () {
    let createDevOpsFun;
    let testConsole;
    let utils = new Utils();

    before(function () {
        let devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("testproject.com");

        td.when(devOpsClass.prototype.promote("testproject.com", "qa", "PRODUCTION", ["test@foo.com"]))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
                        envInfo: {
                            "name": "dev",
                            "propertyName": "dev.devopsdemolive.com",
                            "propertyId": 429569,
                            "latestVersionInfo": {
                                "propertyVersion": 1,
                                "updatedByUser": "jpws7ubcv5jjsv37",
                                "updatedDate": "2018-01-19T22:21:15Z",
                                "productionStatus": "PENDING",
                                "stagingStatus": "ACTIVE",
                                "etag": "ab1d556620690bea03c7a671230589b50808a71c",
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
                                "etag": "ab1d556620690bea03c7a671230589b50808a71c",
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
                })
            );

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve({
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
                    });
                })
            );

        var devopsHome = __dirname;

        createDevOpsFun = function (deps) {
            let newDeps = {
                devOpsClass,
                devopsHome
            };
            Object.assign(newDeps, deps);

            return createDevOps(newDeps);
        };
    });

    it('test promote', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "PRODUCTION", "qa", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote II', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "p", "qa", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "foo", "qa", "test@foo.com");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });

    it('test check promotion status', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cps", "qa");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.output.txt")))
        }, createDevOpsFun);
    });
});
