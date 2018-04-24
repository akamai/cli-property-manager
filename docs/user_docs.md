# User Manual
## Overview
The DevOps Provisioning SDK is a client side application based on Akamai's PAPI Open API.
The SDK allows users to setup a DevOps pipeline (also called project), a chain of environments where 
the right most environment is considered the production environment.
Changes are supposed to flow from the left (development environments) to the right. 
All environments share a set of template files and a set of variable definitions. Each environment has a separate file 
representing variable values. End users are free to add or modify variable definitions and provide variable values for
each environment. 

A typical DevOps pipeline work flow would look like this:
1. Create new pipeline (project). Specify name of project and name and number of environments. This will create one PAPI 
property per environment under the hood. The naming convention of the property is "environment name"."project name"
1. Edit generated templates, variable definition and variable value files
1. Merge template and variable values into a PAPI rule tree document for an environment (start with the left most one) and validate
1. Save rule tree for environment
1. Promote changes for environment

Step 1. obviously only needs to be performed only once per pipeline. Step 2. and 3. are most likely repeated in a loop until all validation
errors are gone.

## Create new project 
Using the devops-prov CLI command users can [create a new project](cli_command_help.md#createNew) (DevOps pipeline). 
Here's basically what happens behind the scenes:
1. Setup of project folder structure, more to that below
1. Creation of first version of one property per environment. Naming schema for the property name is 
"environment name"."project name". 


### Project folder structure
After creating a project there should be the following directory structure

       project_name/
                   projectInfo.json
                   /cache
                   /dist
                   /environments
                        /environment1_name
                            envInfo.json
                            hostnames.json
                            variables.json
                        ...
                        variableDefinitions.json
                   /templates
                        main.json
                        compression.json
                        ....
                        static.json
                        
The directories and files have the following purpose:

Name | Function |
 ------------ | ----------- | 
projectInfo.json | Project specific data and metadata. Better not be edited by end users unless they know exactly what they are doing |
cache | Directory reserved for SDK used for storage of cached files | 
dist | Everything that gets generated and then shipped to backend via PAPI REST API |
environments | Folder containing environment specific information. One sub folder per environment |
envInfo.json | File managed by SDK containing all meta information about environment |
hostnames.json | Hostnames used for environment |
variableDefinitions.json | File containing variable definitions, name of a variable, type, default value. This file is used by all environments.|
templates | Folder containing template files. There is supposed to be one main template called "main" all the other files are either directly or indirectly included per #include directive into the main one.|

### projectInfo.json
Users don't need to concern themselves with this file. But it's good to know why it's there and what it does. Let's look at an example:

Example:

    {
        "productId": "Rich_Media_Accel",
        "contractId": "1-1TJZH5",
        "groupId": 15225,
        "environments": [
            "dev",
            "qa",
            "prod"
        ],
        "name": "example.com"
    } 

Basically all the parameters entered with the create new project command end up in this file. 

### Environment's envInfo.json
envInfo.json is maintained by the SDK. Users should not modify its content unless they really know what they are doing.
The file functions as a means to keep state locally. Currently there are no mechanisms in place that can guarantee that 
the client side state is consistent with the back-end state. This will be addressed in a future release of the SDK. 

Example:

    {
        "name": "qa",
        "propertyName": "qa.example.com",
        "propertyId": 433813,
        "latestVersionInfo": {
            "propertyVersion": 2,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2018-02-26T18:36:34Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "etag": "8a4e0d1f912b0bfcb7802672ce6ecadcc70e1ce6",
            "productId": "Rich_Media_Accel",
            "ruleFormat": "v2017-06-19"
        },
        "suggestedRuleFormat": "v2017-06-19",
        "environmentHash": "322a2a3ab5a8e0337c40189b7df4aadb5344dbc140738c7534de2f7c5c897da5",
        "ruleTreeHash": "ce96e3aa39dd27e07745f8ea2249b5e6806bbff563c842c7f9967bc3e3951ff0",
        "lastSavedHash": "3f55a6873f690280c440992317912383c32484c3a6fd1061e43bb896cdd59e5c",
        "lastSavedHostnamesHash": "c44bb57626e83ab49779ff5e62386162ef14f769c48b997596aeaa2034b3e2ea",
        "activeIn_STAGING_Info": {
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2018-02-23T16:51:24Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "ACTIVE",
            "etag": "4055d21f1bf325d792d8b6ab8f3e5c359ff8f6c7",
            "productId": "Rich_Media_Accel",
            "ruleFormat": "v2017-06-19"
        }
    }
    
### hostnames.json
Contains a list of hostname objects. 

Example:

    [
        {
            "cnameFrom": "qa.example.com",
            "cnameTo": "qa.example.com.edgesuite.net",
            "cnameType": "EDGE_HOSTNAME",
            "edgeHostnameId": 2787278
        }
    ]    
On project creation the SDK will add one hostname to the file. The naming schema is "environment name"."project name".
The edgeHostnameId is null at first. Edge hostname creation will be attempted during save operation. 
If the user want's to use an existing edge hostname, they need to set the cnameTo and edgeHostnameId accordingly.
The SDK only attempts to create edge hostnames when the edgeHostnameId is null.

### variableDefinitions.json
Declare all variables used throughout the project here. On project creation the SDK will insert 2-3 variable definitions 
for origin hostname, cpcode and sure route test object URL if applicable. 

Example:

    {
        "definitions": {
            "originHostname": {
                "type": "hostname",
                "default": null
            },
            "cpCode": {
                "type": "cpCode",
                "default": 560400
            }
        }
    }
   
### variables.json
Each environment has exactly one variables.json file. It contains the actual value for the environment the file represents.
The SDK will throw and error if there is a discrepancy between variableDefinitions.json and an environment's variables.json
such as a variable is declared but has not value assigned or a variable name is used in variables.json but is not declared in 
variableDefinitions.json

Example: 
    
    {
        "originHostname": "origin-qa.rmademo1.com",
        "cpCode": null
    }
    
### Templates
The templates to build the rule tree reside in the templates folder. There is one main template aptly called main.json.
This is the root document, all other templates are supposed to get included during merge based on #include statements.

Example:

    {
        "rules": {
            "name": "default",
            "children": [
                "#include:compression.json",
                "#include:static.json",
                ... more includes ...
                "#include:Image_Manager.json"
            ],
            "behaviors": [
                {
                    "name": "origin",
                    "options": {
                        "originType": "CUSTOMER",
                        "hostname": "${env.originHostname}",
                        "forwardHostHeader": "REQUEST_HOST_HEADER",
                        "cacheKeyHostname": "ORIGIN_HOSTNAME",
                        "httpPort": 80
                    }
                },
                {
                    "name": "cpCode",
                    "options": {
                        "value": {
                            "id": "${env.cpCode}"
                        }
                    }
                },
                ... more behaviors ... 
            ]
        }
    }    
    