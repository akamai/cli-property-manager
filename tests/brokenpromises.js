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


const _ = require('underscore');
const chai = require('chai');
const assert = chai.assert;

assert.throwsAsync = async function (fn, excpected) {
    let thrownError;
    try {
        await fn();
        assert.fail("Didn't throw exception");
    } catch (e) {
        assert.equal(e, excpected);
    }
};


class ExampleI {
    constructor() {
        //do something
    }

    msgAfterTimeout(args) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(`${args[0]} Hello ${args[1]}!`), args[2])
        })
    }

    doit() {
        let pms = _.map([
            ["blah", "me", 2000],
            ["foo", "other", 250],
            ["argh", "2323", 300]
        ], this.msgAfterTimeout);

        Promise.all(pms).then((data) => {
            let all = data.join(", ");
            console.log(`success: message=${data.length}, ${all}`)
        }, (err) => {
            console.log(`error: ${err}`)
        })
    }
}


class ExampleII {
    constructor() {
        this.data = [
            ["blah", "me", 150],
            ["foo", "other", 250],
            ["argh", "2323", 300]
        ];
        this._workData = this.data;
    }

    msgAfterTimeout(greeting, name, timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(`${greeting} Hello ${name}!`), timeout)
        })
    }

    otherMsg(msg) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(`got message: '${msg}'`), 200)
        })
    }

    doit() {
        if (this._workData.length === 0) {
            //done
            return;
        }
        let item = this._workData[0]
        this._workData = this._workData.slice(1);
        this.msgAfterTimeout(...item)
            .then(result => {
                return this.otherMsg(result)
            })
            .then(secondResult => {
                console.log(`Here's the result: '${secondResult}'`);
                this.doit();
            });
    }
}

class ExampleIII {
    constructor() {
        this.data = [
            ["blah", "me", 150],
            ["foo", "other", 250],
            ["argh", "2323", 300]
        ];
    }

    msgAfterTimeout(greeting, name, timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(`${greeting} Hello ${name}!`), timeout)
        })
    }

    otherMsg(msg) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(`got message: '${msg}'`), 200)
        })
    }

    async doit(throwSomething) {
        for (let item of this.data) {
            let result = await this.msgAfterTimeout(...item);
            if (throwSomething) {
                throw new Error("Just a little error");
            }
            let secondResult = await this.otherMsg(result);
            console.log(`Here's the result: '${secondResult}'`);
        }
    }
}

// describe.skip('features', function() {
//     it("good", async function() {
//         await new ExampleIII().doit(false);
//     });
//
//     it("test throws exception manually", async function() {
//         try {
//             await new ExampleIII().doit(true);
//             assert.fail("should throw exception")
//         } catch(err) {
//             assert.equal(err, "Error: Just a little error");
//         }
//     });
//
//     it("test throws exception", async  function() {
//         await assert.throwsAsync(async function() {
//             await new ExampleIII().doit(true);
//         }, "Error: Just a little error");
//     });
// });
