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
const path = require('path');
const chai = require('chai');
const assert = chai.assert;

const _ = require('underscore');

const logger = require("../src/logging")
    .consoleLogging()
    .createLogger("devops-prov.template_tests");


const Utils = require('../src/utils');
const utils = new Utils();
const Template = require('../src/template');
const helpers = require('../src/helpers');

/**
 * This sort of duplicates logic in Environment.loadTemplateConverterRules. Me not like.
 * @param productId
 * @returns {*}
 */
const createTemplate = function(ruleTreeFileName, productId, isForNewProperty = true) {
    let waaJson = utils.readJsonFile(path.join(__dirname, "testdata", ruleTreeFileName));
    let converterData = utils.readJsonFile(path.join(__dirname, "..", "resources", "template.converter.data.json"));
    return new Template(waaJson, converterData, productId, isForNewProperty);
};

describe('Template Tests WAA', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.waa.json", "Web_App_Accel");
    });

    it('test path stuff', function () {
       let [behavior, options, name] = template.resolvePath("#/rules/behaviors/3/options/testObjectUrl");
       assert.equal(name, "testObjectUrl");
       assert.deepEqual(options, {
           "enabled": true,
           "forceSslForward": false,
           "raceStatTtl": "30m",
           "toHostStatus": "INCOMING_HH",
           "type": "PERFORMANCE"
       });
       assert.equal(behavior.name, "sureRoute")
    });

    it('convert waa template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children, [
            '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                sureRouteTestObject: {
                    type: 'url',
                    default: "/akamai/sure-route-test-object.html"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null,
            sureRouteTestObject: null
        });
    });
});

describe('Template Tests RMA', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.rma.json", "Rich_Media_Accel");
    });

    it('convert RMA template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 4);
        assert.deepEqual(results.main.rules.children,  [
            '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json',
            '#include:performance.json',
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                sureRouteTestObject: {
                    type: 'url',
                    default: "/akamai/sure-route-test-object.html"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null,
            sureRouteTestObject: null
        });
    });
});

describe('Template Tests SD', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.sd.json", "Site_Del");
    });

    it('convert SD template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children,  [
            '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null
        });
    });
});

describe('Template Tests HTTP_Downloads', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.downloads.json", "HTTP_Downloads");
    });

    it('convert HTTP_Downloads template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 2);
        assert.deepEqual(results.main.rules.children,  [
            '#include:lfo.json',
            '#include:compression.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            definitions: {
                netStorageInfo: {
                    default: null,
                    type: "netStorage",
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            cpCode: null,
            netStorageInfo: {
                cpCode: null,
                downloadDomainName: "${environment.propertyName}.download.akamai.com",
                g2oToken: null
            },
        });
    });
});

describe('Template Tests Mobile_Accel', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.mobileaccel.json", "Mobile_Accel");
    });

    it('convert Mobile_Accel template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children,  [ '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json' ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                sureRouteTestObject: {
                    type: 'url',
                    default: "/akamai/sure-route-test-object.html"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null,
            sureRouteTestObject: null
        });
    });
});

describe('Template Tests Fresca existing property', function() {
    let template;

    before(function () {
        template = createTemplate("sampleProperty_waa.json", "Fresca", false);
    });

    it('convert Mobile_Accel template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 9);
        assert.deepEqual(results.main.rules.children,  [ '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json',
            '#include:Allow_OPTIONS.json',
            '#include:Access-Control_Headers_if_matches_domain_whitelist.json',
            '#include:CORs_for_JS_(custom_and_always_Vary).json',
            '#include:Compression_Fix.json',
            '#include:Compression_Fix2.json',
            '#include:Disable_PCONN_for_DELETE.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                sureRouteTestObject: {
                    type: 'url',
                    default: "/akamai/sure-route-test-object.html"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null,
            sureRouteTestObject: null
        });
    });
});

describe('Template Tests SPM', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.spm.json", "SPM");
    });

    it('convert SPM template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 2);
        assert.deepEqual(results.main.rules.children,  [
            '#include:performance.json',
            '#include:Offload.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(Object.keys(results.variables.definitions),
            [ 'originHostname', 'cpCode', 'sureRouteTestObject', 'tier1MobileCompressionMethod', 'tier2MobileCompressionMethod']);
        assert.deepEqual(results.variables, {
            "definitions": {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                sureRouteTestObject: {
                    type: 'url',
                    default: "/akamai/sure-route-test-object.html"
                },
                tier1MobileCompressionMethod: {
                  default: "BYPASS",
                  type: "url"
                },
                tier2MobileCompressionMethod: {
                  default: "BYPASS",
                  type: "url"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            originHostname: "origin-${environment.propertyName}",
            cpCode: null,
            sureRouteTestObject: null,
            tier1MobileCompressionMethod: null,
            tier2MobileCompressionMethod: null
        });
    });
});

describe('Template Tests Download_Delivery', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.download_delivery.json", "Download_Delivery");
    });

    it('convert Download_Delivery template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 0);
        assert.deepEqual(results.main.rules.children,  []);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            definitions: {
                netStorageInfo: {
                    default: null,
                    type: "netStorage",
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            cpCode: null,
            netStorageInfo: {
                cpCode: null,
                downloadDomainName: "${environment.propertyName}.download.akamai.com",
                g2oToken: null
            },
        });
    });
});

describe('Template Tests Progressive_Media', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.progressive_media.json", "Progressive_Media");
    });

    it('convert Progressive_Media template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 2);
        assert.deepEqual(results.main.rules.children, [
            "#include:Media_File_Retrieval_Optimization.json",
            "#include:compression.json"
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            definitions: {
                netStorageInfo: {
                    default: null,
                    type: "netStorage",
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            cpCode: null,
            netStorageInfo: {
                cpCode: null,
                downloadDomainName: "${environment.propertyName}.download.akamai.com",
                g2oToken: null
            },
        });
    });
});

describe('Template Tests Site_Defender', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.site_defender.json", "Site_Defender");
    });

    it('convert Site_Defender template into setup of sdk template files', function() {
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children, [
            "#include:compression.json",
            "#include:static.json",
            "#include:dynamic.json"
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            definitions: {
                originHostname: {
                    type: 'hostname',
                    default: null
                },
                cpCode: {
                    type: 'cpCode',
                    default: null
                },
                firewallConfiguration: {
                  default: null,
                  type: "wafRule"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
            cpCode: null,
            originHostname: "origin-${environment.propertyName}",
            firewallConfiguration: null
        });
    });
});
