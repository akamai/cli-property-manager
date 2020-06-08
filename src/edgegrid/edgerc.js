// Copyright 2014 Akamai Technologies, Inc. All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const _ = require('underscore');
const fs = require('fs');
const errors = require('../errors');

const sectionRegex = /^\s*\[(.*)]\s*$/;

class EdgeRC {
    constructor(path) {
        this.path = path;
        if (!fs.existsSync(path)) {
            //file does not exist
            throw new errors.ArgumentError(`Could not load .edgerc file from '${path}'`,
                "edgerc_parse_error")
        }
        this.sections = {};
        this.__parse();
    }

    getSection(name) {
        return this.sections[name]
    }

    getSectionNames() {
        return _.keys(this.sections)
    }

    __parse() {
        let lines = fs.readFileSync(this.path).toString().split('\n');
        let section;
        _.each(lines, function(line, lineNumber) {
            line = line.trim();
            if (line === '') {
                return;
            }
            let sectionMatch = sectionRegex.exec(line);
            if (sectionMatch) {
                let sectionName = sectionMatch[1];
                section = {};
                this.sections[sectionName] = section;
            } else {
                if (_.isObject(section)) {
                    let index = line.indexOf('=');
                    if (index < 0) {
                        throw new errors.ArgumentError(`Error parsing key-value pair '${line}' in line ${lineNumber}`,
                            "edgerc_parse_error", line)
                    }
                    let key = line.slice(0, index).trim();
                    let val = line.slice(index + 1).trim();

                    // Remove trailing slash as if often found in the host property
                    val = val.replace(/\/$/, '');
                    if (key === "host" && val.indexOf('https://') < 0) {
                        val = 'https://' + val;
                    }
                    section[key] = val;
                } else {
                    throw new errors.ArgumentError(`Unexpected data '${line}' outside of section in line ${lineNumber}!`,
                        "edgerc_parse_error", line)
                }
            }
        }, this);
    }
}

module.exports = {
    EdgeRC: EdgeRC,

    getSection: function(path, sectionName) {
        let edgeRC = new EdgeRC(path);
        sectionName = sectionName || 'default';
        let section = edgeRC.getSection(sectionName);
        if (!section) {
            let sections = edgeRC.getSectionNames().join("', '");
            throw new errors.ArgumentError(`Section '${sectionName}' not found in edgerc file: '${path}'. ` +
                `Possible section names: ['${sections}']`, "invalid_section_name", sectionName, sections);
        }
        return section;
    }
};