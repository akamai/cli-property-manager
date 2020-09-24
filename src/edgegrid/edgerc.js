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

const sectionRegex = /^\s*\[(.*)]/;

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
        _.each(lines, function(line, lineNumber) {
            line = line.trim();
            if (line === '') {
                return;
            }
            let sectionMatch = sectionRegex.exec(line);
            if (sectionMatch) {
                let sectionName = sectionMatch[1];
                let sectionLines = this.extractSectionLines(lines, lineNumber + 1);
                let section = this.buildSection(sectionLines);
                this.sections[sectionName] = section;
            }
        }, this);
    }

    // inserts the section into this.sections
    extractSectionLines(lines, lineNumber) {
        let sectionLines = []
        // collect all the lines until the beginning of the next section
        for (let i = lineNumber; i < lines.length; i++) {
            let nextSectionMatch = sectionRegex.exec(lines[i]);
            if (nextSectionMatch) {
                break;
            }
            sectionLines.push(lines[i]);
        }
        return sectionLines;
    }

    // build section object for the lines specific to the section
    buildSection(sectionLines) {
        let section = {};
        sectionLines.forEach(function(line) {
            // Remove comment lines
            if (line.startsWith('#') || line.startsWith('//')) {
                return;
            }
            line = line.trim();
            let index = line.indexOf('=');
            if (index > -1) {
                let key = line.slice(0, index).trim();
                let val = line.slice(index + 1).trim();

                // Remove trailing slash as if often found in the host property
                val = val.replace(/\/$/, '');
                // Add https: in front of hostname
                if (key === "host" && val.indexOf('https://') < 0) {
                    val = 'https://' + val;
                }
                section[key] = val;
            }
        });
        return section;
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