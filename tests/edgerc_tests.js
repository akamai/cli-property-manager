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


const path = require("path");
const chai = require('chai');
const assert = chai.assert;

const edgerc = require("../src/edgegrid/edgerc");

describe('Edgerc tests', function () {
    it('Parse test success', function () {
        let cred = edgerc.getSection(path.join(__dirname, "edgerc.config"), "credentials");
        assert.exists(cred);
        assert.equal(cred.host, "https://blahblahblah");
        assert.equal(cred.client_token, "foobarvoobawejrw");
    });

    it('Parse test with class success', function () {
        let edgeRC = new edgerc.EdgeRC(path.join(__dirname, "edgerc.config"));
        assert.exists(edgeRC);
        assert.deepEqual(edgeRC.getSectionNames(), ["credentials", "frodo"]);
        let frodo = edgeRC.getSection("frodo");
        assert.equal(frodo.host, "https://ewrdfsfsdweew");
        assert.equal(frodo.client_token, "foobasdfsdfwdsfnfnfgnfgn");
        assert.equal(frodo.client_secret, "werlwewewrvvsvsvs=06U7n=dc=");
    });

    it('Parse test bad section', function () {
        try {
            edgerc.getSection(path.join(__dirname, "edgerc.config"), "nonexistent");
            assert.fail("should throw exception")
        } catch (ex) {
            assert.isTrue(ex.message.startsWith("Section 'nonexistent' not found in edgerc file: "));
            assert.isTrue(ex.message.endsWith("tests/edgerc.config'. Possible section names: ['credentials', 'frodo']"));
        }
    });

    it('Parse test non existent file', function () {
        assert.throws(() => {
            edgerc.getSection(path.join(__dirname, "edgercblah.config"), "nonexistent");
        }, `ENOENT: no such file or directory, open '${__dirname}/edgercblah.config'`);
    });

    it('Parse test wrong file format', function () {
        assert.throws(() => {
            edgerc.getSection(path.join(__dirname, "devopsSettings.json"), "nonexistent");
        }, "Unexpected data '{' outside of section in line 0!");
    });
});