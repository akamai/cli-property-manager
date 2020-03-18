
# Property Manager command help
                   ## General Property Manager Help
                   Use akamai pm help to get general help about all property manager commands.
```
   Usage: akamai pm [options] [command]
```   
   PM CLI. The command assumes that your current working directory is the project space under which all properties reside
```   
   Options:
     -V, --version                         output the version number
     -v, --verbose                         Verbose output, show logging on stdout
     -s, --section <section>               Section name representing Client ID in .edgerc file, defaults to "credentials"
     -f, --format <format>                 Select output format, allowed values are 'json' or 'table'
     -h, --help                            output usage information
   
   Commands:
     new-property|np [options]             Create a new PM CLI property with provided attributes.
     set-default|sd [options]              Set the default PM CLI property and or the default section name from .edgerc
     show-defaults|sf                      Show default settings for this workspace
     merge|m [options]                     Merge config snippets into a PM/PAPI ruletree JSON document, stored in dist folder in the current property folder
     search|s <name>                       Search for properties by name
     set-prefixes|sp <useprefix>           Set or unset use of prefixes [true|false] for current user credentials and setup
     set-ruleformat|srf <ruleformat>       Set ruleformat for current user credentials and setup
     list-contracts|lc                     List contracts available to current user credentials and setup
     list-products|lp [options]            List products available under provided contract ID and client ID available to current user credentials and setup
     list-groups|lg                        List groups available to current user credentials and setup
     list-cpcodes|lcp [options]            List cpcodes available to current user credentials and setup.
     show-ruletree|sr [options]            Shows the rule tree of a local property
     save|sv [options]                     Save rule tree and hostnames for provided PM CLI property. Edge hostnames are also created if needed.
     list-edgehostnames|leh [options]      List edge hostnames available to current user credentials and setup (this could be a long list).
     activate|atv [options]                Activate a PM CLI property. This command also executes the merge and save commands mentioned above by default.
     deactivate|datv [options]             Deactivate a PM CLI property. This command will check if the property is active and then deactivate it
     check-activation-status|cs [options]  Check status of activation of a PM CLI property.
     update-local|ul [options]             Update local property with the latest from Property Manager.
     import|i [options]                    Import a property from Property Manager.
     help [cmd]                            display help for [cmd]
```   
   
## Most useful commands in order of assumed importance

## <a name="createNew"></a>Create new property
In order to create a new property you also need to specify a group Id, product Id and contract Id. These ids can be obtained by using the list-* commands. See below.
```
   Usage: new-property|np [options]
 ```  
   Create a new PM CLI property with provided attributes.
```   
   Options:
     --retry                                     Assuming command failed last time during execution. Try to continue where it left off.
     --dry-run                                   Just parse the parameters and print out the json generated that would normally call the create property function.
     -p, --property <propertyName>               PM CLI property name
     -g, --groupId <groupId>                     Group ID, optional if -e propertyId/Name is used
     -c, --contractId <contractId>               Contract ID, optional if -e propertyId/Name is used
     -d, --productId <productId>                 Product ID, optional if -e propertyId/Name is used
     -e, --propertyId <propertyId/propertyName>  Use existing property as blue print for PM CLI property. Either pass property ID or exact property name. PM CLI will lookup account information like group id, contract id and product id of the existing property and use the information for creating PM CLI properties
     -n, --version <version>                     Can be used only if option '-e' is being used. Specify version of existing property being used as blue print, if omitted, use latest
     --variable-mode <variableMode>              Choose how your new property will pull in variable.  Allowed values are 'default', 'no-var', and 'user-var-value'.  Only works when creating a property from an existing property
     --secure                                    Make new property secure
     --insecure                                  Make new property not secure
     -h, --help                                  output usage information
```   
   

      ## <a name="import"></a>Import existing property
      Import creates a PM CLI Property locally to work directly with an existing configuration
```      
   Usage: import|i [options]
```   
   Import a property from Property Manager.
```   
   Options:
     -p, --property <propertyName>   PM CLI property name
     --dry-run                       Just parse the parameters and print out the json generated that would normally call the create property function.
     --variable-mode <variableMode>  Choose how your import will pull in variables.  Allowed values are 'no-var' and 'user-var-value'.  Default functionality is no-var
     -h, --help                      output usage information
```   
   
## <a name="pull"></a>Update property
Update local property with the latest from papi.
```
   Usage: update-local|ul [options]
```   
   Update local property with the latest from Property Manager.
```   
   Options:
     -p, --property <propertyName>   PM CLI property name
     --dry-run                       Just parse the parameters and print out the json generated that would normally call the create property function.
     --variable-mode <variableMode>  Choose how your update-local will pull in variables.  Allowed values are 'no-var' and 'user-var-value'.  Default functionality is no-var
     --force-update                  WARNING:  This option will bypass the confirmation prompt and will overwrite your local files
     -h, --help                      output usage information
```   
   
## <a name="merge"></a>Merge
Merge config snippets into a PM/PAPI rule tree JSON document, stored in dist folder in the current pipeline folder.
This command also calls validate on the PAPI end point.
```
   Usage: merge|m [options]
```   
   Merge config snippets into a PM/PAPI ruletree JSON document, stored in dist folder in the current property folder
 ```  
   Options:
     -p, --property <propertyName>  PM CLI property name
     -n, --no-validate              Don't call validation end point. Just run merge.
     -h, --help                     output usage information
 ```  
   
## <a name="save"></a>Save
Store rule tree of provided property. This will also perform validation.
```
   Usage: save|sv [options]
```   
   Save rule tree and hostnames for provided PM CLI property. Edge hostnames are also created if needed.
```   
   Options:
     -p, --property <propertyName>  PM CLI property name
     -h, --help                     output usage information
 ```  
   
## <a name="activate"></a>Activate environment
Activate a property.
```
   Usage: activate|atv [options]
```   
   Activate a PM CLI property. This command also executes the merge and save commands mentioned above by default.
```   
   Options:
     -p, --property <propertyName>  PM CLI property name
     -n, --network <network>        Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'
     -e, --emails <emails>          Comma separated list of email addresses. Optional if default emails were previously set with set-default
     -m, --message <message>        Activation message passed to activation backend
     -w, --wait-for-activate        Return after activation of a property is active.
     -h, --help                     output usage information
```   
   
## <a name="deactivate"></a>Deactivate environment
Deactivate a property.
```
   Usage: deactivate|datv [options]
```   
   Deactivate a PM CLI property. This command will check if the property is active and then deactivate it
```   
   Options:
     -p, --property <propertyName>  PM CLI property name
     -n, --network <network>        Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'
     -e, --emails <emails>          Comma separated list of email addresses. Optional if default emails were previously set with set-default
     -m, --message <message>        deactivation message passed to backend
     -w, --wait-for-activate        Return after the property is deactivated.
     --force-deactivate             WARNING:  This option will bypass the confirmation prompt and will Deactivate your property on the network
     -h, --help                     output usage information
```   
   
## <a name="checkActivate"></a>Check activation status
Checks status of previously initiated activation.
```
   Usage: check-activation-status|cs [options]
```   
   Check status of activation of a PM CLI property.
```   
   Options:
     -p, --property <propertyName>  PM CLI property name
     -w, --wait-for-activate        Return after activation of a PM CLI property is active.
     -h, --help                     output usage information
```   
   
## <a name="showDefault"></a>Show Default
Show default property and section name in snippetSettings.json.
```
   Usage: show-defaults|sf [options]
```   
   Show default settings for this workspace
```   
   Options:
     -h, --help  output usage information
```   
   
## <a name="setDefault"></a>Set Default
Sets default property and section name in snippetsSettings.json. For all commands involving an existing property one can omit the
-p [property-name] option
```
   Usage: set-default|sd [options]
```   
   Set the default PM CLI property and or the default section name from .edgerc
 ```  
   Options:
     -p, --property <propertyName>  Set default property name
     -s, --section <section>        Set default section name from edgerc file
     -f, --format <format>          Select output format, allowed values are 'json' or 'table'
     -e, --emails <emails>          Set default notification emails as comma separated list
     -h, --help                     output usage information
 ```  
   
## List contracts
List contracts available to client ID. The output is in form of a table.
```
   Usage: list-contracts|lc [options]
 ```  
   List contracts available to current user credentials and setup
```   
   Options:
     -h, --help  output usage information
```   
   
## List products
List products available under provided contract ID and client ID. The output is in form of a table.
```
   Usage: list-products|lp [options]
```   
   List products available under provided contract ID and client ID available to current user credentials and setup
```   
   Options:
     -c, --contractId <contractId>  Contract ID
     -h, --help                     output usage information
```   
   
## List groups
List groups client ID has access to. The output is in form of a table.
```
   Usage: list-groups|lg [options]
```   
   List groups available to current user credentials and setup
```   
   Options:
     -h, --help  output usage information
```   
   
## List cpcodes.
List cpcodes for provided contract ID and group ID.
```
   Usage: list-cpcodes|lcp [options]
```   
   List cpcodes available to current user credentials and setup.
```   
   Options:
     -c, --contractId <contractId>  Contract ID
     -g, --groupId <groupId>        Group ID
     -h, --help                     output usage information
```   
   
## List Edge hostnames
List edge hostnames available under provided contract ID and group ID (this could be a long list).
```
   Usage: list-edgehostnames|leh [options]
```   
   List edge hostnames available to current user credentials and setup (this could be a long list).
```   
   Options:
     -c, --contractId <contractId>  Contract ID
     -g, --groupId <groupId>        Group ID
     -h, --help                     output usage information
```   
   
## Search
Searches for existing property by name. Does not support wild cards, the name needs to be exact.
```
   Usage: search|s [options] <name>
```   
   Search for properties by name
```   
   Options:
     -h, --help  output usage information
```   
   
## Set Prefixes
Set or unset id prefixes in responses. Instead of IDs with prefix like act_ACCT-ID or grp_2342 responses will only contain the id,
like ACCT-ID or just 2342. This should not matter to the end user for the most part since the SDK hides most of the
details with the communication between client and REST end points.
The value is stored with options of the currently used client id.
If the users uses multiple client ids, they would have to call set-prefixes for each client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*
```
   Usage: set-prefixes|sp [options] <useprefix>
```   
   Set or unset use of prefixes [true|false] for current user credentials and setup
```   
   Options:
     -h, --help  output usage information
```   
   
## Set Rule Format
Sets the default rule format for creating new properties. This value is stored per client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*
```
   Usage: set-ruleformat|srf [options] <ruleformat>
```   
   Set ruleformat for current user credentials and setup
```   
   Options:
     -h, --help  output usage information
```   
   
## Show rule tree
Download and print out the rule tree for provided property (default or provided by -p option).
The rule tree is generated by the SDK and stored in the dist folder.
Also, one can use the ```show-ruletree -p <propertyName>  >>  <filename.json>``` to store it into a local file.
This command might get removed in the future or expanded in some way to make it more useful.
```
   Usage: show-ruletree|sr [options]
```   
   Shows the rule tree of a local property
```   
   Options:
     -p, --property <propertyName>  property name
     -h, --help                     output usage information
```   
   