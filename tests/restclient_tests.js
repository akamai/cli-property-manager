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

const OpenClient = require('../src/openclient');
const RecordingClient = require('../src/recordingclient');
const ReplayClient = require('../src/replayclient');
const throwsAsync = require("./testutils").throwsAsync;

const logger = require("../src/logging")
    .consoleLogging()
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


describe('Recording client tests, errors are recorded', function () {
    let recordingClient;
    let replayClient;
    let sender;
    let logs = {};
    let responses = [{
        statusCode: 200,
        body: JSON.stringify({
            result: "OK"
        })
    },{
        statusCode: 400,
        body: JSON.stringify({
            result: "BAD"
        })
    },{
        statusCode: 200,
        body: JSON.stringify({
            result: "OK2"
        })
    }];
    let idx = 0;

    before(function () {
        let utils = td.object(['readJsonFile', 'fileExists', 'writeJsonFile']);
        td.when(utils.readJsonFile("logfile.json")).thenReturn(logs);
        td.when(utils.fileExists("logfile.json")).thenReturn(true);
        let edgeGrid = td.object(['auth']);
        sender = {
            send : function(callback) {
                callback(null, responses[idx]);
                idx++;
            }
        };
        td.when(edgeGrid.auth(td.matchers.isA(Object))).thenReturn(sender);
        recordingClient = new RecordingClient("logfile.json", {
            getUtils : function() {
                return utils;
            },
            getEdgeGrid : function() {
                return edgeGrid;
            },
            recordErrors: true
        });
        replayClient = new ReplayClient("logfile.json", {
            getUtils : function() {
                return utils;
            }
        })

    });

    it('Record GET OK test', async function () {
        let result = await recordingClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK"
        });
    });

    it('Record GET BAD test', async function () {
        return throwsAsync(function() {
            return recordingClient.get("/foo/bar");
        }, "Error: Request failed, status code: 400,\n" +
            "Response Body: '{\"result\":\"BAD\"}'");
    });

    it('Record GET OK2 test', async function () {
        let result = await recordingClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK2"
        });
    });

    it('Replay GET OK test', async function () {
        let result = await replayClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK"
        });
    });

    it('Replay GET BAD test', async function () {
        return throwsAsync(function() {
            return replayClient.get("/foo/bar");
        }, "Error: Request failed, status code: 400,\n" +
            "Response Body: '{\"result\":\"BAD\"}'");
    });

    it('Replay GET OK2 test', async function () {
        result = await replayClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK2"
        });
    });
});


describe('Recording client tests, no errors are recorded', function () {
    let recordingClient;
    let replayClient;
    let sender;
    let logs = {};
    let responses = [{
        statusCode: 200,
        body: JSON.stringify({
            result: "OK"
        })
    },{
        statusCode: 400,
        body: JSON.stringify({
            result: "BAD"
        })
    },{
        statusCode: 200,
        body: JSON.stringify({
            result: "OK2"
        })
    }];
    let idx = 0;

    before(function () {
        let utils = td.object(['readJsonFile', 'fileExists', 'writeJsonFile']);
        td.when(utils.readJsonFile("logfile.json")).thenReturn(logs);
        td.when(utils.fileExists("logfile.json")).thenReturn(true);
        let edgeGrid = td.object(['auth']);
        sender = {
            send : function(callback) {
                callback(null, responses[idx]);
                idx++;
            }
        };
        td.when(edgeGrid.auth(td.matchers.isA(Object))).thenReturn(sender);
        recordingClient = new RecordingClient("logfile.json", {
            getUtils : function() {
                return utils;
            },
            getEdgeGrid : function() {
                return edgeGrid;
            }
        });
        replayClient = new ReplayClient("logfile.json", {
            getUtils : function() {
                return utils;
            }
        })

    });

    it('Record GET OK test', async function () {
        let result = await recordingClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK"
        });
    });

    it('Record GET BAD test', async function () {
        return throwsAsync(function() {
            return recordingClient.get("/foo/bar");
        }, "Error: Request failed, status code: 400,\n" +
            "Response Body: '{\"result\":\"BAD\"}'");
    });

    it('Record GET OK2 test', async function () {
        let result = await recordingClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK2"
        });
    });

    it('Replay GET OK test', async function () {
        let result = await replayClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK"
        });
    });

    it('Replay GET OK2 test', async function () {
        result = await replayClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK2"
        });
    });

    it('Replay GET OK2 test again', async function () {
        result = await replayClient.get("/foo/bar");
        assert.deepEqual(result, {
            result: "OK2"
        });
    });
});