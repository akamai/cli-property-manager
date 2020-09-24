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
const _ = require('underscore');
const PAPI = require("../src/papi");

describe('PAPI Tests', function () {
    let papi;
    let openClient;

    before(function () {
        openClient = td.object(['post', 'put', 'get']);
        papi = new PAPI(openClient);
    });

    it ('create Property', function() {
        papi.createProperty("foobar.com", "Waa", "CTR-123", 3452, "18-12-2018");
        td.verify(openClient.post("/papi/v1/properties?groupId=3452&contractId=CTR-123", {
            productId: "Waa",
            propertyName: "foobar.com",
            ruleFormat: "18-12-2018"
        }));
    });

    it('create EdgeHostnames', function () {
        papi.createEdgeHostname("CTR-345", 3598, {body: "body"});
        td.verify(openClient.post("/papi/v1/edgehostnames/?contractId=CTR-345&groupId=3598", {body: "body"}));
    });

    it('show rule tree', function() {
        papi.getPropertyVersionRules(494064, 1);
        td.verify(openClient.get("/papi/v1/properties/494064/versions/1/rules", {}));
    });

    it('find property', function() {
        papi.findProperty("FOOBAR");
        td.verify(openClient.post('/papi/v1/search/find-by-value', {
            propertyName: "FOOBAR"
        }));
    });

    it('get property', function(){
       papi.getPropertyInfo(123456);
       td.verify(openClient.get('/papi/v1/properties/123456'));
    });


});