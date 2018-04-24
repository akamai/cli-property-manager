#!/usr/bin/env node

const _ = require('underscore');
const Utils = require('../src/utils');

const cleanupEntity = function(e) {
    if (_.isString(e.uuid)) {
        delete e["uuid"];
    }
    if (_.isString(e.version)) {
        delete e["version"];
    }
};

const cleanupRule = function(rule) {
    if (_.isString(rule.uuid)) {
        delete rule["uuid"];
    }
    if (_.isArray(rule.features)) {
        let behaviors = rule.features;
        delete rule["features"];
        rule.behaviors = behaviors;

        for (let f of behaviors) {
            cleanupEntity(f);
        }
    }
    if (_.isArray(rule.conditions)) {
        let criteria = rule.conditions;
        delete rule["conditions"];
        rule.criteria = criteria;

        for (let c of criteria) {
            cleanupEntity(c);
        }
    }
    if (_.isArray(rule.children)) {
        for (let child of rule.children) {
            cleanupRule(child);
        }
    }
};


if (process.argv.length != 3) {
    console.error("Expecting exactly one argument: filename of json file to convert to papi format");
    process.exitCode = 1;
} else {
    const fileName = process.argv[2];
    const utils = new Utils();
    let ruleTree = utils.readJsonFile(fileName);
    cleanupRule(ruleTree.rules);
    ruleTree = {
        rules: ruleTree.rules
    };
    utils.writeJsonFile(fileName, ruleTree);
}

