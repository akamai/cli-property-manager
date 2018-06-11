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


const chai = require('chai');
const assert = chai.assert;
const _ = require("underscore");

const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.testutils");

const throwsAsync = async function (fn, expectation) {
    let didThrow = true;
    try {
        await fn();
        didThrow = false;
    } catch (e) {
        if (_.isString(expectation)) {
            assert.equal(e, expectation, e.stack);
        } else if (_.isFunction(expectation)) {
            expectation(e);
        } else {
            throw Error(`Unsupported expectation type: ${expectation}`);
        }
    }
    if(!didThrow) {
        if (_.isString(expectation)) {
            assert.fail("Didn't throw exception", expectation);
        } else if (_.isFunction(expectation)) {
            assert.fail("Didn't throw exception");
        } else {
            throw Error(`Unsupported expectation type: ${expectation}`);
        }
    }
};

module.exports = {
    throwsAsync
};