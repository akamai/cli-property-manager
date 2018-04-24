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
const chai = require('chai');
const assert = chai.assert;

const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.el_tests");

const createDevOps = require("../src/factory");

describe('Factory tests', function () {
    let devops;
    let papiCount = 0;

    class TestPAPI {
        constructor(openClient) {
            this.openClient = openClient;
            papiCount++;
        }
    }

    before(function () {
        devops = createDevOps({
            papiClass: TestPAPI,
            devopsHome: __dirname
        })
    });

    it('Test stuff', function () {
        let qaEnv = devops.getDefaultProject().getEnvironment("qa");
        let papi = qaEnv.getPAPI();
        papi = qaEnv.getPAPI();
        assert.equal(papiCount, 1, "we sould create PAPI only once!");
    });
});