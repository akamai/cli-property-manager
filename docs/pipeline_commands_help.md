
# Akamai Pipeline command help

## General Pipeline help
Use akamai pl help to get general help about all pipeline commands.

```
   Usage: akamai pl [options] [command]
``` 
   Akamai Pipeline. The command assumes that your current working directory is the pipeline space under which all pipelines reside

```   
   Options:
     -V, --version                                      output the version number
     -v, --verbose                                      Verbose output, show logging on stdout
     -s, --section <section>                            Section name representing Client ID in .edgerc file, defaults to "credentials"
     -f, --format <format>                              Select output format, allowed values are 'json' or 'table'
     -h, --help                                         output usage information
   
   Commands:
     new-pipeline|np [options] [environments...]        Create a new pipeline with provided attributes. This will also create one property for each environment.
     set-default|sd [options]                           Set the default pipeline and or the default section name from .edgerc
     show-defaults|sf                                   Show default settings for this workspace
     merge|m [options] <environment>                    Merge template json and variable values into a PM/PAPI ruletree JSON document, stored in dist folder in the current pipeline folder
     search|s <name>                                    Search for properties by name
     set-prefixes|sp <useprefix>                        Set or unset use of prefixes [true|false] for current user credentials and setup
     set-ruleformat|srf <ruleformat>                    Set ruleformat for current user credentials and setup
     list-contracts|lc                                  List contracts available to current user credentials and setup
     list-products|lp [options]                         List products available under provided contract ID and client ID available to current user credentials and setup
     list-groups|lg                                     List groups available to current user credentials and setup
     list-cpcodes|lcp [options]                         List cpcodes available to current user credentials and setup.
     show-ruletree|sr [options] <environment>           Shows the rule tree of a local property for provided environment
     save|sv [options] <environment>                    Save rule tree and hostnames for provided environment. Edge hostnames are also created if needed.
     list-edgehostnames|leh [options]                   List edge hostnames available to current user credentials and setup (this could be a long list).
     list-status|lstat [options]                        Show status of pipeline
     promote|pm [options] <targetEnvironment>           Promote (activate) an environment. This command also executes the merge and save commands mentioned above by default.
     check-promotion-status|cs [options] <environment>  Check status of promotion (activation) of an environment.
     help [cmd]                                         display help for [cmd]
   
```   

## Most useful commands in order of assumed importance

## <a name="createNew"></a>Create new pipeline.
A pipeline consists of a pipeline name and 2 or more environment names. In order to create a new pipeline you also need to specify
a group Id, product Id and contract Id. These ids can be obtained by using the list-* commands. See below.
```
   Usage: new-pipeline|np [options] [environments...]
```  

   Create a new pipeline with provided attributes. This will also create one property for each environment.
   
```   
   Options:
     --retry                                     Assuming command failed last time during execution. Try to continue where it left off.
     --dry-run                                   Just parse the parameters and print out the json generated that would normally call the create pipeline function.
     -p, --pipeline <pipelineName>               Pipeline name
     -g, --groupIds <groupIds>                   Group IDs, optional if -e propertyId/Name is used. Provide one groupId if all environments are expected in that same group. If each environment needs to be in its own group, provide the same number of groupIds as environments by using multiple -g options. (default: [])
     -c, --contractId <contractId>               Contract ID, optional if -e propertyId/Name is used
     -d, --productId <productId>                 Product ID, optional if -e propertyId/Name is used
     -e, --propertyId <propertyId/propertyName>  Use existing property as blue print for pipeline templates. Either pass property ID or exact property name. Akamai pipeline will lookup account information like group id, contract id and product id of the existing property and use the information for creating pipeline properties
     -n, --version <version>                     Can be used only if option '-e' is being used. Specify version of existing property being used as blue print, if omitted, use latest
     --secure                                    Make new pipeline secure, all environment properties are going to be secure
     --insecure                                  Make all environment properties not secure
     --custom-property-name                      To use custom property names
     --associate-property-name                   To use existing properties in the pipeline
     --variable-mode <variableMode>              Choose how your new pipeline will pull in variable.  Allowed values are 'default', 'no-var', and 'user-var-value'.  Only works when creating a pipeline from an existing property
     -h, --help                                  output usage information
```   
   
## <a name="merge"></a>Merge
Merge template json and environment variable values into a PM/PAPI rule tree JSON document, stored in dist folder in the current pipeline folder.
This command also calls validate on the PAPI end point.

```
   Usage: merge|m [options] <environment>
```
   
   Merge template json and variable values into a PM/PAPI ruletree JSON document, stored in dist folder in the current pipeline folder

```   
   Options:
     -p, --pipeline <pipelineName>  Pipeline name
     -n, --no-validate              Don't call validation end point. Just run merge.
     -h, --help                     output usage information
```   
   
## <a name="save"></a>Save
Store rule tree of provided environment. This will also perform validation.

```
   Usage: save|sv [options] <environment>
```
   
   Save rule tree and hostnames for provided environment. Edge hostnames are also created if needed.

```   
   Options:
     -p, --pipeline <pipelineName>  pipeline name
     -h, --help                     output usage information
```
   
## <a name="promote"></a>Promote environment
Promote (activate property of) an environment.

```
   Usage: promote|pm [options] <targetEnvironment>
```  
 
   Promote (activate) an environment. This command also executes the merge and save commands mentioned above by default.

```   
   Options:
     -p, --pipeline <pipelineName>  pipeline name
     -n, --network <network>        Network, either 'production' or 'staging', can be abbreviated to 'p' or 's'
     -e, --emails <emails>          Comma separated list of email addresses. Optional if default emails were previously set with set-default
     -m, --message <message>        Promotion message passed to activation backend
     -w, --wait-for-activate        Return after promotion of an environment is active.
     --force                        Force command is deprecated, out of sequence activations are now allowed by default. 
     -h, --help                     output usage information
```
   
## <a name="checkPromote"></a>Check promotion status
Checks status of previously initiated promotion. If the underlying property activation is complete,
the environment is considered promoted.

```
   Usage: check-promotion-status|cs [options] <environment>
```

   Check status of promotion (activation) of an environment.
   
```   
   Options:
     -p, --pipeline <pipelineName>  pipeline name
     -w, --wait-for-activate        Return after promotion of an environment is active.
     -h, --help                     output usage information
```
   
## <a name="showStatus"></a>Show status
Lists or shows status of each environment of the provided (or default) pipeline. Output format is a table.

```
   Usage: list-status|lstat [options]
```

   Show status of pipeline

```   
   Options:
     -p, --pipeline <pipelineName>  pipeline name
     -h, --help                     output usage information
```
   
## <a name="showDefault"></a>Show Default
Show default pipeline and section name in devopsSettings.json.

```
   Usage: show-defaults|sf [options]
```
   Show default settings for this workspace

```   
   Options:
     -h, --help  output usage information
```
   
## <a name="setDefault"></a>Set Default
Sets default pipeline and section name in devopsSettings.json. For all commands involving an existing pipeline one can omit the
-p [pipeline-name] option

```
   Usage: set-default|sd [options]
```

   Set the default pipeline and or the default section name from .edgerc

```   
   Options:
     -p, --pipeline <pipelineName>  Set default pipeline name
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
Download and print out the rule tree for provided environment under a pipeline (default or provided by -p option).
The rule tree is generated by the SDK and stored in the dist folder. 
Also, one can use the ```show-ruletree -p <pipelineName> <environment> >>  <filename.json>``` to store it into a local file.
This command might get removed in the future or expanded in some way to make it more useful.

```
   Usage: show-ruletree|sr [options] <environment>
```
   Shows the rule tree of a local property for provided environment

```   
   Options:
     -p, --pipeline <pipelineName>  pipeline name
     -h, --help                     output usage information
```
   