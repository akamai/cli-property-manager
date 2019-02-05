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
const path = require('path');
const chai = require('chai');
const assert = chai.assert;

const logger = require("../src/logging")
    .createLogger("devops-prov.environment_tests");

const {throwsAsync, equalIgnoreWhiteSpaces} = require("./testutils");

const VerifyUtils = require('./verify-utils');
const RoUtils = require('./ro-utils');
const createOverlayUtils = require('./overlay-utils');
const Project = require('../src/project');
const Environment = require('../src/environment');
const EdgeHostnameManager = require('../src/edgehostname_manager').EdgeHostnameManager;
const Template = require('../src/template');
const EL = require('../src/el');
const errors = require('../src/errors');
const helpers = require('../src/helpers');


describe('Environment static function tests', function () {
    it('_extractPropertyId should be able to extract the propertyId ', function () {
        let pcData = {
            "propertyLink": "/papi/v0/properties/prp_410651?groupId=grp_61726&contractId=ctr_1-1TJZH5"
        };
        assert.equal(Environment._extractPropertyId(pcData), 410651);

        pcData.propertyLink = "/papi/v0/properties/410651?groupId=grp_61726&contractId=ctr_1-1TJZH5";
        assert.equal(Environment._extractPropertyId(pcData), 410651);
    });


    it('_extractEdgeHostnameId should be able to extract the edgehostnameId ', function () {
        let pcData = { edgeHostnameLink: '/papi/v0/edgehostnames/2683119?contractId=1-1TJZH5&groupId=61726' };
        assert.equal(EdgeHostnameManager._extractEdgeHostnameId(pcData), 2683119);

        pcData.edgeHostnameLink = '/papi/v0/edgehostnames/ehn_2683119?contractId=1-1TJZH5&groupId=61726';
        assert.equal(EdgeHostnameManager._extractEdgeHostnameId(pcData), 2683119);
    });

    it('_extractActivationId testing extraction of activation ID', function () {
        let activationData = {
            "activationLink" : "/papi/v0/properties/414298/activations/4998030"
        };

        assert.equal(Environment._extractActivationId(activationData), 4998030);

        activationData.edgeHostnameLink = "/papi/v0/properties/prp_414298/activations/atv_4998030";
        assert.equal(Environment._extractActivationId(activationData), 4998030);
    });

    it('_extractVersionId testing extraction of version id', function () {
        let versionData = {
            "versionLink": "/papi/v0/properties/429569/versions/2"
        };

        assert.equal(Environment._extractVersionId(versionData), 2);

        versionData.versionLink = "/papi/v0/properties/prp_429569/versions/2";
        assert.equal(Environment._extractVersionId(versionData), 2);
    });

});




describe('Edgehostname Manager Unit Tests', function () {

    let papi;
    let project;
    let env;
    let ehm;
    before(function () {
        let getProjectInfo = td.function();
        project = td.object(['storeEnvironmentInfo', 'loadEnvironmentInfo', 'loadEnvironmentHostnames', 'getProjectInfo', 'getName']);
        td.when(getProjectInfo()).thenReturn({}); // This is spoofed because getProjectInfo is used in the constructor of the environment
        project.getProjectInfo = getProjectInfo;
        papi = td.object(['createProperty', 'latestPropertyVersion']);
        env =  new Environment('qa', {
            project: project,
            getPAPI: function() {
                return papi;
            },
            getTemplate: function(pmData, rules) {
                return new Template(pmData, rules)
            }
        });
        ehm = new EdgeHostnameManager(env);

    });

    it('check clean hostname', function () {
        let hostnames =[ {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : "ehn_3248236",
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : "ehn_3216762",
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        let hostnamesClean = [ {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3248236,
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3216762,
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        ehm.cleanHostnameIds(hostnames);
        assert.deepEqual(hostnames,hostnamesClean);
    });

    it('check clean hostname no id', function () {
        let hostnames =[ {
            "cnameType" : "EDGE_HOSTNAME",
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : "ehn_3216762",
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        let hostnamesClean = [ {
            "cnameType" : "EDGE_HOSTNAME",
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3216762,
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        ehm.cleanHostnameIds(hostnames);
        assert.deepEqual(hostnames,hostnamesClean);
    });

    it('check clean hostname NOT an array', function () {
        let hostnames = undefined;
        assert.throws(() => {
            ehm.cleanHostnameIds(hostnames);
        }, "Hostnames is not an array");

        hostnames = {};
        assert.throws(() => {
            ehm.cleanHostnameIds(hostnames);
        }, "Hostnames is not an array");
    });

    it('check clean hostname no prefix', function () {
        let hostnames =[ {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3248236,
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : "3216762",
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        let hostnamesClean = [ {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3248236,
            "cnameFrom" : "testing-snippets-pull.com",
            "cnameTo" : "testing-snippets-pull.com.edgesuite.net"
        }, {
            "cnameType" : "EDGE_HOSTNAME",
            "edgeHostnameId" : 3216762,
            "cnameFrom" : "testing-snippets.com",
            "cnameTo" : "testing-snippets.edgesuite.net"
        } ];

        ehm.cleanHostnameIds(hostnames);
        assert.deepEqual(hostnames,hostnamesClean);
    });

});