
# Property Manager command help
## General Property Manager Help
Use akamai pm help to get general help about all property manager commands.
```
   Usage: akamai property-manager [options] [command]
   
   Property Manager CLI. Run these commands from the project directory that contains your local properties.
   
   Options:
     -V, --version                             output the version number
     -f, --format <format>                     Select output format for commands, either 'table', the default, or 'json'.
     -s, --section <section>                   The section of the .edgerc file that contains the user profile, or client ID, to use for the command. If not set, uses the `default` settings in the .edgerc file.
     -v, --verbose                             Show detailed log information for the command.
     --edgerc <edgerc>                         Optional. Enter the location of the .edgerc file used for credentials. If not set, uses the edgerc.config file in the project directory if present. Otherwise, uses the .edgerc file in your home directory.
     --workspace <workspace>                   Optional. Enter the directory containing all property and project files. If not set, uses the value of the AKAMAI_PROJECT_HOME environment variable if present.Otherwise, uses the current working directory as the workspace.
     -h, --help                                output usage information
   
   Commands:
     activate|atv [options]                    Activate the latest version of a property. By default, this command also executes the merge and save commands.
     activate-version [options]                Activate a specific version of a property. Activates latest if no version specified.
     check-activation-status|cs [options]      Check the activation status of a property.
     create-cpcode [options]                   Create a new CP code.
     deactivate|datv [options]                 Deactivates a property. Checks if the property is active and then deactivates it.
     delete [options]                          Permanently deletes a property. You have to deactivate the property on both networks first.
     help                                      help command
     import|i [options]                        Import a property from Property Manager.
     list-contracts|lc                         List contracts available based on the current user credentials and setup.
     list-cpcodes|lcp [options]                List CP codes available based on the current user credentials and setup.
     list-edgehostnames|leh [options]          List edge hostnames available based on current user credentials and setup. May return a long list of hostnames.
     list-groups|lg                            List groups available based on the current user credentials (clientId).
     list-products|lp [options]                List products available based on the current user credentials and contract ID.
     list-properties|lpr [options]             List properties available based on the current user credentials and setup.
     list-property-hostnames|lph [options]     List hostnames assigned to this property.
     list-property-rule-format|lprf [options]  List the current rule format for the property.
     list-property-variables|lpv [options]     List the property's variables.
     list-rule-formats|lrf                     Display the list of available rule formats.
     merge|m [options]                         Merge all property configuration files, or snippets, into a property rule tree file in JSON format. You can find the file in the property's dist folder.
     new-property|np [options]                 Create a new property using the attributes provided.
     property-update [options]                 Create a new version of a property. Copy the rules from a file stream, using –-file, or from a different property, using --srcprop.
     save|sv [options]                         Saves the rule tree and hostnames for the selected property. Creates edge hostnames if needed.
     search|s <name>                           Search for properties by name.
     set-default|sd [options]                  Set the default property and the default section name from the .edgerc file.
     set-prefixes|sp <useprefix>               Boolean. Enter `true` to use the Property Manager ID prefixes with ID values. Enter `false` to disable them. For prefixes used, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#prefixes.
     set-ruleformat|srf <ruleformat>           Set the rule format to use for the user credentials and setup. Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning.
     show-defaults|sf                          Displays the current default settings for this workspace.
     show-ruletree|sr [options]                Shows the rule tree for the selected environment.
     update-local|ul [options]                 Update local property with the latest version from the Property Manager API.
     help [cmd]                                display help for [cmd]
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
## Most useful commands in order of assumed importance

### <a name="createNew"></a>Create new property
In order to create a new property you also need to specify a group Id, product Id and contract Id. These ids can be obtained by using the list-* commands. See below.

```
   Usage: akamai property-manager new-property|np [options]
   
   Create a new property using the attributes provided.
   
   Options:
     -c, --contractId <contractId>               Enter the contract ID to use. Optional if using -e with a property ID or name.
     -d, --productId <productId>                 Enter the product ID to use. Optional if using -e with a property ID or name.
     -e, --propertyId <propertyId/propertyName>  Optional. Use an existing property as the blueprint for the new one. Enter either a property ID or an exact property name. The CLI looks up the group ID, contract ID, and product ID of the existing property and uses that data to create a new property.
     -g, --groupId <groupId>                     Enter the group ID for the property. Optional if using -e with a property ID or name.
     -n, --propver <propver>                     Add only if using a property as a template. Enter the version of the existing property to use as the blueprint. Uses latest version if omitted.
     -p, --property <propertyName>               Property name. Optional if a default property was previously set with the set-default command.
     --dry-run                                   Verify the result of your command syntax before running it. Displays the JSON generated by the command as currently written.
     --insecure                                  Makes all new environment properties HTTP, not secure HTTPS.
     --retry                                     Use if the command failed during execution. Tries to continue where the command left off.
     --secure                                    Makes the new property use secure HTTPS.
     --variable-mode <variableMode>              If creating a property from an existing one, choose how your new property pulls in variables. Allowed values are ${printAllowedModes()}.
     -h, --help                                  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="import"></a>Import existing property
      Import creates a PM CLI Property locally to work directly with an existing configuration
      
```
   Usage: akamai property-manager import|i [options]
   
   Import a property from Property Manager.
   
   Options:
     -p, --property <propertyName>   Property name. Optional if default property
                                     was set using the set-default command.
     --dry-run                       Verify the result of your command syntax
                                     before running it. Displays the JSON
                                     generated by the command as currently
                                     written.
     --variable-mode <variableMode>  Choose how to pull in variables.  Allowed
                                     values are 'no-var' and 'user-var-value'.  By
                                     default, variables aren't imported (no-var).
     -h, --help                      output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="pull"></a>Update property
Update local property with the latest from papi.

```
   Usage: akamai property-manager update-local|ul [options]
   
   Update local property with the latest version from the Property Manager API.
   
   Options:
     -p, --property <propertyName>   Property name. Optional if default property
                                     was set using the set-default command.
     --dry-run                       Verify the result of your command syntax
                                     before running it. Displays the JSON
                                     generated by the command as currently
                                     written.
     --force-update                  WARNING: This option bypasses the
                                     confirmation prompt and automatically
                                     overwrites your local files.
     --variable-mode <variableMode>  Choose how this command pulls in variables.
                                     Allowed values are 'no-var' and
                                     'user-var-value'.  Default functionality is
                                     no-var.
     -h, --help                      output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="merge"></a>Merge
Merge config snippets into a PM/PAPI rule tree JSON document, stored in dist folder in the current pipeline folder.
This command also calls validate on the PAPI end point.

```
   Usage: akamai property-manager merge|m [options]
   
   Merge all property configuration files, or snippets, into a property rule tree file in JSON format. You can find the file in the property's dist folder.
   
   Options:
     -n, --no-validate              Merge without validating command syntax.
     -p, --property <propertyName>  Property name. Optional if a default property
                                    was previously set with the set-default
                                    command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="save"></a>Save
Store rule tree of provided property. This will also perform validation.

```
   Usage: akamai property-manager save|sv [options]
   
   Saves the rule tree and hostnames for the selected property. Creates edge hostnames if needed.
   
   Options:
     -p, --property <propertyName>  Property name. Optional if default property
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="activate"></a>Activate environment
Activate a property.

```
   Usage: akamai property-manager activate|atv [options]
   
   Activate the latest version of a property. By default, this command also executes the merge and save commands.
   
   Options:
     -e, --emails <emails>          Comma-separated list of email addresses.
                                    Optional if default emails were set using the
                                    set-default command.
     -m, --message <message>        Enter a message describing changes made to the
                                    property.
     --note <message>               (Alias of --message) Enter a message
                                    describing changes made to the property.
     -n, --network <network>        Network, either 'production' or 'staging'. You
                                    can shorten 'production' to 'prod' or 'p' and
                                    'staging' to 'stage' or 's'.
     -p, --property <propertyName>  Property name. Optional if default property
                                    was set using the set-default command.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    activation is complete. May take several
                                    minutes.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="deactivate"></a>Deactivate environment
Deactivate a property.

```
   Usage: akamai property-manager deactivate|datv [options]
   
   Deactivates a property. Checks if the property is active and then deactivates it.
   
   Options:
     -e, --emails <emails>          Comma-separated list of email addresses.
                                    Optional if default emails were set using the
                                    set-default command.
     -m, --message <message>        Enter a message describing the reason for
                                    deactivating.
     --note <message>               (Alias of --message) Enter a message
                                    describing the reason for deactivating.
     -n, --network <network>        Network, either 'production' or 'staging'. You
                                    can shorten 'production' to 'prod' or 'p' and
                                    'staging' to 'stage' or 's'.
     -p, --property <propertyName>  Property name. Optional if default property
                                    was set using the set-default command.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    deactivation is complete. May take several
                                    minutes.
     --force-deactivate             WARNING: This option bypasses the confirmation
                                    prompt and automatically deactivates your
                                    property on the network.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="checkActivate"></a>Check activation status
Checks status of previously initiated activation.

```
   Usage: akamai property-manager check-activation-status|cs [options]
   
   Check the activation status of a property.
   
   Options:
     -p, --property <propertyName>  Property name. Optional if default property
                                    was previously set using set-default.
     -w, --wait-for-activate        Prevents you from entering more commands until
                                    activation is complete. May take several
                                    minutes.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="showDefault"></a>Show Default
Show default property and section name in snippetSettings.json.

```
   Usage: akamai property-manager show-defaults|sf [options]
   
   Displays the current default settings for this workspace.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### <a name="setDefault"></a>Set Default
Sets default property and section name in snippetsSettings.json. For all commands involving an existing property one can omit the
-p [property-name] option

```
   Usage: akamai property-manager set-default|sd [options]
   
   Set the default property and the default section name from the .edgerc file.
   
   Options:
     -a, --accountSwitchKey <accountSwitchKey>  Enter the account ID you want to use when running commands. The account persists for all pipeline commands until you change it.
     -e, --emails <emails>                      Enter the email addresses to send notifications to as a comma-separated list.
     -f, --format <format>                      Select output format for commands, either 'table', the default, or 'json'.
     -p, --property <propertyName>              Set the default property to use with commands.
     -s, --section <section>                    The section of the .edgerc file that contains the user profile, or client ID, to use with commands.
     -h, --help                                 output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List contracts
List contracts available to client ID. The output is in form of a table.

```
   Usage: akamai property-manager list-contracts|lc [options]
   
   List contracts available based on the current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List products
List products available under provided contract ID and client ID. The output is in form of a table.

```
   Usage: akamai property-manager list-products|lp [options]
   
   List products available based on the current user credentials and contract ID.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List groups
List groups client ID has access to. The output is in form of a table.

```
   Usage: akamai property-manager list-groups|lg [options]
   
   List groups available based on the current user credentials (clientId).
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### List cpcodes.
List cpcodes for provided contract ID and group ID.

```
   Usage: akamai property-manager list-cpcodes|lcp [options]
   
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
   Usage: akamai property-manager list-edgehostnames|leh [options]
   
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
   Usage: akamai property-manager search|s [options] <name>
   
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
   Usage: akamai property-manager set-prefixes|sp [options] <useprefix>
   
   Boolean. Enter `true` to use the Property Manager ID prefixes with ID values. Enter `false` to disable them. For prefixes used, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#prefixes.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Set Rule Format
Sets the default rule format for creating new properties. This value is stored per client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*

```
   Usage: akamai property-manager set-ruleformat|srf [options] <ruleformat>
   
   Set the rule format to use for the user credentials and setup. Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```
### Show rule tree
Download and print out the rule tree for provided property (default or provided by -p option).
For the most part this command is useless, since the rule tree is generated by the SDK and stored in the dist folder.
This command might get removed in the future or expanded in some way to make it more useful.

```
   Usage: akamai property-manager show-ruletree|sr [options]
   
   Shows the rule tree for the selected environment.
   
   Options:
     -p, --property <propertyName>  Property name. Optional if a default property
                                    was set using the set-default command.
      --propver <propver>           Optional. Enter a property version. Uses
                                    latest version if not specified.
     --file <file>                  Optional. Enter a filename to save the command
                                    output to. The output is in JSON format.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for documentation
   
   ```