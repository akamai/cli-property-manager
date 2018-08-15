
const td = require('testdouble');
const chai = require('chai');
const assert = chai.assert;

const errors = require('../src/errors');
const DevOps = require("../src/devops");

describe('features', function() {
    it("testing mocked Promises", function() {
        let devOpsClass = td.constructor(DevOps);
        let index = -1;

        td.when(devOpsClass.prototype.checkPromotions("testproject.com", "qa")).thenDo(function () {
            index++;
            if (index === 0) {
                return new Promise((resolve, reject) => {
                    resolve("NEW");
                })
            } else if (index === 1) {
                return new Promise((resolve, reject) => {
                    resolve("PENDING");
                });
            } else {
                return new Promise((resolve, reject) => {
                    reject(new errors.RestApiError("Some bad stuff happened", "bad_error", 400, {"boo": "bar"}));
                });
            }
        });

        let devOps = new devOpsClass();

        const handler = function() {
            devOps.checkPromotions("testproject.com", "qa").then(data => {
                console.log("Got response: ", data);
                setTimeout(handler, 1)
            }).catch(error => {
                console.log("Failure!");
                assert.equal(index, 2);
            });
        };

        setTimeout(handler, 1);
    });
});
