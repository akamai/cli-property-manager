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


const helpers = require('../src/helpers');

describe('Helpers Tests', function () {
    it('test object merge', function () {
        let obj1 = {
            "cde": 345, "123": 123
        };
        let obj2 = {
            "abc": 123, "123": "abc", "foo": ["bar", "baz"]
        };

        let result = helpers.mergeObjects(obj1, obj2);
        assert.deepEqual(result, {
            "abc": 123,
            "123": "abc",
            "foo": ["bar", "baz"],
            "cde": 345
        })

    });

    it('test deep object merge', function () {
        let obj1 = {
            "behaviorMapping": {
                "sureRoute": {
                    "enableCustomKey": {
                        "value": false,
                        "type": "boolean",
                        "name": "enableCustomKey",
                        "defaultValue": false,
                        "overrideValue": null,
                        "useVariable": false
                    },
                    "testObjectUrl": {
                        "value": "\\${env.sureRouteTestObject}",
                        "type": "url",
                        "name": "sureRouteTestObject",
                        "defaultValue": "/akamai/sure-route-test-object.html",
                        "overrideValue": null,
                        "useVariable": true
                    }
                },
                "origin": {
                    "hostname": {
                        "value": "\\${env.originHostname}",
                        "type": "hostname",
                        "name": "originHostname",
                        "defaultValue": null,
                        "overrideValue": "origin-${environment.propertyName}",
                        "useVariable": true
                    }
                }
            }
        };
        let obj2 = {
            "behaviorMapping": {
                "origin": {
                    "netStorage": {
                        "value": "\\${env.netStorageInfo}",
                        "type": "netStorage",
                        "name": "netStorageInfo",
                        "defaultValue": null,
                        "overrideValue": {
                            "downloadDomainName": "${environment.propertyName}.download.akamai.com",
                            "cpCode": null,
                            "g2oToken": null
                        },
                        "useVariable": true
                    },
                    "hostname": {
                        "defaultValue": "origin-${project.name}",
                    }
                }
            }
        };
        let result = helpers.deepMerge(obj1, obj2);
        assert.deepEqual(result, {
            "behaviorMapping": {
                "sureRoute": {
                    "enableCustomKey": {
                        "value": false,
                        "type": "boolean",
                        "name": "enableCustomKey",
                        "defaultValue": false,
                        "overrideValue": null,
                        "useVariable": false
                    },
                    "testObjectUrl": {
                        "value": "\\${env.sureRouteTestObject}",
                        "type": "url",
                        "name": "sureRouteTestObject",
                        "defaultValue": "/akamai/sure-route-test-object.html",
                        "overrideValue": null,
                        "useVariable": true
                    }
                },
                "origin": {
                    "netStorage": {
                        "value": "\\${env.netStorageInfo}",
                        "type": "netStorage",
                        "name": "netStorageInfo",
                        "defaultValue": null,
                        "overrideValue": {
                            "downloadDomainName": "${environment.propertyName}.download.akamai.com",
                            "cpCode": null,
                            "g2oToken": null
                        },
                        "useVariable": true
                    },
                    "hostname": {
                        "value": "\\${env.originHostname}",
                        "type": "hostname",
                        "name": "originHostname",
                        "defaultValue": "origin-${project.name}",
                        "overrideValue": "origin-${environment.propertyName}",
                        "useVariable": true
                    }
                }
            }
        });
    });
});