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

const errors = require('../src/errors');
const DevOps = require("../src/devops");

describe('features', function() {
    it("testing mocked Promises", function() {
        let devOpsClass = td.constructor(DevOps);
        let index = -1;

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa")).thenDo(function () {
            index++;
            if (index === 0) {
                return new Promise((resolve, reject) => {
                    resolve("NEW");
                })
            } else if (index === 1) {
                return new Promise((resolve, reject) => {
                    resolve("PENDING");
                });
            } else {
                return new Promise((resolve, reject) => {
                    reject(new errors.RestApiError("Some bad stuff happened", "bad_error", 400, {"boo": "bar"}));
                });
            }
        });

        let devOps = new devOpsClass();

        const handler = function() {
            devOps.checkPromotions("testproject.com", "qa").then(data => {
                console.log("Got response: ", data);
                setTimeout(handler, 1)
            }).catch(error => {
                console.log("Failure!");
                assert.equal(index, 2);
            });
        };

        setTimeout(handler, 1);
    });
});
