# DevOps SDK ClI command help

## General help
Use devops-prov, devops-prov -h, devops-prov --help to get general help about all commands.

    Usage: DevOps SDK [options] [command]
    
    DevOps Provisioning SDK command line too. The command assumes that your current working directory is the project space under which all projects reside
    
    
    Options:

        -V, --version                  output the version number
        -v, --verbose                  Verbose output, show logging on stdout
        -i, --client-id <clientId>     Section name representing Client ID in client.properties file, defaults to "credentials"
        --record-to-file <filename>    Record REST communication to file
        --record-errors                Also record error responses
        --replay-from-file <filename>  Use record file to replay REST communication. Used for offline testing
        -h, --help                     output usage information


    Commands:

        new-project|np [options] [environments...]          Create a new project (pipeline) with provided attributes. This will also create one PM property for each environment.
        set-default|sd [options]                            Set the default project and default section name used client.properties.
        merge|m [options] <env>                             Merge template json and variable values into a PM/PAPI ruletree JSON document, stored in dist folder in the current project folder
        search|s <name>                                     Search for PM properties by name
        set-prefixes|sp <useprefix>                         Set or unset prefixes for the currently selected client ID
        set-ruleformat|srf <ruleformat>                     Set ruleformat for the selected client ID
        list-contracts|lc                                   List contracts available to client ID
        list-products|lp [options]                          List products available under provided contract ID and client ID
        list-groups|lg                                      List groups client ID has access to
        list-cpcodes|lcp [options]                          List cpcodes for provided contract ID and group ID.
        show-ruletree|sr [options] <environment>            Fetch latest version of property rule tree for provided environment
        save|sv [options] <env>                             Save rule tree and hostnames for provided environment. Edge hostnames are also created if needed.
        create-edgehostnames|ceh [options] <env>            Check if any edge hostnames need to be created and proceed to create them.
        list-edgehostnames|leh [options]                    List edge hostnames available under provided contract ID and group ID (this could be a long list)
        list-status|lstat [options]                         Show status of each environment in a table
        promote|pm [options] <env> <notificationEmails...>  Promote (activate) an environment.
        check-promotion-status|cps [options] <env>          Check status of promotion (activation) of an environment.
        help [cmd]                                          display help for [cmd]

## Most useful commands in order of assumed importance

## <a name="createNew"></a>Create new project, also known as devops pipeline.
A Devops project consists of a project name and 2 or more environment names. In order to create a new project you also need to specify
a group Id, product Id and contract Id. These ids can be obtained by using the list-* commands. See below.

 
    $ devops-prov help np
    
    Usage: new-project|np [options] [environments...]
    
    Create a new project (pipeline) with provided attributes. This will also create one PM property for each environment.
    
    Options:
 
     --retry                        Assuming command failed last time during execution. Try to continue where it left off.
     -p, --project <projectName>    Project name
     -g, --groupId <groupId>        Group ID
     -c, --contractId <contractId>  Contract ID
     -d, --productId <productId>    Product ID
     -e, --propertyId [propertyId]  Use existing property as blue print for pipeline templates
     -n, --version [version]        Specify version of property, if omitted, use latest
     -h, --help                     output usage information
     
## <a name="merge"></a>Merge
Merge template json and environment variable values into a PM/PAPI rule tree JSON document, stored in dist folder in the current project folder.
This command also calls validate on the PAPI end point.

    $ devops-prov help m
    
    Usage: merge|m [options] <env>
    
    Merge template json and variable values into a PM/PAPI ruletree JSON document, stored in dist folder in the current project folder


    Options:

    -p, --project [projectName]  Project name
    -h, --help                   output usage information
     
## <a name="save"></a>Save
Store rule tree of provided environment. This will also perform validation.
     
    $ devops-prov help save
    
    Usage: save|sv [options] <env>
    
    Save rule tree and hostnames for provided environment. Edge hostnames are also created if needed.
    
    
    Options:

    -p, --project [projectName]  Project name
    -h, --help                   output usage information    
       
## <a name="promote"></a>Promote environment
Promote (activate property of) an environment.  

    $ devops-prov help promote
    
    Usage: promote|pm [options] <env> <notificationEmails...>
    
    Promote (activate) an environment.
    
    
    Options:

    -p, --project [projectName]  Project name
    -n, --network <network>      Network
    -h, --help                   output usage information

## <a name="checkPromote"></a>Check promotion status
Checks status of previously initiated promotion. If the underlying property activation is complete,
the environment is considered promoted. 
    
    $ devops-prov help cps
    
    Usage: check-promotion-status|cps [options] <env>
    
    Check status of promotion (activation) of an environment.
    
    
    Options:
    
        -p, --project [projectName]  Project name
        -h, --help                   output usage information
       
         
## <a name="setDefault"></a>Set Default
Sets default project and section name in client.properties. For all commands involving an existing project one can omit the
-p [project-name] option 

    $ devops-prov help sd

    Usage: set-default|sd [options]
    
    Set the default project and default section name used client.properties.

    Options:
    
        -p, --project <projectName>  Set default project name
        -i, --client-id <clientId>   Set default client id from client.properties file
        -h, --help                   output usage information


## <a name="showStatus"></a>Show status
Lists or shows status of each environment of the provided (or default) project. Output format is a table.

    devops-prov help lstat
    
    Usage: list-status|lstat [options]
    
    Show status of each environment in a table
    
    
    Options:

    -p, --project [projectName]  Project name
    -h, --help                   output usage information
         
## List contracts
List contracts available to client ID. The output is in form of a table.

    $ devops-prov help lc
    
    Usage: list-contracts|lc [options]
    
    List contracts available to client ID
    
    
    Options:

    -h, --help  output usage information
    
    
## List products
List products available under provided contract ID and client ID. The output is in form of a table.

    $ devops-prov help lp
    
    Usage: list-products|lp [options]
    
    List products available under provided contract ID and client ID
    
    
    Options:

    -c, --contractId <contractId>  Contract ID
    -h, --help                     output usage information

## List groups
List groups client ID has access to. The output is in form of a table.

    $ devops-prov help lg
    
    Usage: list-groups|lg [options]
    
    List groups client ID has access to
    
    
    Options:

    -h, --help  output usage information    

## List cpcodes.
List cpcodes for provided contract ID and group ID.
    $ devops-prov help lcp
    
    Usage: list-cpcodes|lcp [options]
    
    List cpcodes for provided contract ID and group ID.
    
    
    Options:

    -c, --contractId <contractId>  Contract ID
    -g, --groupId <groupId>        Group ID
    -h, --help                     output usage information
     
## List Edge hostnames
List edge hostnames available under provided contract ID and group ID (this could be a long list).

    $ devops-prov help leh
    
    Usage: list-edgehostnames|leh [options]
    
    List edge hostnames available under provided contract ID and group ID (this could be a long list)
    
    
    Options:

    -c, --contractId <contractId>  Contract ID
    -g, --groupId <groupId>        Group ID
    -h, --help                     output usage information
     
## Search
Searches for existing property by name. Does not support wild cards, the name needs to be exact. 

    $ devops-prov help s
 
    Usage: search|s [options] <name>
    
    Search for PM properties by name
    
    
    Options:

    -h, --help  output usage information     
     
## Set Prefixes
Set or unset id prefixes in responses. Instead of IDs with prefix like act_ACCT-ID or grp_2342 responses will only contain the id,
like ACCT-ID or just 2342. This should not matter to the end user for the most part since the SDK hides most of the 
details with the communication between client and REST end points. 
The value is stored with options of the currently used client id. 
If the users uses multiple client ids, they would have to call set-prefixes for each client id.
*Caution: this will also affect any other REST client implemented by user using the same client id!*


    $ devops-prov help sp
    
    Usage: set-prefixes|sp [options] <useprefix>
    
    Set or unset prefixes for the currently selected client ID


    Options:

    -h, --help  output usage information

## Set Rule Format
Sets the default rule format for creating new properties. This value is stored per client id. 
*Caution: this will also affect any other REST client implemented by user using the same client id!*
    
    $ devops-prov help srf
    
    Usage: set-ruleformat|srf [options] <ruleformat>
    
    Set ruleformat for the selected client ID


    Options:

    -h, --help  output usage information
    
## Show rule tree 
Download and print out the rule tree for provided environment under a project (default or provided by -p option).
For the most part this command is useless, since the rule tree is generated by the SDK and stored in the dist folder.
This command might get removed in the future or expanded in some way to make it more useful.
    
    $ devops-prov help show-ruletree
    
    Usage: show-ruletree|sr [options] <environment>
    
    Fetch latest version of property rule tree for provided environment
    
    
    Options:

    -p, --project [projectName]  Project name
    -h, --help                   output usage information

## Create Edge hostnames
This normally happens as part of save. Check if any edge hostnames need to be created and proceed to create them.
Not a very useful command.
    
    $ devops-prov help ceh
    
    Usage: create-edgehostnames|ceh [options] <env>
    
    Check if any edge hostnames need to be created and proceed to create them.
    
    
    Options:

    -p, --project [projectName]  Project name
    -h, --help                   output usage information
