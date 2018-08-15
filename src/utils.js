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

const fs = require('fs');
const path = require('path');

const errors = require('./errors');
const logger = require("./logging")
    .createLogger("devops-prov.utils");

const NEWLINES = /([\r\n]+)/;
const ATPOSITION = /JSON at position (\d+)/;

/**
 * Should better be called FileUtils
 * read and write files, create directories, check if file exists.
 */
class Utils {

    findRowAndColumn(jsonString, position) {
        let lines = jsonString.split(NEWLINES);
        let follow = 0;
        let row = 0;
        for (let line of lines) {
            //check if line contains the newlines or just the line
            let nlm = NEWLINES.exec(line);
            if (nlm && nlm[0] === line) {
                follow += line.length;
                row += line.length - 1;
                continue;
            }
            if (follow + line.length > position) {
                let linePosition = position - follow;
                return [row, linePosition]
            } else {
                follow += line.length; //problem is, how many characters does a new line contain.
                row += 1;
            }
        }
        return [row, 0]
    }


    /**
     * Reads JSON formatted file from disk.
     * @param fullpath
     * @return JSON object
     */
    readJsonFile(fullpath) {
        fullpath = path.normalize(fullpath);
        logger.info(`loading '${fullpath}'`);
        let jsonString;
        try {
            jsonString = this.readFile(fullpath);
        } catch (error) {
            throw new errors.DependencyError(error.message, "unable_to_load_file_or_dir");
        }
        try {
            return JSON.parse(jsonString);
        } catch (err) {
            logger.error("Got error: ", err);
            let match = ATPOSITION.exec(err.message);
            if (match) {
                let position = parseInt(match[1]);
                let [row, linePosition] = this.findRowAndColumn(jsonString, position);
                throw new errors.JSONParserError(err.message.slice(0, match.index) +
                    `${fullpath}, line: ${row}, position: ${linePosition}`, "json_parser_error",
                    fullpath, row, linePosition);
            } else if (err.message === "Unexpected end of JSON input") {
                let [row, linePosition] = this.findRowAndColumn(jsonString, jsonString.length);
                throw new errors.JSONParserError(err.message.slice(0, "Unexpected end of ".length) +
                    `${fullpath}, line: ${row}, position: ${linePosition}`, "json_parser_error",
                    fullpath, row, linePosition);
            } else {
                throw err
            }
        }
    }

    writeJsonFile(fullpath, data) {
        fullpath = path.normalize(fullpath);
        logger.info("writing '%s'", fullpath);
        this.writeFile(fullpath, JSON.stringify(data, null, 4));
    }

    fileExists(fullpath) {
        return fs.existsSync(fullpath);
    }

    writeFile(fullpath, data) {
        fs.writeFileSync(fullpath, data);
    }

    readFile(fullpath) {
        return fs.readFileSync(fullpath, 'utf8');
    }

    mkdir(path) {
        fs.mkdirSync(path);
    }
}

module.exports = Utils;