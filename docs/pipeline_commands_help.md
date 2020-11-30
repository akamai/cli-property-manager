
# Akamai Pipeline Command Help

## Akamai Pipeline CLI help
Get help for Akamai Pipeline CLI commands. A pipeline is a chain of environments within your organization.

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
     -a, --accountSwitchKey <accountSwitchKey>          Optional. Enter the account switch key you want to use when running  commands. Using this option overwrites the default account. You can use the Identity Management API to retrieve keys: https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchke
     -h, --help                                         output usage information
   
   Commands:
     change-ruleformat|crf [options] [environments...]  Change the property rule format used by a pipeline or an environment. Enter a space-separated list of environments after the pipeline name to update a subset of environments.
     check-promotion-status|cs [options] <environment>  For the selected environment, check the activation status. If the underlying property activation is complete, the environment is considered promoted.
     help                                               help command
     list-contracts|lc                                  List contracts available based on current user credentials and setup.
     list-cpcodes|lcp [options]                         List CP codes available based on the current user credentials and setup.
     list-edgehostnames|leh [options]                   List edge hostnames available based on the contract ID and group ID provided. Use the list commands to retrieve the required IDs. May return a long list of hostnames.
     list-groups|lg                                     List groups available based on the current user credentials and setup.
     list-products|lp [options]                         List products available based on contract ID, client ID, and the current user credentials and setup.
     list-properties|lpr [options]                      List properties available based on the current user credentials and setup.
     list-property-hostnames|lph [options]              List hostnames assigned to this property.
     list-property-rule-format|lprf [options]           List the current rule format for the property.
     list-property-variables|lpv [options]              List the property's variables.
     list-rule-formats|lrf                              Display the list of available rule formats.
     list-status|lstat [options]                        Show status of the pipeline.
     merge|m [options] <environment>                    Merge the pipeline property's template JSON and variable values into a rule tree file. The system stores the resulting JSON file in the pipeline's /dist folder.
     new-pipeline|np [options] <environments...>        Create a new pipeline with provided attributes. You need a name for the pipeline, one or more environment names, and IDs for contract, group, and product. Separate each environment name with a space. Use the list commands to retrieve these IDs. This command creates one property for each environment.
     promote|pm [options] <targetEnvironment>           Promote, or activate, an environment. By default, this command also executes the merge and save commands.
     save|sv [options] <environment>                    Save rule tree and hostnames for the environment you select. This command calls PAPI to validate the rule tree, and creates edge hostnames if needed.
     search|s <name>                                    Search for a property by name. Be sure to enter the exact name as wildcards aren't supported.
     set-default|sd [options]                           Set the default pipeline and the default section of the .edgerc file to use.
     set-prefixes|sp <useprefix>                        Boolean. Enter `true` to enable prefixes on responses based on the current user credentials and setup. Enter `false` to disable them. If you have multiple client IDs, run separately for each client ID you want to update. **Caution.** Setting prefixes with this CLI impacts all other Property Manager API clients that use this client ID.
     set-ruleformat|srf <ruleformat>                    Set the rule format to use based on the user's client ID.Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning **Caution.** Setting the rule format with this CLI impacts all other Property Manager API clients that use this client ID.
     show-defaults|sf                                   Displays the current default settings for this workspace.
     show-ruletree|sr [options] <environment>           For the selected environment, shows local property's rule tree. Run this to store the rule tree in a local file: show-ruletree -p <pipelineName> <environment> >> <filename.json>
     help [cmd]                                         display help for [cmd]
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
## Common commands

### <a name="createNew"></a>Create new pipeline
Create a pipeline for distributing properties across your environments. 

```
   Usage: akamai pipeline new-pipeline|np [options] <environments...>
   
   Create a new pipeline with provided attributes. You need a name for the pipeline, one or more environment names, and IDs for contract, group, and product. Separate each environment name with a space. Use the list commands to retrieve these IDs. This command creates one property for each environment.
   
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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="merge"></a>Merge
Merge your template JSON files and environment variable values into a JSON-based property rule tree file. 

```
   Usage: akamai pipeline merge|m [options] <environment>
   
   Merge the pipeline property's template JSON and variable values into a rule tree file. The system stores the resulting JSON file in the pipeline's /dist folder.
   
   Options:
     -n, --no-validate              Merge the environment without validating.
     -p, --pipeline <pipelineName>  Pipeline name. Optional if a default pipeline
                                    was set using set-default.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="save"></a>Save
Store the rule tree for the environment you select.

```
   Usage: akamai pipeline save|sv [options] <environment>
   
   Save rule tree and hostnames for the environment you select. This command calls PAPI to validate the rule tree, and creates edge hostnames if needed.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if a default pipeline
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="promote"></a>Promote environment
Activate, or promote, a property within a specific environment.

```
   Usage: akamai pipeline promote|pm [options] <targetEnvironment>
   
   Promote, or activate, an environment. By default, this command also executes the merge and save commands.
   
   Options:
     -e, --emails <emails>          Optional. A comma-separated list of email
                                    addresses. If not used, sends updates to any
                                    default emails set using the set-default
                                    command.
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -m, --message <message>        Enter a message describing changes made to the
                                    environment.
     --note <message>               Alias of --message. Enter a message describing
                                    changes made to the environment.
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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="checkPromote"></a>Check promotion status
Checks status of a promotion that's been started. 

```
   Usage: akamai pipeline check-promotion-status|cs [options] <environment>
   
   For the selected environment, check the activation status. If the underlying property activation is complete, the environment is considered promoted.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    promotion is complete. May take several
                                    minutes.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="showStatus"></a>Show status
List status of each environment within the selected pipeline. 

```
   Usage: akamai pipeline list-status|lstat [options]
   
   Show status of the pipeline.
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="showDefault"></a>Show default
Get default pipeline and section name information from the devopsSettings.json file. 


```
   Usage: akamai pipeline show-defaults|sf [options]
   
   Displays the current default settings for this workspace.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="setDefault"></a>Set default
Sets default property and section name in the devopsSettings.json file. 

```
   Usage: akamai pipeline set-default|sd [options]
   
   Set the default pipeline and the default section of the .edgerc file to use.
   
   Options:
     -a, --accountSwitchKey <accountSwitchKey>  Enter the account switch key you want to use when running commands. The key entered is the default for all pipeline commands until you change it. You can use the Identity Management API to retrieve keys: https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchkeys.
     -e, --emails <emails>                      Enter the email addresses to send notification emails to as a comma-separated list
     -f, --format <format>                      Select output format for commands, either 'table', the default, or 'json'.
     -p, --pipeline <pipelineName>              Set the default pipeline to use with commands.
     -s, --section <section>                    The section of the .edgerc file that contains the user profile, or client ID, to use with commands.
     -h, --help                                 output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List contracts
List available contracts based on your client ID. 

```
   Usage: akamai pipeline list-contracts|lc [options]
   
   List contracts available based on current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List products
List available products based on your client ID and the contract ID you select. 

```
   Usage: akamai pipeline list-products|lp [options]
   
   List products available based on contract ID, client ID, and the current user credentials and setup.
   
   Options:
     -c, --contractId <contractId>  Contract ID. A contract has a fixed term of
                                    service during which specified Akamai products
                                    and modules are active.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List groups
List available groups based on your client ID.

```
   Usage: akamai pipeline list-groups|lg [options]
   
   List groups available based on the current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List CP codes
List available CP codes for the contract ID and group ID provided.

```
   Usage: akamai pipeline list-cpcodes|lcp [options]
   
   List CP codes available based on the current user credentials and setup.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -g, --groupId <groupId>        Group ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List edge hostnames
List edge hostnames available based on the contract ID and group ID provided. 

```
   Usage: akamai pipeline list-edgehostnames|leh [options]
   
   List edge hostnames available based on the contract ID and group ID provided. Use the list commands to retrieve the required IDs. May return a long list of hostnames.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -g, --groupId <groupId>        Group ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Search
Search for an existing property by name. 

```
   Usage: akamai pipeline search|s [options] <name>
   
   Search for a property by name. Be sure to enter the exact name as wildcards aren't supported.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Set prefixes
Add or remove prefixes in responses.                  

```
   Usage: akamai pipeline set-prefixes|sp [options] <useprefix>
   
   Boolean. Enter `true` to enable prefixes on responses based on the current user credentials and setup. Enter `false` to disable them. If you have multiple client IDs, run separately for each client ID you want to update. **Caution.** Setting prefixes with this CLI impacts all other Property Manager API clients that use this client ID.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Set rule format
Sets the default rule format used when creating new properties. 

```
   Usage: akamai pipeline set-ruleformat|srf [options] <ruleformat>
   
   Set the rule format to use based on the user's client ID.Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning **Caution.** Setting the rule format with this CLI impacts all other Property Manager API clients that use this client ID.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Show rule tree
Download and print out the rule tree the environment you provide.

```
   Usage: akamai pipeline show-ruletree|sr [options] <environment>
   
   For the selected environment, shows local property's rule tree. Run this to store the rule tree in a local file: show-ruletree -p <pipelineName> <environment> >> <filename.json>
   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name. Optional if default pipeline
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```