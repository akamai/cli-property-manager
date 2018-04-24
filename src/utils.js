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

const logger = require("./logging")
    .createLogger("devops-prov.utils");

/**
 * Should better be called FileUtils
 * read and write files, create directories, check if file exists.
 */
class Utils {
    /**
     * Reads JSON formatted file from disk.
     * @param fullpath
     * @return JSON object
     */
    readJsonFile(fullpath) {
        fullpath = path.normalize(fullpath);
        logger.info("loading '%s'", fullpath);
        return JSON.parse(this.readFile(fullpath));
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