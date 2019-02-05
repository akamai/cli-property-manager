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


/**
 * A bunch of error classes.
 * TODO: can we come up with a better hierarchy?
 */

class ExitError extends Error {}

class AkamaiPDError extends Error {
    constructor(message, messageId, ...args) {
        super(message);
        this.messageId = messageId;
        this.args = args;
    }
}

class JSONParserError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class RestApiError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class ArgumentError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class DependencyError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class UnusedVariableError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class UndefinedVariableError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class UnknownTypeError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class ValidationError extends AkamaiPDError {
    constructor(message, messageId, ...args) {
        super(message, messageId, ...args);
    }
}

class PendingActivationError extends AkamaiPDError {
    constructor(message, messageId, network, id) {
        super(message, messageId, network, id);
    }
}

class AlreadyActiveError extends AkamaiPDError {
    constructor(message, messageId, network, id) {
        super(message, messageId, network, id);
    }
}
class NotActiveError extends AkamaiPDError {
    constructor(message, messageId, network, id) {
        super(message, messageId, network, id);
    }
}
module.exports = {
    ExitError,
    AkamaiPDError,
    JSONParserError,
    RestApiError,
    DependencyError,
    ArgumentError,
    UndefinedVariableError,
    UnknownTypeError,
    UnusedVariableError,
    ValidationError,
    PendingActivationError,
    AlreadyActiveError,
    NotActiveError
};