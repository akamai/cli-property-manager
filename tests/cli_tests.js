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
const main = require("../src/cli");
const chai = require('chai');
const assert = chai.assert;


const errors = require('../src/errors');
const helpers = require('../src/helpers');
const createDevOps = require("../src/factory");
const DevOps = require("../src/devops");
const Utils = require('../src/utils');
const RoUtils = require('./ro-utils');
const logger = require("../src/logging")
    .createLogger("devops-prov.project_tests");

const equalIgnoreWhiteSpaces = require('./testutils').equalIgnoreWhiteSpaces;

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


describe('Eat white spaces test', function () {

    it("eat them white spaces, yum yum", function() {
        const textWithManySpaces = `Lala la       text with
            multiple     white space     es 
                                            let's see where they go!`;
        const textWithSingleSpaces = `Lala la text with multiple white space es let's see where they go!`;

        equalIgnoreWhiteSpaces(textWithManySpaces, textWithSingleSpaces);
    });
});

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
            Object.assign(deps, newDeps);
            return createDevOps(deps);
        };
    });

    it('No command test', function () {
        let cliArgs = createCommand();
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 2);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "help.output.txt")))
            let footer = testConsole.logs[1][0];
            equalIgnoreWhiteSpaces(footer, utils.readFile(path.join(__dirname, "testdata", "help.footer.txt")))
        });
    });

    it('Help command test', function () {
        let cliArgs = createCommand("help");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": devopsHome
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 2);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "help.output.txt")))
            let footer = testConsole.logs[1][0];
            equalIgnoreWhiteSpaces(footer, utils.readFile(path.join(__dirname, "testdata", "help.footer.txt")))
        });
    });

    it('Help command lstat', function () {
        let cliArgs = createCommand("help", "lstat");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": devopsHome
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            assert.equal(testConsole.logs.length, 2);
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "lstat.output.txt")))
            let footer = testConsole.logs[1][0];
            equalIgnoreWhiteSpaces(footer, utils.readFile(path.join(__dirname, "testdata", "help.footer.txt")))
        });
    });
});


describe('Devops-prov CLI set default tests', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let devOps;
    let utils = new RoUtils();

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass, devopsHome
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
            let devopsSettingsPath = path.join(__dirname, "devopsSettings.json");
            let devopsSettings = utils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "testproject.com",
                "edgeGridConfig": {
                    "section": "credentials"
                }
            })
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "setDefault.output.txt")))
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
            let devopsSettingsPath = path.join(__dirname, "devopsSettings.json");
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
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "setDefaultAdd.output.txt")))
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
            let devopsSettingsPath = path.join(__dirname, "devopsSettings.json");
            let devopsSettings = roUtils.readJsonFile(devopsSettingsPath);
            assert.deepEqual(devopsSettings, {
                "defaultProject": "example.com",
                "edgeGridConfig": {
                    "section": "frodo"
                }
            })
            let output = testConsole.logs[0][0];
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "setDefaultModified.output.txt")))
        });
    });

    it('set Default test setting format', function () {
        let cliArgs = createCommand("sd", "-f", "json");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.equal(errorCatcher, null);
            let roUtils = devOps.utils;
            let devopsSettingsPath = path.join(__dirname, "devopsSettings.json");
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
            assert.equal(errorCatcher.error, "Error: Akamai pipeline 'foobar' doesn't exist!",
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

    it('set Default invalid property values', function () {
        let cliArgs = createCommand("sd", "-p", "-test");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Option '-e, --emails <emails>' argument missing'",
                    errorCatcher.error.stack)
        });
    });

    it('set Default missing account values', function () {
        let cliArgs = createCommand("sd", "-p", "-s", "-f", "-e", "-a");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Option '-a, --accountSwitchKey <accountSwitchKey>' argument missing'",
                    errorCatcher.error.stack)
        });
    });

    it('set Default missing section values', function () {
        let cliArgs = createCommand("sd", "-s");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Option '-s, --section <section>' argument missing'",
                    errorCatcher.error.stack)
        });
    });

    it('set Default missing format values', function () {
        let cliArgs = createCommand("sd", "-p", "test", "-f");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Option '-f, --format <format>' argument missing'",
                    errorCatcher.error.stack)
        });
    });

    it('set Default missing email values', function () {
        let cliArgs = createCommand("sd", "-e");
        let testConsole = new TestConsole();

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
    }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Option '-e, --emails <emails>' argument missing'",
                    errorCatcher.error.stack)
        });
    });

});

describe('Devops-prov CLI show rule tree', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let getProject;

    before(function () {
        getProject = td.func();
        extractProjectName = td.func();

        let project = td.object(["getRuleTree"]);

        td.when(extractProjectName(td.matchers.anything())).thenReturn("testproject.com");
        td.when(getProject(td.matchers.anything())).thenReturn(project);
        td.when(project.getRuleTree("qa")).thenReturn(
            new Promise((resolve, reject) => {
                resolve('{some rule tree stuff}');
            })
        );
        let getProjectInfo = td.function();
        let changeRuleFormat = td.function();
        td.when(getProjectInfo()).thenReturn({});

        project.getProjectInfo = getProjectInfo;
        project.changeRuleFormat = changeRuleFormat;
        td.when(project.getProjectInfo()).thenReturn();
        td.when(project.changeRuleFormat("qa", "v2019-07-25")).thenReturn({});

        devOpsClass = td.constructor(DevOps);
        createDevOpsFun = function (deps) {
            let newDeps = {
                devopsHome, devOpsClass
            };
            Object.assign(deps, newDeps);

            let devOps = createDevOps(deps);
            devOps.getProject = getProject;
            devOps.extractProjectName = extractProjectName;
            return devOps;
        };
    });

    it('show rule tree test', function () {
        let cliArgs = createCommand("sr", "qa");
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

    it('change ruleformat test', function () {
        let cliArgs = createCommand("crf", "-p", "testproject.com", "qa", "-r", "v2019-07-25");
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher =>  {
            td.verify(devOpsClass.prototype.changeRuleFormat("testproject.com", ["qa"],"v2019-07-25"
            ));

        });
    });
});

describe('Devops-prov CLI search tests', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let devOps;
    let roUtils = new RoUtils();
    let getPAPI;

    before(function () {
        let utilsClass = RoUtils;

        getPAPI = td.func();

        let papi = td.object(["findProperty"]);

        let searchResultPath = path.join(devopsHome, "testdata/search.json");
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
                devopsHome
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
            equalIgnoreWhiteSpaces(output, roUtils.readFile(path.join(devopsHome, "testdata", "search.output.txt")))
        });
    });
});

describe('Devops-prov CLI show defaults tests', function () {
    const devopsHome = __dirname;
    let createDevOpsFun;
    let utils = new RoUtils();

    before(function () {
        let utilsClass = RoUtils;
        createDevOpsFun = function (deps) {
            let newDeps = {
                utilsClass, devopsHome
            };
            Object.assign(deps, newDeps);
            return createDevOps(deps);
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
            equalIgnoreWhiteSpaces(output, utils.readFile(path.join(__dirname, "testdata", "setDefault.output.txt")))
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
                "AKAMAI_PROJECT_HOME": devopsHome
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
                "AKAMAI_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'foobar'");
        });
    });

    it('list status test unexpected option', function () {
        let cliArgs = createCommand("-v", "lstat", "-g", "something");
        let testConsole = new TestConsole();
        let utils = new Utils();

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": devopsHome
            }, createDevOps, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Unknown option: '-g'");
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
            Object.assign(deps, newDeps);
            return createDevOps(deps);
        };
    });

    it('create new project', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with custom property names', function () {
       let cliArgs = createCommand("np", "-p", "testproject.com",
           "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "--custom-property-name", "foo", "bar");
       return mainTester(errorReporter => {
           main(cliArgs, {
               "AKAMAI_PROJECT_HOME": __dirname
           }, createDevOpsFun, errorReporter);
       }, errorCatcher => {
           td.verify(devOpsClass.prototype.createPipeline({
               projectName: "testproject.com",
               productId: "NiceProduct",
               contractId: "XYZ123",
               groupIds: [62234],
               environments: ["foo", "bar"],
               environmentGroupIds: {
                   foo: 62234,
                   bar: 62234
               },
               isInRetryMode: false,
               customPropertyName: true,
               propertyId: undefined,
               propertyName: undefined,
               propertyVersion: undefined,
               variableMode: "default",
               ruleFormat: undefined
           }));
       });
    });

    it('create new project with associate property names', function () {
        let cliArgs = createCommand("np", "-p", "testproject.com", "-e", "seed-template.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "--associate-property-name", "foo", "bar");
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                customPropertyName: true,
                associatePropertyName: true,
                propertyId: undefined,
                propertyName: "seed-template.com",
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with variable-mode chosen with no property', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com", "--variable-mode", "default",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: The variable mode option is only available with existing properties.", errorCatcher.error.stack);
        });
    });

    it('create new project with variable-mode chosen with property string', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com", "--variable-mode", "default",
            "-g", "62234", "-c", "XYZ123", "-e", "someProp", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {

            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: "someProp",
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with variable-mode chosen with property string', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com", "--variable-mode", "default",
            "-g", "62234", "-c", "XYZ123", "-e", "123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 123,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with invalid variable mode', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com", "--variable-mode", "xyz",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            let expectedError = "Error: The variable mode option is only available with existing properties.";
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error, expectedError, errorCatcher.error.stack);
        });
    });

    it('create new project with secure option', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "--secure", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                secureOption: true,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with insecure option', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "--insecure", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                secureOption: false,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project', function () {
        let cliArgs = createCommand("np", "-p", "testproject2.com",
            "-g", "62234", "-g", "62244", "-g", "62353", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar", "baz");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234, 62244, 62353],
                environments: ["foo", "bar", "baz"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62244,
                    baz: 62353
                },
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with retry', function () {
        let cliArgs = createCommand("np", "--retry", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: true,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with custom property names and retry', function () {
        let cliArgs = createCommand("np", "--custom-property-name", "--retry", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: true,
                customPropertyName: true,
                propertyId: undefined,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-p", "testproject2.com",
            "-g", "62234", "--variable-mode", "default", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId variable-mode no var', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-p", "testproject2.com",
            "-g", "62234", "--variable-mode", "no-var", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "no-var",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId with prefix', function () {
        let cliArgs = createCommand("np", "-e", "prp_3456", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId and version', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-n", "4", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: "NiceProduct",
                contractId: "XYZ123",
                groupIds: [62234],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: 62234,
                    bar: 62234
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: 4,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId with prefix no account info', function () {
        let cliArgs = createCommand("np", "-e", "prp_3456", "-p", "testproject2.com", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupIds: [],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: undefined,
                    bar: undefined
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with property name no account info', function () {
        let cliArgs = createCommand("np", "-e", "www.foobar.com", "-p", "testproject2.com", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupIds: [],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: undefined,
                    bar: undefined
                },
                isInRetryMode: false,
                propertyId: undefined,
                propertyName: "www.foobar.com",
                propertyVersion: undefined,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with propertyId and version no account info', function () {
        let cliArgs = createCommand("np", "-e", "3456", "-n", "4", "-p", "testproject2.com", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher);
        }, errorCatcher => {
            td.verify(devOpsClass.prototype.createPipeline({
                projectName: "testproject2.com",
                productId: undefined,
                contractId: undefined,
                groupIds: [],
                environments: ["foo", "bar"],
                environmentGroupIds: {
                    foo: undefined,
                    bar: undefined
                },
                isInRetryMode: false,
                propertyId: 3456,
                propertyName: undefined,
                propertyVersion: 4,
                variableMode: "default",
                ruleFormat: undefined
            }));
        });
    });

    it('create new project with bad version number', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "t43trb+", "-p", "testproject2.com",
            "-g", "grp_62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                "Error: 't43trb+' does not look like a valid property version.", errorCatcher.error.stack);
        });
    });

    it('create new project with bad product', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "12", "-p", "testproject2.com",
                "-g", "grp_62234", "-d", "-c", "XYZ123", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: Unexpected/Missing product id", errorCatcher.error.stack);
        });
    });

    it('create new project with version and no propertyId', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-n", "4", "-p", "testproject2.com",
            "-g", "62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
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
        let expectedError = 'Error: Option \'-e, --propertyId <propertyId/propertyName>\' argument missing\'';
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            console.info(errorCatcher.error);
            assert.equal(errorCatcher.error,
                expectedError, errorCatcher.error.stack);
        });
    });

    //TODO: Fix this case "-c" shouldn't be the pipeline name.
    it('create new project with non sensical options', function () {
        let testConsole = new TestConsole();

        let cliArgs = createCommand("np", "-p", "-s", "-e", "-c");
        let expectedError = 'Error: Missing required argument \'environments\'';
        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                expectedError, errorCatcher.error.stack);
        });
    });

    it('create new project with missing pipeline arg', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "12", "-p",
                "-g", "grp_62234", "-c", "XYZ123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: Unexpected/Missing pipeline name", errorCatcher.error.stack);
        });
    });

    it('create new project with missing contract arg', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "12", "-p", "testproject2.com",
                "-g", "grp_62234", "-c", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: Unexpected/Missing contract id", errorCatcher.error.stack);
        });
    });

    it('create new project with missing group arg', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "12", "-p", "testproject2.com",
                "-g", "-c", "1-AB123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: '-c' does not look like a valid groupId.", errorCatcher.error.stack);
        });
    });

    it('create new project with missing version arg', function () {
        let testConsole = new TestConsole();
        let cliArgs = createCommand("np", "-e", "3456", "-n", "-p", "testproject2.com",
                "-g", "grp_62234", "-c", "1-AB123", "-d", "NiceProduct", "foo", "bar");

        return mainTester(errorCatcher => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorCatcher, testConsole);
    }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: '-p' does not look like a valid property version.", errorCatcher.error.stack);
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

        td.when(devOpsClass.prototype.listRuleFormats())
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(utils.readJsonFile(path.join(__dirname, "testdata", "ruleFormatsList.json")));
                })
            );

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
        testConsole = new TestConsole();
    });

    it('listProducts test', function () {
        let cliArgs = createCommand("lp", "-c", "1-1TJZH5");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
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
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null, errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "groupList.output.txt")))
        }, createDevOpsFun);
    });

    it('listRuleFormats test', function () {
        let cliArgs = createCommand("lrf");
        testConsole = new TestConsole();
        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(null, errorCatcher);
            assert.equal(testConsole.logs.length, 1);
            assert.equal(testConsole.logs[0].length, 1);
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "ruleFormatsList.output.txt")))
        }, createDevOpsFun);
    });

    it('listGroups called twice, no subcommand should be called by commander.js', function () {
        let cliArgs = createCommand("lg", "lg");

        return mainTester(errorReporter => {
            main(cliArgs, {
                "AKAMAI_PROJECT_HOME": __dirname
            }, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.exists(errorCatcher);
            assert.equal(errorCatcher.error,
                    "Error: Didn't expect these parameters: 'lg'", errorCatcher.error.stack);
            }, createDevOpsFun);
    });
});

describe('merge tests', function () {
    let createDevOpsFun;
    let testConsole;
    let utils = new Utils();

    let runBefore = function (merge) {
        let devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("testproject.com");

        td.when(devOpsClass.prototype.merge("testproject.com", "qa", td.matchers.isA((Boolean))))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(merge);
                })
            );

        var devopsHome = __dirname;

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
    };

    it('test merge', function () {
        runBefore({
            fileName: "foobar.json",
            hash: "hash baby hash",
            changesDetected: true,
            validationPerformed: true
        });
        testConsole = new TestConsole();
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.txt")))
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
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.validation.error.txt")))
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
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.validation.warning.txt")))
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
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.hostname.error.txt")))
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
        let cliArgs = createCommand("merge", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[0][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "merge.output.hostname.warning.txt")))
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
            assert.equal(errorCatcher.error, "Error: Didn't expect these parameters: 'prod'");
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
            assert.equal(errorCatcher.error, "Error: Missing required argument 'environment'");
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
        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );
    });

    before(function () {
        devOpsClass = td.constructor(DevOps);

        td.when(devOpsClass.prototype.extractProjectName(td.matchers.isA(Object)))
            .thenReturn("testproject.com");

        td.when(devOpsClass.prototype.promote("testproject.com", "qa", "PRODUCTION",
            "test@foo.com", undefined, undefined))
            .thenResolve({
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
        td.when(devOpsClass.prototype.promote("testproject.com", "qa", "PRODUCTION",
            "test@foo.com", "Message", undefined)).thenReject(new errors.RestApiError("Promotion with Message Failed!"));

        //using stubbing and in this case rejection to test that force option was passed as argument.
        td.when(devOpsClass.prototype.promote("testproject.com", "qa", "PRODUCTION",
            "test@foo.com", undefined, true)).thenReject(new errors.RestApiError("Promotion with force Failed!"));

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
            .thenReturn(new Promise((resolve, reject) => {
                    resolve(checkPromotionsObject);
                })
            );

        let devopsHome = __dirname;

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

    it('test promote', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote with -m message', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-m", "Message", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error.message, "Promotion with Message Failed!")
        }, createDevOpsFun);
    });

    it('test promote with --force option', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "--force", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error.message, "Promotion with force Failed!")
        }, createDevOpsFun);
    });

    it('test promote -w', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w failed', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.failed.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w with cancellation', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.cancelled.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w inactive', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.inactive.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w deactivated', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.deactive.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w aborted', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.aborted.output.txt")))
        }, createDevOpsFun);
    });


    it('test promote -w with zones', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "PRODUCTION", "-e", "test@foo.com", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.wait.zone.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote II', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "p", "-e", "test@foo.com", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "promote.output.txt")))
        }, createDevOpsFun);
    });

    it('test promote -w wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-n", "foo", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });
    it('test promote wrong network name', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("promote", "-w", "-n", "foo", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            assert.equal(errorCatcher.error, "Error: Illegal network name: 'foo'");
        }, createDevOpsFun);
    });

    it('test check promotion status', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs", "qa");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs[1][0];
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.output.txt")))
        }, createDevOpsFun);
    });

    it('test check promotion status with -w', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs","-w", "qa");
        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.wait.output.txt")))
        }, createDevOpsFun);
    });

    it('test check promotion status with -w, already checked', function () {
        testConsole = new TestConsole();
        let cliArgs = createCommand("cs","-w", "qa");

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.wait.already.output.txt")))
        }, createDevOpsFun);
    });


    it('test check promotion status with --wait-for-activate', function () {

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
        let cliArgs = createCommand("cs", "--wait-for-activate", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");

            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.wait.delayed.output.txt")))
        }, createDevOpsFun);
    });

    it('test check promotion status -w with zones', function () {
        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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
        let cliArgs = createCommand("cs", "-w", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            testConsole.logs.splice(testConsole.logs.length -3, 1);
            let output = testConsole.logs.join("\n");

            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.wait.zone.delayed.output.txt")));
        }, createDevOpsFun);
    });
});

describe('promotion tests with exceptions', function () {
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
            .thenReturn("testproject.com");

        let counter = 0;
        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa"))
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

        let devopsHome = __dirname;

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
        let cliArgs = createCommand("-v", "cs", "-w", "qa");

        return mainTester(errorReporter => {
            main(cliArgs, {}, createDevOpsFun, errorReporter, testConsole);
        }, errorCatcher => {
            let output = testConsole.logs.join("\n");
            assert.equal(output, utils.readFile(path.join(__dirname, "testdata", "checkPromotions.wait.exception.delayed.output.txt")));
            assert.exists(errorCatcher.error);
            assert.equal(errorCatcher.error.message, "Some bad stuff happened");
            assert.equal(errorCatcher.error.messageId, "bad_error");
        }, createDevOpsFun);
    });
});
