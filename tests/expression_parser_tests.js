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

const errors = require("../src/errors");
const expParser = require("../src/expression_parser");

class Context {
    constructor(data) {
        this.data = data;
    }

    get(key) {
        let value = this.data[key];
        if (value === undefined) {
            throw new errors.ArgumentError(`Undefined variable: '${key}'`);
        }
        return new Context(value);
    }

    finalValue() {
        if (this.data === null) {
            return "null";
        }
        if (_.isArray(this.data) || _.isObject(this.data)) {
            return JSON.stringify(this.data, null, 2);
        }
        return this.data;
    }
}

describe('Expression Parser Tests', function () {
    let data;

    before(function () {
        data = {
            foo: "bar",
            fuzz: 0,
            frog: [],
            nullvalue: null,
            level1: {
                level2: {
                    blah: "blubb",
                    numDrinks: 5,
                    isBad: true
                },
                list: ["A", "B", "C"]
            }
        };
    });

    it('Parse expressions tests', function () {
        let res = expParser.parse("blah-${foo} and then", {
            context: new Context(data)
        });

        assert.equal(res, "blah-bar and then");

        res = expParser.parse("Me and my ${level1.level2.numDrinks} drinks", {
            context: new Context(data)
        });
        assert.equal(res, "Me and my 5 drinks");

        res = expParser.parse("${level1.level2.numDrinks}", {
            context: new Context(data)
        });
        assert.equal(res, 5);

        res = expParser.parse("${level1.level2.isBad}", {
            context: new Context(data)
        });
        assert.equal(res, true);

        res = expParser.parse("I'm so happy", {
            context: new Context(data)
        });
        assert.equal(res, "I'm so happy");

        res = expParser.parse("Some like \\${variable.expressions} on the rocks", {
            context: new Context(data)
        });
        assert.equal(res, "Some like ${variable.expressions} on the rocks");

        res = expParser.parse("blah ${level1.list[1]} blubb", {
            context: new Context(data)
        });
        assert.equal(res, "blah B blubb");

        res = expParser.parse("blah ${fuzz} blubb", {
            context: new Context(data)
        });
        assert.equal(res, "blah 0 blubb");

        res = expParser.parse("blah ${frog} blubb", {
            context: new Context(data)
        });
        assert.equal(res, "blah [] blubb");

        res = expParser.parse("blah ${nullvalue} blubb", {
            context: new Context(data)
        });
        assert.equal(res, "blah null blubb");
    });

    describe('Pegjs test for JS path expressions', function () {
        let data = {
            foobar: {
                blah : [1, 2, 3, { bar: "baz"}],
                shrub : "tree"
            }
        };

        it('Parse test success', function () {
            let result = expParser.parse("${foobar.blah[0]}", {
                context: new Context(data)
            });
            assert.strictEqual(result, 1);

            result = expParser.parse("bar ${foobar.blah[3].bar} plop", {
                context: new Context(data)
            });
            assert.strictEqual(result, "bar baz plop");

            result = expParser.parse("\\${foobar.blah[3].bar}", {
                context: new Context(data)
            });
            assert.strictEqual(result, "${foobar.blah[3].bar}");

            result = expParser.parse("the number of ${foobar.shrub}s or \\${foobar.blah[3].bar} is ${foobar.blah[0]}", {
                context: new Context(data)
            });
            assert.strictEqual(result, "the number of trees or ${foobar.blah[3].bar} is 1");
        });

        it('Parse test with failure', function () {
            assert.throws(function() {
                let result = expParser.parse("${foobar.blah[7]}", {
                    context: new Context(data)
                });
            }, "Undefined variable: '7'");
        });

    });
});