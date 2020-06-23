
# Akamai Pipeline command help

## General Pipeline help
Use akamai pl help to get general help about all pipeline commands.

```
   Usage: akamai pipeline [options] [command]
   
   Akamai Pipeline. Run these commands from the directory that contains all of your pipelines.
   
   Options:
     -V, --version                                      output the version number
     -f, --format <format>                              Select output format for commands, either 'table', the default, or 'json'.
     -s, --section <section>                            The section of the .edgerc file that contains the user profile, or client ID, to use for the command. If not set, uses the `default` settings in the .edgerc file.
     -v, --verbose                                      Show detailed log information for the command.
     --edgerc <edgerc>                                  Optional. Enter the location of the edgerc.config file used for credentials. If not set, uses the .edgerc file in the project directory if present. Otherwise, uses the .edgerc file in your home directory.
     --workspace <workspace>                            Optional. Enter the directory containing all property and project files. If not set, uses the value of the AKAMAI_PROJECT_HOME environment variable if present.Otherwise, uses the current working directory as the workspace.
     -h, --help                                         output usage information
   
   Commands:
     change-ruleformat|crf [options] [environments...]  Change the property rule format used by a pipeline or an environment. Enter a space-separated list of environments after the pipeline name to update a subset of environments.
     check-promotion-status|cs [options] <environment>  For the selected environment, check the activation status.
     help                                               help command
     list-contracts|lc                                  List contracts available based on current user credentials and setup.
     list-cpcodes|lcp [options]                         List CP codes available based on the current user credentials and setup.
     list-edgehostnames|leh [options]                   List edge hostnames available based on current user credentials and setup. May return a long list of hostnames.
     list-groups|lg                                     List groups available based on the current user credentials and setup.
     list-products|lp [options]                         List products available based on contract ID, client ID, and the current user credentials and setup.
     list-properties|lpr [options]                      List properties available based on the current user credentials and setup.
     list-property-hostnames|lph [options]              List hostnames assigned to this property.
     list-property-rule-format|lprf [options]           List the current rule format for the property.
     list-property-variables|lpv [options]              List the property's variables.
     list-rule-formats|lrf                              Display the list of available rule formats.
     list-status|lstat [options]                        Show status of the pipeline.
     merge|m [options] <environment>                    Merge the pipeline property's template JSON and variable values into a rule tree file. The system stores the resulting JSON file in the pipeline's /dist folder.
     new-pipeline|np [options] <environments...>        Create a new pipeline with provided attributes. Separate each environment name with a space. This command creates one property for each environment.
     promote|pm [options] <targetEnvironment>           Promote, or activate, an environment. By default, this command also executes the merge and save commands.
     save|sv [options] <environment>                    Save rule tree and hostnames for the environment you select. Also creates edge hostnames if needed.
     search|s <name>                                    Search for properties by name.
     set-default|sd [options]                           Set the default pipeline and the default section of the .edgerc file to use.
     set-prefixes|sp <useprefix>                        Boolean. Enter `true` to enable prefixes with the current user credentials and setup. Enter `false` to disable them.
     set-ruleformat|srf <ruleformat>                    Set the rule format to use with the current user credentials and setup. Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning
     show-defaults|sf                                   Displays the current default settings for this workspace.
     show-ruletree|sr [options] <environment>           For the selected environment, shows local property's rule tree. Run this to store the rule tree in a local file: show-ruletree -p <pipelineName> <environment> >> <filename.json>
     help [cmd]                                         display help for [cmd]
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
## Most useful commands in order of assumed importance

### <a name="createNew"></a>Create new pipeline.
A pipeline consists of a pipeline name and 2 or more environment names. In order to create a new pipeline you also need to specify
a group Id, product Id and contract Id. These ids can be obtained by using the list-* commands. See below.

```
   Usage: akamai pipeline new-pipeline|np [options] <environments...>
   
   Create a new pipeline with provided attributes. Separate each environment name with a space. This command creates one property for each environment.
   
   Options:
     -c, --contractId <contractId>               Enter the contract ID to use. If used with the -e option, the CLI takes the contract value from the template property.
     -d, --productId <productId>                 Enter the product ID to use. Optional if using -e with a property ID or name.
     -e, --propertyId <propertyId/propertyName>  Optional. Use an existing property as the blueprint for new pipeline properties. Enter a property ID or an exact property name. The CLI looks up the group ID, contract ID, and product ID of the existing property and uses that information to create properties for the pipeline.
     -g, --groupIds <groupIds>                   Enter the group IDs for the environments. Optional if using -e with a property ID or name. Provide one group ID if all environments are in the same group. If each environment needs to be in its own group, add a separate -g option for each environment and in the order the environments are listed in. (default: [])
     -n, --propver <propver>                     Add only if using a property as a template. Enter the version of the existing property to use as the blueprint. The CLI uses latest version if omitted.
     -p, --pipeline <pipelineName>               Pipeline name
     --associate-property-name                   Use an existing property with the new pipeline. When using, make sure your entry matches the property name exactly.
     --custom-property-name                      Give the existing property a custom name used only with the pipeline.
     --dry-run                                   Add only if using a property as a template. Displays the JSON generated by the current command as currently written.
     --insecure                                  Makes all new environment properties HTTP, not secure HTTPS.
     --retry                                     Use if the command failed during execution. Tries to continue where the command left off.
     --secure                                    Makes new pipeline and all environment properties use secure HTTPS.
     --variable-mode <variableMode>              If creating a pipeline from an existing property, choose how your new pipeline will pull in variables from that property.  Allowed values are ${printAllowedModes()}.
     -h, --help                                  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="merge"></a>Merge
Merge template json and environment variable values into a PM/PAPI rule tree JSON document, stored in dist folder in the current pipeline folder.
This command also calls validate on the PAPI end point.

```
   Usage: akamai pipeline merge|m [options] <environment>
   
   Merge the pipeline property's template JSON and variable values into a rule tree file. The system stores the resulting JSON file in the pipeline's /dist folder.
   
   Options:
     -n, --no-validate              Merge the environment without validating.
     -p, --pipeline <pipelineName>  Pipeline name. Optional if a default pipeline
                                    was set using set-default.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="save"></a>Save
Store rule tree of provided environment. This will also perform validation.

```
   Usage: akamai pipeline save|sv [options] <environment>
   
   Save rule tree and hostnames for the environment you select. Also creates edge hostnames if needed.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if a default pipeline
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="promote"></a>Promote environment
Promote (activate property of) an environment.

```
   Usage: akamai pipeline promote|pm [options] <targetEnvironment>
   
   Promote, or activate, an environment. By default, this command also executes the merge and save commands.
   
   Options:
     -e, --emails <emails>          Comma-separated list of email addresses.
                                    Optional if default emails were set using the
                                    set-default command.
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -m, --message <message>        Enter a  message describing changes made to
                                    the environment.
     --note <message>               (Alias of --message) Enter a  message
                                    describing changes made to the environment.
     -n, --network <network>        Network, either 'production' or 'staging'. You
                                    can shorten 'production' to 'prod' or 'p' and
                                    'staging' to 'stage' or 's'.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    promotion is complete. May take several
                                    minutes.
     --force                        Deprecated. Out-of-sequence activations are
                                    now allowed by default.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="checkPromote"></a>Check promotion status
Checks status of previously initiated promotion. If the underlying property activation is complete,
the environment is considered promoted.

```
   Usage: akamai pipeline check-promotion-status|cs [options] <environment>
   
   For the selected environment, check the activation status.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    promotion is complete. May take several
                                    minutes.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="showStatus"></a>Show status
Lists or shows status of each environment of the provided (or default) pipeline. Output format is a table.

```
   Usage: akamai pipeline list-status|lstat [options]
   
   Show status of the pipeline.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="showDefault"></a>Show Default
Show default pipeline and section name in devopsSettings.json.

```
   Usage: akamai pipeline show-defaults|sf [options]
   
   Displays the current default settings for this workspace.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="setDefault"></a>Set Default
Sets default pipeline and section name in devopsSettings.json. For all commands involving an existing pipeline one can omit the
-p [pipeline-name] option

```
   Usage: akamai pipeline set-default|sd [options]
   
   Set the default pipeline and the default section of the .edgerc file to use.
   
   Options:
     -a, --accountSwitchKey <accountSwitchKey>  Enter the account ID you want to use when running commands. The account persists for all pipeline commands until you change it.
     -e, --emails <emails>                      Enter the email addresses to send notification emails to as a comma-separated list
     -f, --format <format>                      Select output format for commands, either 'table', the default, or 'json'.
     -p, --pipeline <pipelineName>              Set the default pipeline to use with commands.
     -s, --section <section>                    The section of the .edgerc file that contains the user profile, or client ID, to use with commands.
     -h, --help                                 output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List contracts
List contracts available to client ID. The output is in form of a table.

```
   Usage: akamai pipeline list-contracts|lc [options]
   
   List contracts available based on current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List products
List products available under provided contract ID and client ID. The output is in form of a table.

```
   Usage: akamai pipeline list-products|lp [options]
   
   List products available based on contract ID, client ID, and the current user credentials and setup.
   
   Options:
     -c, --contractId <contractId>  Contract ID. A contract has a fixed term of
                                    service during which specified Akamai products
                                    and modules are active.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List groups
List groups client ID has access to. The output is in form of a table.

```
   Usage: akamai pipeline list-groups|lg [options]
   
   List groups available based on the current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List cpcodes.
List cpcodes for provided contract ID and group ID.

```
   Usage: akamai pipeline list-cpcodes|lcp [options]
   
   List CP codes available based on the current user credentials and setup.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -g, --groupId <groupId>        Group ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List Edge hostnames
List edge hostnames available under provided contract ID and group ID (this could be a long list).

```
   Usage: akamai pipeline list-edgehostnames|leh [options]
   
   List edge hostnames available based on current user credentials and setup. May return a long list of hostnames.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -g, --groupId <groupId>        Group ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Search
Searches for existing property by name. Does not support wild cards, the name needs to be exact.

```
   Usage: akamai pipeline search|s [options] <name>
   
   Search for properties by name.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Set Prefixes
Set or unset id prefixes in responses. Instead of IDs with prefix like act_ACCT-ID or grp_2342 responses will only contain the id,
like ACCT-ID or just 2342. This should not matter to the end user for the most part since the SDK hides most of the
details with the communication between client and REST end points.
The value is stored with options of the currently used client id.
If the users uses multiple client ids, they would have to call set-prefixes for each client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*

```
   Usage: akamai pipeline set-prefixes|sp [options] <useprefix>
   
   Boolean. Enter `true` to enable prefixes with the current user credentials and setup. Enter `false` to disable them.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Set Rule Format
Sets the default rule format for creating new properties. This value is stored per client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*

```
   Usage: akamai pipeline set-ruleformat|srf [options] <ruleformat>
   
   Set the rule format to use with the current user credentials and setup. Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Show rule tree
Download and print out the rule tree for provided environment under a pipeline (default or provided by -p option).
For the most part this command is useless, since the rule tree is generated by the SDK and stored in the dist folder.
This command might get removed in the future or expanded in some way to make it more useful.

```
   Usage: akamai pipeline show-ruletree|sr [options] <environment>
   
   For the selected environment, shows local property's rule tree. Run this to store the rule tree in a local file: show-ruletree -p <pipelineName> <environment> >> <filename.json>
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```