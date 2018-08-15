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
const _ = require('underscore');

const logger = require("../src/logging")
    .createLogger("devops-prov.el_tests");

const EL = require("../src/el");

describe('Expression Language Tests', function () {
    let el;

    beforeEach(function () {
        let loadFunction = function(fileName) {
            return {
                resource: {
                    "bar": "food",
                    "howmany": 42,
                    "some": ["or", "not", "${level1.level2.blah}"]
                },
                resourcePath: "some.json"
            }
        };
        let defaultSource = {
            resource: {
                "foo": "bazz",
                "level1": {
                    "level2": {
                        "numDrinks": 5,
                        "isBad": false
                    },
                    list: ["A", "R", "C"]
                }
            },
            resourcePath: "defaults.json"
        };
        let overrideSource = {
            resource: {
                "foo": "bar",
                "level1": {
                    "level2": {
                        "blah": "blubb",
                        "isBad": true
                    },
                    list: ["A", "B", "C"]
                }
            },
            resourcePath: "overrides.json"
        };
        el = new EL(defaultSource, overrideSource, loadFunction);
    });

    it('EL parseString tests', function () {
        el.parseString("blah-${foo} and then", result => {
            assert.equal(result, "blah-bar and then");
        });

        el.parseString("Me and my ${level1.level2.numDrinks} drinks", result => {
            assert.equal(result, "Me and my 5 drinks")
        });

        el.parseString("${level1.level2.numDrinks}", result => {
            assert.strictEqual(result, 5)
        });

        el.parseString("${level1.level2.isBad}", result => {
            assert.strictEqual(result, true)
        });

        el.parseString("I'm so happy", result =>{
            assert.fail("I should not get called");
        });

        el.parseString("Some like \\${variable.expressions} on the rocks", result =>{
            assert.equal(result, "Some like ${variable.expressions} on the rocks")
        });

        el.parseString("#include:some.json", result => {
            assert.deepEqual(result, {
                "bar": "food",
                "howmany": 42,
                "some": ["or", "not", "blubb"]
            });
        });

        el.parseString("blah ${level1.list[1]} whizz ${level1.list[2]} blubb", result => {
            assert.equal(result, "blah B whizz C blubb")
        })
    });

    it('EL parseObject tests', function () {
        assert.equal(el.parseObject(5434), 5434);

        assert.deepEqual(el.parseObject({
            "list": [
                "some",
                "are",
                "#include:some.json"
            ]
        }), {
            "list": [
                "some",
                "are", {
                    "bar": "food",
                    "howmany": 42,
                    "some": ["or", "not", "blubb"]
                }
            ]
        });

        assert.deepEqual(el.parseObject({
            "result": "#include:some.json"
        }), {
            "result": {
                "bar": "food",
                "howmany": 42,
                "some": ["or", "not", "blubb"]
            }
        });

        assert.deepEqual(el.parseObject({
            "result": "this is ${level1.level2.isBad}",
            "lobs": [
                {
                    "key": "I like this: ${level1.level2.isBad}",
                    "value": "but I like \\${this.more}",
                    "subs": [
                        "${level1.level2.isBad}", false
                    ]
                }
            ]
        }), {
            "result": "this is true",
            "lobs": [
                {
                    "key": "I like this: true",
                    "value": "but I like ${this.more}",
                    "subs": [
                        true, false
                    ]
                }
            ]
        });

        assert.deepEqual(el.parseObject({
            "result": "${level1.level2}",
            "lobs": [
                {
                    "subs": "${level1.list}"
                }
            ]
        }), {
            "result": {
                "blah": "blubb",
                "isBad": true
            },
            "lobs": [
                {
                    "subs": ["A", "B", "C"]
                }
            ]
        });

        assert.throws(() => {
            el.parseObject({
                "result": "I don't like ${level1.level2.badKey.worseKey}"
            });
        }, "Undefined variable: 'badKey'");
    });

    it('EL conditional include tests', function () {
        assert.deepEqual(el.parseObject([
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234
                }
            },
            {
                "#includeIf": "${level1.level2.isBad}",
                "name": "some name",
                "foobar": "boo"
            }
        ]), [
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234
                }
            },
            {
                "name": "some name",
                "foobar": "boo"
            }
        ]);
        el.overrideSource.resource.level1.level2.isBad = false;
        assert.deepEqual(el.parseObject([
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234
                }
            },
            {
                "#includeIf": "${level1.level2.isBad}",
                "name": "some name",
                "foobar": "boo"
            }
        ]), [
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234
                }
            }
        ]);
        el.overrideSource.resource.level1.level2.isBad = true;
        assert.deepEqual(el.parseObject({
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234,
                    "optional": {
                        "#includeIf": "${level1.level2.isBad}",
                        "name": "some name",
                        "foobar": "boo"
                    }
                }
            }),
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234,
                    "optional": {
                        "name": "some name",
                        "foobar": "boo"
                    }
                }
            }
        );
        el.overrideSource.resource.level1.level2.isBad = false;
        assert.deepEqual(el.parseObject({
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234,
                    "optional": {
                        "#includeIf": "${level1.level2.isBad}",
                        "name": "some name",
                        "foobar": "boo"
                    }
                }
            }),
            {
                "foo": "bar",
                "options": {
                    "bar": "foo",
                    "id": 1234
                }
            }
        );
    });

    it('EL resolve path tests', function () {
        assert.deepEqual(el.resolvePath("list/2/some/0", {
            resource: {
                "list": [
                    "some",
                    "are",
                    "#include:some.json"
                ]
            },
            resourcePath: "main.json"
        }), {
            template: "some.json",
            location: "some/0",
            variables: [],
            value: "or"
        });

        assert.deepEqual(el.resolvePath("list/2/some/2", {
            resource: {
                "list": [
                    "some",
                    "are",
                    "#include:some.json"
                ]
            },
            resourcePath: "main.json"
        }), {
            template: "some.json",
            location: "some/2",
            variables: ["overrides.json"],
            value: "blubb"
        });

        assert.deepEqual(el.resolvePath("lobs/0/subs/0", {
            resource: {
                "result": "this is ${level1.level2.isBad}",
                "lobs": [
                    {
                        "key": "I like this: ${level1.level2.isBad}",
                        "value": "but I like \\${this.more}",
                        "subs": [
                            "${level1.level2.isBad}", false
                        ]
                    }
                ]
            }, resourcePath: "main.json"
        }), {
            template: "main.json",
            location: "lobs/0/subs/0",
            variables: ["overrides.json"],
            value: true
        });

        assert.deepEqual(el.resolvePath("lobs/0/subs/0", {
            resource: {
                "lobs": [
                    {
                        "subs": [
                            "2+3 = ${level1.level2.numDrinks} is ${level1.level2.isBad}", false
                        ]
                    }
                ]
            }, resourcePath: "main.json"
        }), {
            template: "main.json",
            location: "lobs/0/subs/0",
            variables: ["defaults.json", "overrides.json"],
            value: "2+3 = 5 is true"
        });

        assert.throws(() => {
            el.resolvePath("result", {
                resource: {
                    "result": "I don't like ${level1.level2.badKey.worseKey}"
                }, resourcePath: "main.json"
            });
        }, "Undefined variable: 'badKey'");
    });
});