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

const OpenClient = require('../src/openclient');
const throwsAsync = require("./testutils").throwsAsync;

const logger = require("../src/logging")
    .createLogger("devops-prov.restclient_tests");


describe('Open client tests', function () {
    let openClient;
    let sender;
    before(function () {
        let edgeGrid = td.object(['auth']);
        sender = {};
        td.when(edgeGrid.auth(td.matchers.isA(Object))).thenReturn(sender);
        openClient = new OpenClient({
            getEdgeGrid : function(options) {
                return edgeGrid;
            }
        })
    });

    it('GET test', async function () {
        sender.send = function(callback) {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    result: "OK"
                })
            })
        };
        let result = await openClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK"
        });
    });

    it('GET test with 400', async function () {
        sender.send = function(callback) {
            callback(null, {
                statusCode: 400,
                body: JSON.stringify({
                    result: "BAD"
                })
            })
        };
        return throwsAsync(function() {
            return openClient.get("/foo/bar");
        }, "Error: Request failed, status code: 400,\n" +
            "Response Body: '{\"result\":\"BAD\"}'");
    });

});
