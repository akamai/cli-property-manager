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
const path = require('path');
const chai = require('chai');
const assert = chai.assert;

const _ = require('underscore');

const logger = require("../../src/logging")
    .createLogger("snippets.template_tests");


const Utils = require('../../src/utils');
const utils = new Utils();
const Template = require('../../src/template');
const helpers = require('../../src/helpers');

const baseDir = path.join(__dirname, "..");

/**
 * This sort of duplicates logic in Environment.loadTemplateConverterRules. Me not like.
 * @param productId
 * @returns {*}
 */
const createTemplate = function(ruleTreeFileName, productId, isSecure) {
    let waaJson = utils.readJsonFile(path.join(baseDir, "testdata", ruleTreeFileName));
    if (isSecure) {
        waaJson.rules.options.is_secure = true;
    }
    let converterData = utils.readJsonFile(path.join(baseDir, "..", "resources", "snippets.converter.data.json"));
    return new Template(waaJson, converterData, productId);
};

describe('Snippets Template Tests WAA', function() {
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

    it('convert waa template into sdk template files', function() {
        //no variables, just children "snippets"
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
            "definitions": {}
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {});
    });

    it('convert waa template into template files for secure pipeline', function() {
        //The default values, no variables
        //Note: we have not done any variable substitution. It happens outside of Template.
        template = createTemplate("testruletree.waa.json", "Web_App_Accel", true);
        let results = template.process();
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children, [
            '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.main.rules.behaviors[0], {
                "name": "origin",
                "options": {
                    "cacheKeyHostname": "ORIGIN_HOSTNAME",
                    "compress": true,
                    "enableTrueClientIp": false,
                    "forwardHostHeader": "REQUEST_HOST_HEADER",
                    "hostname": "origin-${environment.propertyName}",
                    "httpPort": 80,
                    "httpsPort": 443,
                    "originSni": true,
                    "originType": "CUSTOMER",
                    "verificationMode": "PLATFORM_SETTINGS"
                }
            },
        );
    });

});

describe('Snippets Template Tests Problematic WAA', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.waa.bug272.json", "Web_App_Accel", false);
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});


describe('Snippets Template Tests RMA', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests SD', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests HTTP_Downloads', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests Mobile_Accel', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests Fresca existing property', function() {
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
            definitions: {
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests Fresca existing property variable-mode no-var', function() {
    let template;

    before(function () {
        template = createTemplate("sampleProperty_waa.json", "Fresca", false);
    });

    it('convert Mobile_Accel template into setup of sdk template files', function() {
        //no variable definitions, no environment variables defined, no environment variables used in main template
        let results = template.process("no-var");
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
            definitions: {}
        });
        assert.equal(results.main.rules.behaviors[0].options.hostname, "api.origin.hubapiqa.com");
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {});
    });
});

describe('Snippets Template Tests SPM', function() {
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
        assert.deepEqual(results.templates["performance.json"].children[0].behaviors[0],{
            "name": "adaptiveImageCompression",
            "options": {
                "compressMobile": true,
                "compressStandard": true,
                "tier1StandardCompressionMethod": "BYPASS",
                "tier1MobileCompressionMethod": "BYPASS",
                "tier2MobileCompressionMethod": "BYPASS",
                "tier2MobileCompressionValue": 60,
                "tier2StandardCompressionMethod": "BYPASS",
                "tier2StandardCompressionValue": 60,
                "tier3MobileCompressionMethod": "COMPRESS",
                "tier3MobileCompressionValue": 40,
                "tier3StandardCompressionMethod": "COMPRESS",
                "tier3StandardCompressionValue": 40,
                "title_aic_mobile": "",
                "title_aic_nonmobile": ""
            }
        });
    });
});

describe('Snippets Template Tests Download_Delivery', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests Progressive_Media', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Template Tests Site_Defender', function() {
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
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.envVariables, {
        });
    });
});

describe('Snippets Test rule name conversion', function() {
    it('Convert regular names with problematic characters', function() {
        let newName = Template.findIncludeNameFor("Regular Name With Spaces");
        assert.equal(newName, "Regular_Name_With_Spaces.json");

        newName = Template.findIncludeNameFor("Regular/Name/With//Slashes");
        assert.equal(newName, "Regular_Name_With_Slashes.json");

        newName = Template.findIncludeNameFor("Regular;Name,With||Bad&Characters");
        assert.equal(newName, "Regular_Name_With_Bad_Characters.json");

        newName = Template.findIncludeNameFor(".dots.at.beginning.and.end.");
        assert.equal(newName, "dots.at.beginning.and.end.json");
    });
});

describe('Snippets Multiple rule with same name test', function() {
    it('convert Progressive_Media template into setup of sdk template files', function() {
        let converterData = utils.readJsonFile(path.join(baseDir, "..", "resources", "template.converter.data.json"));
        let pmData = {
            rules: {
                children: [
                    {
                        name: "Some&Name"
                    },
                    {
                        name: "Some&Name"
                    },
                    {
                        name: "Some Name"
                    },
                    {
                        name: "Other Name"
                    }
                ],
                options: {
                    is_secure : false
                }
            }
        };
        let template = new Template(pmData, converterData, "Web_App_Accel");
        template.processRules();
        assert.deepEqual(template.pmData.rules.children, [
            "#include:Some_Name.json",
            "#include:Some_Name_2.json",
            "#include:Some_Name_3.json",
            "#include:Other_Name.json"
        ]);
        assert.deepEqual(template.templates, {
            "Other_Name.json": {
               "name": "Other Name"
            },
            "Some_Name.json": {
                "name": "Some&Name"
            },
            "Some_Name_2.json": {
                "name": "Some&Name"
            },
            "Some_Name_3.json": {
                "name": "Some Name"
            }
        });
    });
});

describe('Snippets Template Tests user variables', function() {
    let template;

    before(function () {
        template = createTemplate("testruletree.waa.variables.json", "Web_App_Accel");
    });
    it('convert waa template into sdk template files user variables', function() {
        let results = template.process("user-var-value");
        assert.exists(results.templates);
        assert.equal(Object.keys(results.templates).length, 3);
        assert.deepEqual(results.main.rules.children, [
            '#include:compression.json',
            '#include:static.json',
            '#include:dynamic.json'
        ]);
        assert.exists(results.variables);
        assert.deepEqual(results.variables, {
            definitions: {
                "PMUSER_FOO_value" : {
                    default: "fooooo",
                    type: "userVariableValue"
                },
                "PMUSER_HOSTNAME_value" : {
                    default: "www.example-origin.com",
                    type: "userVariableValue"
                }
            }
        });
        assert.exists(results.envVariables);
        assert.deepEqual(results.main.rules.variables,
            [
                {
                    name : "PMUSER_HOSTNAME",
                    value : "${env.PMUSER_HOSTNAME_value}",
                    description : "",
                    hidden : false,
                    sensitive : false
                },
                {
                    name : "PMUSER_FOO",
                    value : "${env.PMUSER_FOO_value}",
                    description : "",
                    hidden : false,
                    sensitive : false
                }
            ]);
        assert.deepEqual(results.envVariables, {
            //Note: we have not done any variable substitution. It happens outside of Template.
            "PMUSER_FOO_value": null,
            "PMUSER_HOSTNAME_value": null
        });
    });

});