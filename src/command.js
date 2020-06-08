//  Copyright 2020. Akamai Technologies, Inc
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


const Command = require('commander').Command;

const errors = require('./errors');

function outputHelpIfNecessary(cmd, options) {
    options = options || [];
    for (var i = 0; i < options.length; i++) {
        if (options[i] === '--help' || options[i] === '-h') {
            cmd.outputHelp();
            throw new errors.ExitError("gotta quit!");
        }
    }
    return false;
}

/**
 * DevOpsCommand is extending and overriding some aspects of Command.
 * In particular throwing exceptions if argument errors are detected rather than just
 * logging to console and exiting.
 */
class DevOpsCommand extends Command {
    constructor(name, consoleLogger) {
        super(name);
        this.consoleLogger = consoleLogger;
    }

    command(name, desc, opts) {
        if (typeof desc === 'object' && desc !== null) {
            opts = desc;
            desc = null;
        }
        opts = opts || {};
        var args = name.split(/ +/);
        var cmd = new DevOpsCommand(args.shift(), this.consoleLogger);

        if (desc) {
            cmd.description(desc);
            this.executables = true;
            this._execs[cmd._name] = true;
            if (opts.isDefault) this.defaultExecutable = cmd._name;
        }
        cmd._noHelp = opts.noHelp;
        this.commands.push(cmd);
        cmd.parseExpectedArgs(args);
        cmd.parent = this;
        return cmd;
    }

    parseArgs(args, unknown) {
        var name;

        if (args.length) {
            name = args[0];
            if (this.listeners('command:' + name).length) {
                this.emit('command:' + args.shift(), args, unknown);
            } else {
                this.emit('command:*', args);
            }
        } else {
            outputHelpIfNecessary(this, unknown);

            // If there were no args and we have unknown options,
            // then they are extraneous and we need to error.
            if (unknown.length > 0) {
                this.unknownOption(unknown[0]);
            }
        }

        return this;
    }

    sortCommands() {
        this.commands.sort((a, b) => a._name.localeCompare(b._name));
    }

    help(cb) {
        this.outputHelp(cb);
        throw new errors.ExitError("gotta quit!");
    }

    outputHelp(cb) {
        if (!cb) {
            cb = function(passthru) {
                return passthru;
            }
        }
        this.consoleLogger.info(cb(this.helpInformation()));
        this.emit('--help');
    }

    action(fn) {
        var self = this;
        var listener = function(args, unknown) {
            // Parse any so-far unknown options
            args = args || [];
            unknown = unknown || [];

            var parsed = self.parseOptions(unknown);

            // Output help if necessary
            outputHelpIfNecessary(self, parsed.unknown);

            // If there are still any unknown options, then we simply
            // die, unless someone asked for help, in which case we give it
            // to them, and then we die.
            if (parsed.unknown.length > 0) {
                self.unknownOption(parsed.unknown[0]);
            }

            // Leftover arguments need to be pushed back. Fixes issue #56
            if (parsed.args.length) {
                args = parsed.args.concat(args);
            }

            self._args.forEach(function(arg, i) {
                if (arg.required && !args[i]) {
                    self.missingArgument(arg.name);
                } else if (arg.variadic) {
                    if (i !== self._args.length - 1) {
                        self.variadicArgNotLast(arg.name);
                    }

                    args[i] = args.splice(i);
                }
            });

            // Always append ourselves to the end of the arguments.
            // If extra arguments remain, they are passed as an array as the final argument.
            var numArgsExpected = self._args.length;
            if (numArgsExpected) {
                // NOTE args.length always equals numArgsExpected when last argument is variadic
                if (args.length > numArgsExpected) {
                    args = args.slice(0, numArgsExpected).concat(self).concat([args.slice(numArgsExpected)])
                } else {
                    args[numArgsExpected] = self;
                }
            } else {
                if (args.length > numArgsExpected) {
                    args = args.slice(0, numArgsExpected).concat(self).concat([args.slice(numArgsExpected)])
                } else {
                    args.push(self);
                }
            }

            fn.apply(self, args);
        };
        var parent = this.parent || this;
        var name = parent === this ? '*' : this._name;
        parent.on('command:' + name, listener);
        if (this._alias) parent.on('command:' + this._alias, listener);
        return this;
    }

    missingArgument(name) {
        throw new errors.ArgumentError(`Missing required argument '${name}'`, "cli_missing_required_argument", name);
    }

    /**
     * `Option` is missing an argument, but received `flag` or nothing.
     *
     * @param {String} option
     * @param {String} flag
     * @api private
     */
    optionMissingArgument(option, flag) {
        if (flag) {
            throw new errors.ArgumentError(`Option '${option.flags}' argument missing, got '${flag}'`, "cli_option_missing_argument", option.flags, flag);
        } else {
            throw new errors.ArgumentError(`Option '${option.flags}' argument missing'`, "cli_option_missing_argument", option.flags);
        }
    }

    /**
     * Unknown option `flag`.
     *
     * @param {String} flag
     * @api private
     */
    unknownOption(flag) {
        if (!this._allowUnknownOption) {
            throw new errors.ArgumentError(`Unknown option: '${flag}'`, "cli_unknown_option", flag);
        }
    }

    // Trying to remove "executeSubCommand" calls so it doesn't try to do that when it "detects" an alias
    // The way the original author write it is that it will call a subcommand seperately from the framework
    executeSubCommand() {}

    /**
     * Variadic argument with `name` is not the last argument as required.
     *
     * @param {String} name
     * @api private
     */

    variadicArgNotLastfunction(name) {
        throw new errors.ArgumentError(`Variadic arguments must be last '${name}'`, "cli_variadic_arguments_must_be_last", name);
    }
}

module.exports = DevOpsCommand;