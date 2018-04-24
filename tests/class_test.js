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


const chai = require('chai');
const assert = chai.assert;


class Foo {
    constructor(bar) {
        this.bar = bar;
    }

    doFooBar(msg) {
        assert.exists(this);
        return `${msg}: doing the foo ${this.bar} thing`;
    }

    getFoobarFunc() {
        return this.doFooBar.bind(this);
    }
}

const paramFoobarCaller = function(params, msg){
    return params.foobarFunc(msg);
};

const foobarCaller = function(foobarFunc, msg){
    return foobarFunc(msg);
};

describe('Class tests', function() {
    let fooInst;
    before(function () {
        fooInst = new Foo("bar");
    });

    it('do the class test', function () {
        let foobarFunc = fooInst.getFoobarFunc();

        assert.throws(() => {
            foobarCaller(fooInst.doFooBar);
        }, "expected undefined to exist"); //doFooBar is not bound, failure.
        assert.equal(foobarCaller(fooInst.doFooBar.bind(fooInst), "Hi"), "Hi: doing the foo bar thing");
        assert.equal(foobarCaller(foobarFunc, "Hi"), "Hi: doing the foo bar thing");

        let params = {
            foobarFunc: foobarFunc,
            bar: "bazz"
        };

        assert.equal(paramFoobarCaller(params, "Ho"), "Ho: doing the foo bar thing");
        assert.equal(fooInst.doFooBar.call(params, "Ho"), "Ho: doing the foo bazz thing");
        assert.equal(fooInst.doFooBar.apply(params, ["Ho"]), "Ho: doing the foo bazz thing");
    });

});
