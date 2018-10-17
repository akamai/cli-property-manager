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


const debug = require("debug")('devops-sdk');
const chalk = require('chalk');

class Logger {
    constructor(name) {
        this.name = name;
    }

    debug(...args) {
        this.log("debug", ...args);
    }

    info(...args) {
        this.log("info", ...args);
    }

    warn(...args) {
        this.log("warn", ...args);
    }

    error(...args) {
        this.log("error", ...args);
    }
}

/**
 * Uses debug for logging. Used by default.
 */
class DebugLogger extends Logger {
    log(level, ...args) {
        debug("%s: %s - %s", level, this.name, args.join(", "));
    }
}

const colorCodes = {
    error: chalk.red,
    warn: chalk.cyan,
    info: chalk.green,
    debug: chalk.blue,
};

/**
 * Uses console.error and console.log
 * Used by CLI
 */
class ConsoleLogger extends Logger {
    log(level, ...args) {
        let msg = args[0];
        args = args.splice(1);
        if (this.name) {
            msg = this.name + ": " + msg;
        }
        let color = colorCodes[level];
        if (level === "error") {
            console.error(color(msg, ...args));
        } else {
            console.log(color(msg, ...args));
        }
    }
}

let defaultGetLoggerFunc = function(name) {
    return new DebugLogger(name);
};

let loggingConfigured = false;

const consoleLogging = function() {
    if (loggingConfigured) {
        return module.exports;
    }
    defaultGetLoggerFunc = function(name) {
        return new ConsoleLogger(name);
    };
    loggingConfigured = true;
    return module.exports;
};

const log4jsLogging = function(verbose, type) {
    if (loggingConfigured) {
        return module.exports;
    }
    let filename = "devops.log";
    if (type === "snippets") {
        filename = "snippets.log";
    }
    const log4js = require('log4js');
    let appenders = {
        logfile: {
            type: 'file',
            maxLogSize: 10485760,
            filename: filename,
            backups: 3,
            compress: true
        }
    };
    let categories = {
        default: {
            appenders: ['logfile'],
            level: 'debug'
        }
    };
    if (verbose) {
        appenders.out = {
            type: 'stdout'
        };
        categories.default.appenders.push("out");
    }

    let config = {
        appenders,
        categories
    };
    log4js.configure(config);
    defaultGetLoggerFunc = function(name) {
        let logger = log4js.getLogger(name);
        logger.level = 'debug';
        return logger;
    };
    loggingConfigured = true;
    return module.exports;
};

const createLogger = function(name) {
    return defaultGetLoggerFunc(name);
};

module.exports = {
    createLogger,
    consoleLogging,
    ConsoleLogger,
    log4jsLogging,
    Logger
};