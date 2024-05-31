
# Property Manager Command Help
## Property Manager CLI help
Get general help about Property Manager CLI commands.
```
   Usage: akamai property-manager [options] [command]
   
   Property Manager CLI. Run these commands from the project directory that contains your local properties.
   
   Options:
     -V, --version                              output the version number
     -f, --format <format>                      Select output format for commands, either 'table', the default, or 'json'.
     -s, --section <section>                    The section of the .edgerc file containing the user profile, or client ID, to use for the command. If not set, uses the 'default' settings in the .edgerc file.
     -v, --verbose                              Show detailed log information for the command.
     --edgerc <edgerc>                          Optional. Enter the location of the .edgerc file used for credentials. If option not set, uses the edgerc.config file in the project directory.  Otherwise, uses the .edgerc file in your home directory.
     --workspace <workspace>                    Optional. Enter the directory containing all property and project files. If option not set, uses the value of the AKAMAI_PROJECT_HOME environment variable. Otherwise, uses the current working directory as the workspace.
     -a, --accountSwitchKey <accountSwitchKey>  Optional. If you have multiple accounts, enter the account switch key you want to use when running commands. You can use the Identity Management API to retrieve the key: https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchkeys.
     -h, --help                                 output usage information
   
   Commands:
     activate|atv [options]                     Activate the latest version of a property. By default, this command also executes the merge and save commands.
     activate-version [options]                 Activate a specific version of a property. Activates latest if no version specified.
     check-activation-status|cs [options]       Check the activation status of a property.
     create-cpcode [options]                    Create a new CP code.
     deactivate|datv [options]                  Deactivates a property. Checks if the property is active and then deactivates it.
     delete [options]                           Permanently deletes a property. You have to deactivate the property on both networks first.
     help                                       help command
     hostname-update|hu [options]               Updates hostnames assigned to this property.
     import|i [options]                         Import an existing property from Property Manager.
     list-contracts|lc                          List contracts available based on the current user credentials and setup.
     list-cpcodes|lcp [options]                 List CP codes available based on the current user credentials and setup.
     list-edgehostnames|leh [options]           List edge hostnames available based on the contract ID and group ID provided. Use the list commands to retrieve the required IDs. May return a long list of hostnames.
     list-groups|lg                             List groups available based on the current user credentials (clientId).
     list-products|lp [options]                 List products available based on the current user credentials and contract ID.
     list-properties|lpr [options]              List properties available based on the current user credentials and setup.
     list-property-hostnames|lph [options]      List hostnames assigned to this property.
     list-property-rule-format|lprf [options]   List the current rule format for the property.
     list-property-variables|lpv [options]      List the property's variables.
     list-rule-formats|lrf                      Display the list of available rule formats.
     merge|m [options]                          Merge all property configuration files, or snippets, into a property rule tree file in JSON format. You can find the file in the property's dist folder. By default, this command also calls the  Property Manager API to validate the rule tree generated.
     new-property|np [options]                  Create a new property using the attributes provided. Use the list commands to retrieve the required IDs.
     property-update [options]                  Create a new version of a property. Copy the rules from a file stream, using –-file, or from a different property, using --srcprop.
     save|sv [options]                          Saves the rule tree and hostnames for the selected property. This command calls the Property Manager API to validate the rule tree, and creates edge hostnames if needed.
     search|s <name>                            Search for a property by name. Be sure to enter the exact name as wildcards aren't supported.
     set-default|sd [options]                   Set the default property and the default section name from the .edgerc file.
     set-prefixes|sp <useprefix>                Boolean. Enter `true` to enable prefixes on responses based on the current user credentials and setup. Enter `false` to disable them. If you have multiple client IDs, run separately for each client ID you want to update. **Caution.** Setting prefixes for this CLI impacts all other Property Manager API clients that use this client ID.
     set-ruleformat|srf <ruleformat>            Set the rule format to use by default based on the user's client ID.Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning **Caution.** Setting the rule format with this CLI impacts all other Property Manager API clients that use this client ID.
     show-defaults|sf                           Displays the current default settings for this workspace.
     show-ruletree|sr [options]                 Shows the rule tree for the selected environment.
     update-local|ul [options]                  Update local property with the latest version from the Property Manager API.
     help [cmd]                                 display help for [cmd]
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
## Common commands

### <a name="createNew"></a>Create new property
Create a new property for a specific contract, group, and product.

```
   Usage: akamai property-manager new-property|np [options]
   
   Create a new property using the attributes provided. Use the list commands to retrieve the required IDs.
   
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
     --nolocaldir                                Makes the new property without creating local folders.
     -h, --help                                  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="property-update"></a>Create new property version
Create a new version of an existing property. 

```
   Usage: akamai property-manager property-update [options]
   
   Create a new version of a property. Copy the rules from a file stream, using –-file, or from a different property, using --srcprop.
   
   Options:
     --dry-run                  Run validations without saving rule tree
     --file <file>              Specify the JSON file containing the rules. You
                                can find the JSON format to use here:
                                https://developer.akamai.com/api/core_features/property_manager/v1.html#putpropertyversionrules.
     --message <message>        Add comments for the property version.
     --note <message>           Alias of --message. Add comments for the property
                                version.
     -p, --property <property>  The name or ID of the property you are updating.
                                Optional if the default property was previously
                                set using set-default.
     --srcprop <srcprop>        The name or ID of the source property containing
                                the rules you want to copy
     --srcver <srcver>          Optional. The version of the property containing
                                the rules you want to copy. To use this option,
                                you must specify the source property using
                                --srcprop. The rules from the latest version of
                                the property will be used if you do not specify
                                –-srcver.
     --propver <propver>        Optional. Select the property version to update
                                to.
     --suppress                 Optional. Use to suppress the JSON output for the
                                command. If used, any errors returned will still
                                display.
     -h, --help                 output usage information
   
   Copyright (C) Akamai Technologies, Inc
   Visit http://github.com/akamai/cli-property-manager for detailed documentation
   ```
### <a name="import"></a>Import existing property
Creates a local version of an existing property. 

```
   Usage: akamai property-manager import|i [options]
   
   Import an existing property from Property Manager.
   
   Options:
     -p, --property <propertyName>   Property name. Optional if default property
                                     was set using the set-default command.
     -n, --network <network>        Network, either 'production' or 'staging'. You
                                    can shorten 'production' to 'prod' or 'p' and
                                    'staging' to 'stage' or 's'.
     --dry-run                       Verify the result of your command syntax
                                     before running it. Displays the JSON
                                     generated by the command as currently
                                     written.
     --variable-mode <variableMode>  Choose how to pull in variables.  Allowed
                                     values are 'no-var' and 'user-var-value'.  By
                                     default, variables aren't imported (no-var).
     -h, --help                      output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="pull"></a>Update property
Update local property with the latest from the Property Manager API (PAPI).

```
   Usage: akamai property-manager update-local|ul [options]
   
   Update local property with the latest version from the Property Manager API.
   
   Options:
     -p, --property <propertyName>   Property name. Optional if default property
                                     was set using the set-default command.
     -n, --network <network>        Network, either 'production' or 'staging'. You
                                    can shorten 'production' to 'prod' or 'p' and
                                    'staging' to 'stage' or 's'.
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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="hostname-update"></a>Update hostnames
Updates hostnames assigned to a property.

```
   Usage: akamai property-manager hostname-update|hu [options]
   
   Updates hostnames assigned to this property.
   
   Options:
     -p, --property <property>  Property name or property ID.
     --propver <propver>        Select the property version to update to.
     --file <file>              Specify the JSON file containing the hostnames.
                                You can find the JSON format to use here:
                                https://developer.akamai.com/api/core_features/property_manager/v1.html#putpropertyversionhostnames.
     --patch                    Optional. Runs a PATCH request to update hostnames
                                assigned to this property. You can find
                                information on the command here::
                                https://developer.akamai.com/api/core_features/property_manager/v1.html#patchpropertyversionhostnames.
     -h, --help                 output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="merge"></a>Merge
Merge your local configuration files into a property rule tree file in JSON format. 

```
   Usage: akamai property-manager merge|m [options]
   
   Merge all property configuration files, or snippets, into a property rule tree file in JSON format. You can find the file in the property's dist folder. By default, this command also calls the  Property Manager API to validate the rule tree generated.
   
   Options:
     -n, --no-validate              Merge without validating command syntax.
     -p, --property <propertyName>  Property name. Optional if a default property
                                    was previously set with the set-default
                                    command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="save"></a>Save
Store the rule tree of a property you select. 

```
   Usage: akamai property-manager save|sv [options]
   
   Saves the rule tree and hostnames for the selected property. This command calls the Property Manager API to validate the rule tree, and creates edge hostnames if needed.
   
   Options:
     -p, --property <propertyName>  Property name. Optional if default property
                                    was set using the set-default command.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="activate"></a>Activate environment
Activate a property.

```
   Usage: akamai property-manager activate|atv [options]
   
   Activate the latest version of a property. By default, this command also executes the merge and save commands.
   
   Options:
     -e, --emails <emails>          Optional. A comma-separated list of email
                                    addresses. If not used, sends updates to any
                                    default emails set using the set-default
                                    command.
     -m, --message <message>        Enter a message describing changes made to the
                                    property.
     --note <message>               Alias of --message. Enter a message describing
                                    changes made to the property.
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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="activate-version"></a>Activate property version
Activate a specific version of a property. 

```
   Usage: akamai property-manager activate-version [options]
   
   Activate a specific version of a property. Activates latest if no version specified.
   
   Options:
     -e, --emails <emails>      Optional. A comma-separated list of email
                                addresses. If not used, sends updates to any
                                default emails set using the set-default command.
     -m, --message <message>    Enter a message describing the reason for
                                activating.
     --note <message>           Alias of --message. Activation message passed to
                                activation backend
     -n, --network <network>    Network, either 'production' or 'staging'. You can
                                shorten 'production' to 'prod' or 'p' and
                                'staging' to 'stage' or 's'.
     -p, --property <property>  Property name or property ID. Optional if default
                                property was previously set using set-default.
      --propver <propver>       Optional. The property version to activate. Uses
                                latest version if not specified.
     -w, --wait-for-activate    Prevents you from entering more commands until
                                activation is complete. May take several minutes.
     -h, --help                 output usage information
   
   Copyright (C) Akamai Technologies, Inc
   Visit http://github.com/akamai/cli-property-manager for detailed documentation
   ```
### <a name="checkActivate"></a>Check activation status
Check status of an activation that's been started.

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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="deactivate"></a>Deactivate environment
Deactivate a property.

```
   Usage: akamai property-manager deactivate|datv [options]
   
   Deactivates a property. Checks if the property is active and then deactivates it.
   
   Options:
     -e, --emails <emails>          Optional. A comma-separated list of email
                                    addresses. If not used, sends updates to any
                                    default emails set using the set-default
                                    command.
     -m, --message <message>        Enter a message describing the reason for
                                    deactivating.
     --note <message>               Alias of --message. Enter a message describing
                                    the reason for deactivating.
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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="showDefault"></a>Show Default
Get default property and default section name information from the snippetSettings.json file.

```
   Usage: akamai property-manager show-defaults|sf [options]
   
   Displays the current default settings for this workspace.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### <a name="setDefault"></a>Set default
Sets default property and section name in the snippetsSettings.json file. 

```
   Usage: akamai property-manager set-default|sd [options]
   
   Set the default property and the default section name from the .edgerc file.
   
   Options:
     -a, --accountSwitchKey <accountSwitchKey>  Enter the account switch key you want to use when running commands. The key entered is the default for all Property Manager commands until you change it. You can use the Identity Management API to retrieve the key: https://developer.akamai.com/api/core_features/identity_management/v2.html#getaccountswitchkeys.
     -e, --emails <emails>                      Enter the email addresses to send notifications to as a comma-separated list.
     -f, --format <format>                      Select output format for commands, either 'table', the default, or 'json'.
     -p, --property <propertyName>              Set the default property to use with commands.
     -s, --section <section>                    The section of the .edgerc file that contains the user profile, or client ID, to use with commands.
     -h, --help                                 output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List contracts
List available contracts based on your client ID. 

```
   Usage: akamai property-manager list-contracts|lc [options]
   
   List contracts available based on the current user credentials and setup.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List products
List available products based on your client ID and the contract ID you select. 

```
   Usage: akamai property-manager list-products|lp [options]
   
   List products available based on the current user credentials and contract ID.
   
   Options:
     -c, --contractId <contractId>  Contract ID.
     -h, --help                     output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List groups
List available groups based on your client ID. 

```
   Usage: akamai property-manager list-groups|lg [options]
   
   List groups available based on the current user credentials (clientId).
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### List CP codes
List available CP codes for provided contract ID and group ID.

```
   Usage: akamai property-manager list-cpcodes|lcp [options]
   
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
   Usage: akamai property-manager list-edgehostnames|leh [options]
   
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
   Usage: akamai property-manager search|s [options] <name>
   
   Search for a property by name. Be sure to enter the exact name as wildcards aren't supported.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Set prefixes
Add or remove prefixes in responses.                  

```
   Usage: akamai property-manager set-prefixes|sp [options] <useprefix>
   
   Boolean. Enter `true` to enable prefixes on responses based on the current user credentials and setup. Enter `false` to disable them. If you have multiple client IDs, run separately for each client ID you want to update. **Caution.** Setting prefixes for this CLI impacts all other Property Manager API clients that use this client ID.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Set rule format
Sets the default rule format used when creating new properties. 

```
   Usage: akamai property-manager set-ruleformat|srf [options] <ruleformat>
   
   Set the rule format to use by default based on the user's client ID.Enter `latest` for the most current rule format. For a list of earlier rule formats, see: https://developer.akamai.com/api/core_features/property_manager/v1.html#versioning **Caution.** Setting the rule format with this CLI impacts all other Property Manager API clients that use this client ID.
   
   Options:
     -h, --help  output usage information
   
     © 2017-2020 Akamai Technologies, Inc. All rights reserved
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```
### Show rule tree
Download and print out a property's rule tree.

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
     Visit http://github.com/akamai/cli-property-manager for more documentation
   
   ```