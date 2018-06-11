## Classes

<dl>
<dt><a href="#DevOpsCommand">DevOpsCommand</a></dt>
<dd><p>DevOpsCommand is extending and overriding some aspects of Command.
In particular throwing exceptions if argument errors are detected rather than just
logging to console and exiting.</p>
</dd>
<dt><a href="#DevOps">DevOps</a></dt>
<dd><p>Class representing high-level functionality within the SDK.</p>
</dd>
<dt><a href="#ElContext">ElContext</a></dt>
<dd><p>Private class, helper for dealing with default and override variable values.</p>
</dd>
<dt><a href="#EL">EL</a></dt>
<dd><p>Small expression language parser. Supports:</p>
<ul>
<li>loading and inserting JSON snippet from other files</li>
<li>evaluation of ${...} expressions in string values. Just values, not keys.</li>
</ul>
</dd>
<dt><a href="#EdgeHostnameManager">EdgeHostnameManager</a></dt>
<dd><p>Manages creation and lookup of Edgehostnames.
This class is considered private and isn&#39;t exported.</p>
</dd>
<dt><a href="#Environment">Environment</a></dt>
<dd><p>represents environment in a devops pipeline</p>
</dd>
<dt><a href="#ExitError">ExitError</a></dt>
<dd><p>A bunch of error classes.
TODO: can we come up with a better hierarchy?</p>
</dd>
<dt><a href="#DebugLogger">DebugLogger</a></dt>
<dd><p>Uses debug for logging. Used by default.</p>
</dd>
<dt><a href="#ConsoleLogger">ConsoleLogger</a></dt>
<dd><p>Uses console.error and console.log
Used by CLI</p>
</dd>
<dt><a href="#Merger">Merger</a></dt>
<dd><p>Class representing merge operation.</p>
</dd>
<dt><a href="#OpenClient">OpenClient</a></dt>
<dd><p>Akamai OPEN client using Edgegrid</p>
</dd>
<dt><a href="#PAPI">PAPI</a></dt>
<dd><p>PAPI REST client</p>
</dd>
<dt><a href="#Project">Project</a></dt>
<dd><p>Represents the data model of the the pipeline (devops provisioning pipeline)
responsible for all storage operations within the pipeline.</p>
</dd>
<dt><a href="#RecordingClient">RecordingClient</a></dt>
<dd><p>Records request and response data to file.</p>
</dd>
<dt><a href="#ReplayClient">ReplayClient</a></dt>
<dd><p>Replay REST chatter by trying to find response in recorded file based on hash of request</p>
</dd>
<dt><a href="#Template">Template</a></dt>
<dd><p>This should be called TemplateFactory or similar.
Creates template files and variable definitions based on PAPI formatted pmData and
converter data file.</p>
</dd>
<dt><a href="#Utils">Utils</a></dt>
<dd><p>Should better be called FileUtils
read and write files, create directories, check if file exists.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#prepareEdgeGridConfig">prepareEdgeGridConfig(devopsSettings, dependencies)</a> ⇒ <code>Object</code></dt>
<dd></dd>
<dt><a href="#createDevOps">createDevOps(devopsHome, dependencies)</a> ⇒</dt>
<dd><p>Somewhat unsatisfying &quot;do your own dependency injection scheme&quot;</p>
</dd>
</dl>

<a name="DevOpsCommand"></a>

## DevOpsCommand
DevOpsCommand is extending and overriding some aspects of Command.
In particular throwing exceptions if argument errors are detected rather than just
logging to console and exiting.

**Kind**: global class  

* [DevOpsCommand](#DevOpsCommand)
    * [.optionMissingArgument(option, flag)](#DevOpsCommand+optionMissingArgument)
    * [.unknownOption(flag)](#DevOpsCommand+unknownOption)
    * [.variadicArgNotLastfunction(name)](#DevOpsCommand+variadicArgNotLastfunction)

<a name="DevOpsCommand+optionMissingArgument"></a>

### devOpsCommand.optionMissingArgument(option, flag)
`Option` is missing an argument, but received `flag` or nothing.

**Kind**: instance method of [<code>DevOpsCommand</code>](#DevOpsCommand)  
**Api**: private  

| Param | Type |
| --- | --- |
| option | <code>String</code> | 
| flag | <code>String</code> | 

<a name="DevOpsCommand+unknownOption"></a>

### devOpsCommand.unknownOption(flag)
Unknown option `flag`.

**Kind**: instance method of [<code>DevOpsCommand</code>](#DevOpsCommand)  
**Api**: private  

| Param | Type |
| --- | --- |
| flag | <code>String</code> | 

<a name="DevOpsCommand+variadicArgNotLastfunction"></a>

### devOpsCommand.variadicArgNotLastfunction(name)
Variadic argument with `name` is not the last argument as required.

**Kind**: instance method of [<code>DevOpsCommand</code>](#DevOpsCommand)  
**Api**: private  

| Param | Type |
| --- | --- |
| name | <code>String</code> | 

<a name="DevOps"></a>

## DevOps
Class representing high-level functionality within the SDK.

**Kind**: global class  

* [DevOps](#DevOps)
    * [.getDefaultProjectName()](#DevOps+getDefaultProjectName) ⇒ <code>\*</code>
    * [.extractProjectName(options, useDefault)](#DevOps+extractProjectName) ⇒ <code>null</code>
    * [.getDefaultProject()](#DevOps+getDefaultProject) ⇒ <code>\*</code>
    * [.createNewProject(createProjectInfo)](#DevOps+createNewProject) ⇒ <code>Promise.&lt;\*&gt;</code>
    * [.setupTemplate(createProjectInfo)](#DevOps+setupTemplate) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.setDefaultProject(projectName)](#DevOps+setDefaultProject)
    * [.setDefaultSection(section)](#DevOps+setDefaultSection)
    * [.setDefaultEmails(emails)](#DevOps+setDefaultEmails)
    * [.updateDevopsSettings(update)](#DevOps+updateDevopsSettings)
    * [.setPrefixes(usePrefixes)](#DevOps+setPrefixes) ⇒ <code>Promise.&lt;\*&gt;</code>
    * [.setRuleFormat(ruleformat)](#DevOps+setRuleFormat) ⇒ <code>Promise.&lt;(Promise\|\*)&gt;</code>
    * [.getEnvironment(projectName, environmentName)](#DevOps+getEnvironment)
    * [.merge(projectName, environmentName, validate)](#DevOps+merge)
    * [.save(projectName, environmentName)](#DevOps+save)
    * [.promote(projectName, environmentName, network, emails)](#DevOps+promote)
    * [.checkPromotions(projectName, envionmentName)](#DevOps+checkPromotions) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.createEdgeHostnames(projectName, envionmentName)](#DevOps+createEdgeHostnames) ⇒ <code>\*</code> \| <code>Promise.&lt;void&gt;</code>

<a name="DevOps+getDefaultProjectName"></a>

### devOps.getDefaultProjectName() ⇒ <code>\*</code>
retrieve default pipeline name from file.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  
<a name="DevOps+extractProjectName"></a>

### devOps.extractProjectName(options, useDefault) ⇒ <code>null</code>
Extract the desired pipeline name either from devopsSettings.json file or
from the -p [pipeline name] command line option

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| options | 
| useDefault | 

<a name="DevOps+getDefaultProject"></a>

### devOps.getDefaultProject() ⇒ <code>\*</code>
Creates Project instance representing default pipeline

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  
<a name="DevOps+createNewProject"></a>

### devOps.createNewProject(createProjectInfo) ⇒ <code>Promise.&lt;\*&gt;</code>
Creates a whole new Project (devops pipeline). Async since a bunch of REST calls are being made

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| createProjectInfo | 

<a name="DevOps+setupTemplate"></a>

### devOps.setupTemplate(createProjectInfo) ⇒ <code>Promise.&lt;void&gt;</code>
Create project template based on newly created properties (uses first environment property).
Uses PAPI formatted rule try to generate template.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| createProjectInfo | 

<a name="DevOps+setDefaultProject"></a>

### devOps.setDefaultProject(projectName)
Sets the default pipeline in devopsSettings.json

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type |
| --- | --- |
| projectName | <code>String</code> | 

<a name="DevOps+setDefaultSection"></a>

### devOps.setDefaultSection(section)
Sets the default section name of the client credentials file .edgerc

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| section | 

<a name="DevOps+setDefaultEmails"></a>

### devOps.setDefaultEmails(emails)
Sets the default notification emails passed to backend during promote

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| emails | 

<a name="DevOps+updateDevopsSettings"></a>

### devOps.updateDevopsSettings(update)
Writes update to devopsSettings.json

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type | Description |
| --- | --- | --- |
| update | <code>object</code> | updated settings |

<a name="DevOps+setPrefixes"></a>

### devOps.setPrefixes(usePrefixes) ⇒ <code>Promise.&lt;\*&gt;</code>
Sets the prefixes setting on the client settings associated with currently used client id.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Default |
| --- | --- |
| usePrefixes | <code>false</code> | 

<a name="DevOps+setRuleFormat"></a>

### devOps.setRuleFormat(ruleformat) ⇒ <code>Promise.&lt;(Promise\|\*)&gt;</code>
Sets default ruleformat in client settings associated with currently used client id.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Default |
| --- | --- |
| ruleformat | <code>latest</code> | 

<a name="DevOps+getEnvironment"></a>

### devOps.getEnvironment(projectName, environmentName)
Create Environment instance.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param |
| --- |
| projectName | 
| environmentName | 

<a name="DevOps+merge"></a>

### devOps.merge(projectName, environmentName, validate)
Merge variables with templates to construct the rule tree for passed pipeline and environment name

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| projectName | <code>string</code> |  |  |
| environmentName | <code>string</code> |  |  |
| validate | <code>boolean</code> | <code>true</code> | send ruletree to validation endpoint? |

<a name="DevOps+save"></a>

### devOps.save(projectName, environmentName)
Save ruletree to backend for a particular pipeline and environment name

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type |
| --- | --- |
| projectName | <code>string</code> | 
| environmentName | <code>string</code> | 

<a name="DevOps+promote"></a>

### devOps.promote(projectName, environmentName, network, emails)
Promote environment of a project

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type | Description |
| --- | --- | --- |
| projectName | <code>String</code> |  |
| environmentName | <code>String</code> |  |
| network | <code>String</code> | "STAGING" or "PRODUCTION" |
| emails | <code>Array.&lt;String&gt;</code> |  |

<a name="DevOps+checkPromotions"></a>

### devOps.checkPromotions(projectName, envionmentName) ⇒ <code>Promise.&lt;Object&gt;</code>
Check status of promotion of environment by checking a underlying pending activation.

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type |
| --- | --- |
| projectName | <code>String</code> | 
| envionmentName | <code>String</code> | 

<a name="DevOps+createEdgeHostnames"></a>

### devOps.createEdgeHostnames(projectName, envionmentName) ⇒ <code>\*</code> \| <code>Promise.&lt;void&gt;</code>
Try to use existing edge hostnames or create new ones

**Kind**: instance method of [<code>DevOps</code>](#DevOps)  

| Param | Type |
| --- | --- |
| projectName | <code>String</code> | 
| envionmentName | <code>String</code> | 

<a name="ElContext"></a>

## ElContext
Private class, helper for dealing with default and override variable values.

**Kind**: global class  
<a name="EL"></a>

## EL
Small expression language parser. Supports:
 - loading and inserting JSON snippet from other files
 - evaluation of ${...} expressions in string values. Just values, not keys.

**Kind**: global class  

* [EL](#EL)
    * [.parseObject(obj)](#EL+parseObject) ⇒ <code>\*</code>
    * [.parseString(stringValue, callback)](#EL+parseString)

<a name="EL+parseObject"></a>

### eL.parseObject(obj) ⇒ <code>\*</code>
Parse the whole JSON object

**Kind**: instance method of [<code>EL</code>](#EL)  

| Param |
| --- |
| obj | 

<a name="EL+parseString"></a>

### eL.parseString(stringValue, callback)
Parse String value

**Kind**: instance method of [<code>EL</code>](#EL)  

| Param |
| --- |
| stringValue | 
| callback | 

<a name="EdgeHostnameManager"></a>

## EdgeHostnameManager
Manages creation and lookup of Edgehostnames.
This class is considered private and isn't exported.

**Kind**: global class  
<a name="EdgeHostnameManager+createEdgeHostnames"></a>

### edgeHostnameManager.createEdgeHostnames() ⇒ <code>Promise.&lt;void&gt;</code>
create hostnames associated with property hostnames

**Kind**: instance method of [<code>EdgeHostnameManager</code>](#EdgeHostnameManager)  
<a name="Environment"></a>

## Environment
represents environment in a devops pipeline

**Kind**: global class  

* [Environment](#Environment)
    * [new Environment(envName, dependencies)](#new_Environment_new)
    * _instance_
        * [.create(isInRetryMode)](#Environment+create) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.getEnvironmentInfo()](#Environment+getEnvironmentInfo) ⇒ <code>Object</code>
        * [.getRuleTree()](#Environment+getRuleTree) ⇒ <code>Promise.&lt;\*&gt;</code>
        * [.loadTemplateConverterRules()](#Environment+loadTemplateConverterRules) ⇒ <code>\*</code>
        * [.createTemplate(ruleTree, isNewProperty, variableValuesOnly)](#Environment+createTemplate)
        * [.getVariables()](#Environment+getVariables) ⇒ <code>\*</code>
        * [.getHostnames()](#Environment+getHostnames) ⇒ <code>\*</code>
        * [.storeHostnames(hostnames)](#Environment+storeHostnames)
        * [.storePropertyData(data)](#Environment+storePropertyData) ⇒ <code>string</code>
        * [.loadPropertyData()](#Environment+loadPropertyData) ⇒ <code>object</code>
        * [.existsPropertyData()](#Environment+existsPropertyData) ⇒ <code>boolean</code>
        * [.checkForLastSavedValidationResults(envInfo, results)](#Environment+checkForLastSavedValidationResults)
        * [.checkForLastSavedHostnameErrors(envInfo, results)](#Environment+checkForLastSavedHostnameErrors)
        * [.merge()](#Environment+merge) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.save()](#Environment+save) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.promote(network, emails)](#Environment+promote) ⇒ <code>Promise.&lt;{envInfo: \*, pending: {network: \*, activationId: Number}}&gt;</code>
        * [.checkPromotions()](#Environment+checkPromotions) ⇒ <code>Promise.&lt;{}&gt;</code>
    * _static_
        * [._extractPropertyId()](#Environment._extractPropertyId)
        * [._extractEdgeHostnameId()](#Environment._extractEdgeHostnameId)
        * [._extractVersionId()](#Environment._extractVersionId)

<a name="new_Environment_new"></a>

### new Environment(envName, dependencies)

| Param | Type | Description |
| --- | --- | --- |
| envName | <code>string</code> | Name of environment |
| dependencies | <code>object</code> | project, getPapi, getTemplate, getMerger are mandatory and envInfo optional |

<a name="Environment+create"></a>

### environment.create(isInRetryMode) ⇒ <code>Promise.&lt;void&gt;</code>
Creates the property associated with this environment using PAPI
and stores the information in $DEVOPS_PROJECT_HOME/<pipeline_name>/<environment_name>/envInfo.json

**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param | Type | Description |
| --- | --- | --- |
| isInRetryMode | <code>boolean</code> | true if in retry mode. |

<a name="Environment+getEnvironmentInfo"></a>

### environment.getEnvironmentInfo() ⇒ <code>Object</code>
Provide env data for JSON conversion

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+getRuleTree"></a>

### environment.getRuleTree() ⇒ <code>Promise.&lt;\*&gt;</code>
Loads the rule tree for this environment property from PAPI backend

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+loadTemplateConverterRules"></a>

### environment.loadTemplateConverterRules() ⇒ <code>\*</code>
Retrieve product specific converter rule to convert PAPI ruletree into template and variable defs.

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+createTemplate"></a>

### environment.createTemplate(ruleTree, isNewProperty, variableValuesOnly)
Create template from ruleTree

**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ruleTree | <code>object</code> |  |  |
| isNewProperty | <code>boolean</code> | <code>true</code> | is this for a new property, defaults to true |
| variableValuesOnly | <code>boolean</code> | <code>false</code> | do we only want variables values but not the definitions (because they already exist) |

<a name="Environment+getVariables"></a>

### environment.getVariables() ⇒ <code>\*</code>
Return environment specific variable values

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+getHostnames"></a>

### environment.getHostnames() ⇒ <code>\*</code>
Return environment specific hostnames

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+storeHostnames"></a>

### environment.storeHostnames(hostnames)
Store hostnames into hostnames.json file

**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param |
| --- |
| hostnames | 

<a name="Environment+storePropertyData"></a>

### environment.storePropertyData(data) ⇒ <code>string</code>
Store ruletree in dist folder

**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param |
| --- |
| data | 

<a name="Environment+loadPropertyData"></a>

### environment.loadPropertyData() ⇒ <code>object</code>
Load ruletree from dist folder

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+existsPropertyData"></a>

### environment.existsPropertyData() ⇒ <code>boolean</code>
does ruletree file already exist?

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+checkForLastSavedValidationResults"></a>

### environment.checkForLastSavedValidationResults(envInfo, results)
**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param | Type | Description |
| --- | --- | --- |
| envInfo | <code>object</code> |  |
| results | <code>object</code> | optional, if not passed throw exception on validation errors |

<a name="Environment+checkForLastSavedHostnameErrors"></a>

### environment.checkForLastSavedHostnameErrors(envInfo, results)
**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param | Type | Description |
| --- | --- | --- |
| envInfo | <code>object</code> |  |
| results | <code>object</code> | optional, if not passed throw exception on validation errors |

<a name="Environment+merge"></a>

### environment.merge() ⇒ <code>Promise.&lt;void&gt;</code>
Merge tempate with environment specific variables.

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+save"></a>

### environment.save() ⇒ <code>Promise.&lt;void&gt;</code>
Save environment specific rule tree + hostnames. Runs merge first.

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment+promote"></a>

### environment.promote(network, emails) ⇒ <code>Promise.&lt;{envInfo: \*, pending: {network: \*, activationId: Number}}&gt;</code>
Promote environment to Akamai network by activating the underlying property

**Kind**: instance method of [<code>Environment</code>](#Environment)  

| Param | Type | Description |
| --- | --- | --- |
| network | <code>string</code> | needs to be exactly "STAGING" or "PRODUCTION" |
| emails | <code>list.&lt;string&gt;</code> | list of email addresses |

<a name="Environment+checkPromotions"></a>

### environment.checkPromotions() ⇒ <code>Promise.&lt;{}&gt;</code>
check for any pending promotions and if underlying activation became active change status

**Kind**: instance method of [<code>Environment</code>](#Environment)  
<a name="Environment._extractPropertyId"></a>

### Environment._extractPropertyId()
extracts property ID out of a create property response object.

**Kind**: static method of [<code>Environment</code>](#Environment)  
<a name="Environment._extractEdgeHostnameId"></a>

### Environment._extractEdgeHostnameId()
extracts edge hostname ID out of a create edge hostname response object.

**Kind**: static method of [<code>Environment</code>](#Environment)  
<a name="Environment._extractVersionId"></a>

### Environment._extractVersionId()
extracts version ID out of a create new version response object.

**Kind**: static method of [<code>Environment</code>](#Environment)  
<a name="ExitError"></a>

## ExitError
A bunch of error classes.
TODO: can we come up with a better hierarchy?

**Kind**: global class  
<a name="DebugLogger"></a>

## DebugLogger
Uses debug for logging. Used by default.

**Kind**: global class  
<a name="ConsoleLogger"></a>

## ConsoleLogger
Uses console.error and console.log
Used by CLI

**Kind**: global class  
<a name="Merger"></a>

## Merger
Class representing merge operation.

**Kind**: global class  

* [Merger](#Merger)
    * [.merge(filename)](#Merger+merge) ⇒ <code>\*</code>
    * [.checkVariables(variableValues, variableDefinitions)](#Merger+checkVariables)

<a name="Merger+merge"></a>

### merger.merge(filename) ⇒ <code>\*</code>
merge template with variables

**Kind**: instance method of [<code>Merger</code>](#Merger)  

| Param |
| --- |
| filename | 

<a name="Merger+checkVariables"></a>

### merger.checkVariables(variableValues, variableDefinitions)
Check if variables are properly declared and have assigned value
TODO: check for declared and valued variables that aren't used anywhere
TODO: check if variable type agrees with option type (difficult)

**Kind**: instance method of [<code>Merger</code>](#Merger)  

| Param |
| --- |
| variableValues | 
| variableDefinitions | 

<a name="OpenClient"></a>

## OpenClient
Akamai OPEN client using Edgegrid

**Kind**: global class  

* [OpenClient](#OpenClient)
    * [.prepare(method, path, body, headers)](#OpenClient+prepare) ⇒ <code>Object</code>
    * [.request(method, path, body, headers, callback)](#OpenClient+request) ⇒ <code>Promise</code>
    * [.requestRetry(method, path, body, headers, callback)](#OpenClient+requestRetry) ⇒ <code>Promise.&lt;\*&gt;</code>

<a name="OpenClient+prepare"></a>

### openClient.prepare(method, path, body, headers) ⇒ <code>Object</code>
Preprare request before sending it.

**Kind**: instance method of [<code>OpenClient</code>](#OpenClient)  

| Param |
| --- |
| method | 
| path | 
| body | 
| headers | 

<a name="OpenClient+request"></a>

### openClient.request(method, path, body, headers, callback) ⇒ <code>Promise</code>
Make REST request

**Kind**: instance method of [<code>OpenClient</code>](#OpenClient)  

| Param |
| --- |
| method | 
| path | 
| body | 
| headers | 
| callback | 

<a name="OpenClient+requestRetry"></a>

### openClient.requestRetry(method, path, body, headers, callback) ⇒ <code>Promise.&lt;\*&gt;</code>
TODO: do we really want to do this?
Under what circumstances should we retry?
400 response code? Maybe not.

**Kind**: instance method of [<code>OpenClient</code>](#OpenClient)  

| Param |
| --- |
| method | 
| path | 
| body | 
| headers | 
| callback | 

<a name="PAPI"></a>

## PAPI
PAPI REST client

**Kind**: global class  
<a name="PAPI+setClientSettings"></a>

### papI.setClientSettings(usePrefixes)
Set or unset PAPI id prefixes

**Kind**: instance method of [<code>PAPI</code>](#PAPI)  

| Param |
| --- |
| usePrefixes | 

<a name="Project"></a>

## Project
Represents the data model of the the pipeline (devops provisioning pipeline)
responsible for all storage operations within the pipeline.

**Kind**: global class  

* [Project](#Project)
    * [new Project(projectName, dependencies)](#new_Project_new)
    * [.getName()](#Project+getName) ⇒
    * [.exists()](#Project+exists) ⇒ <code>boolean</code>
    * [.createProjectFolders(productId, contractId, groupId, environmentNames)](#Project+createProjectFolders)
    * [.createProjectSettings()](#Project+createProjectSettings)
    * [.getStatus()](#Project+getStatus)
    * [.setupPropertyTemplate()](#Project+setupPropertyTemplate) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.getPropertyInfo(propertyId, version)](#Project+getPropertyInfo) ⇒ <code>Promise.&lt;\*&gt;</code>

<a name="new_Project_new"></a>

### new Project(projectName, dependencies)

| Param | Description |
| --- | --- |
| projectName |  |
| dependencies | devops: mandatory DevOps instance, elClass, utilsClass are optional. |

<a name="Project+getName"></a>

### project.getName() ⇒
**Kind**: instance method of [<code>Project</code>](#Project)  
**Returns**: Project Name  
<a name="Project+exists"></a>

### project.exists() ⇒ <code>boolean</code>
Does this project exist on the filesystem.

**Kind**: instance method of [<code>Project</code>](#Project)  
<a name="Project+createProjectFolders"></a>

### project.createProjectFolders(productId, contractId, groupId, environmentNames)
Setup pipeline and environments folders

**Kind**: instance method of [<code>Project</code>](#Project)  

| Param |
| --- |
| productId | 
| contractId | 
| groupId | 
| environmentNames | 

<a name="Project+createProjectSettings"></a>

### project.createProjectSettings()
Setup projectInfo.json file

**Kind**: instance method of [<code>Project</code>](#Project)  
<a name="Project+getStatus"></a>

### project.getStatus()
Get the project status, it retrieves project and environment details

**Kind**: instance method of [<code>Project</code>](#Project)  
<a name="Project+setupPropertyTemplate"></a>

### project.setupPropertyTemplate() ⇒ <code>Promise.&lt;void&gt;</code>
Setup templates and variable definitions based on a conversion instruction file
Each product needs its own set of rules.

**Kind**: instance method of [<code>Project</code>](#Project)  
<a name="Project+getPropertyInfo"></a>

### project.getPropertyInfo(propertyId, version) ⇒ <code>Promise.&lt;\*&gt;</code>
**Kind**: instance method of [<code>Project</code>](#Project)  

| Param |
| --- |
| propertyId | 
| version | 

<a name="RecordingClient"></a>

## RecordingClient
Records request and response data to file.

**Kind**: global class  
<a name="ReplayClient"></a>

## ReplayClient
Replay REST chatter by trying to find response in recorded file based on hash of request

**Kind**: global class  
<a name="Template"></a>

## Template
This should be called TemplateFactory or similar.
Creates template files and variable definitions based on PAPI formatted pmData and
converter data file.

**Kind**: global class  
<a name="Template+findIncludeNameFor"></a>

### template.findIncludeNameFor(ruleName)
this might need more work, we might want to replace things like quotes and other special characters

**Kind**: instance method of [<code>Template</code>](#Template)  

| Param |
| --- |
| ruleName | 

<a name="Utils"></a>

## Utils
Should better be called FileUtils
read and write files, create directories, check if file exists.

**Kind**: global class  
<a name="Utils+readJsonFile"></a>

### utils.readJsonFile(fullpath) ⇒
Reads JSON formatted file from disk.

**Kind**: instance method of [<code>Utils</code>](#Utils)  
**Returns**: JSON object  

| Param |
| --- |
| fullpath | 

<a name="prepareEdgeGridConfig"></a>

## prepareEdgeGridConfig(devopsSettings, dependencies) ⇒ <code>Object</code>
**Kind**: global function  

| Param |
| --- |
| devopsSettings | 
| dependencies | 

<a name="createDevOps"></a>

## createDevOps(devopsHome, dependencies) ⇒
Somewhat unsatisfying "do your own dependency injection scheme"

**Kind**: global function  
**Returns**: factory object  

| Param |
| --- |
| devopsHome | 
| dependencies | 


* [createDevOps(devopsHome, dependencies)](#createDevOps) ⇒
    * [~getOrCreate(name, createFunction)](#createDevOps..getOrCreate) ⇒ <code>\*</code>
    * [~getProject(projectName, expectExists)](#createDevOps..getProject) ⇒ <code>\*</code>

<a name="createDevOps..getOrCreate"></a>

### createDevOps~getOrCreate(name, createFunction) ⇒ <code>\*</code>
do we really need this if we just cache papi, since every other component
depends on calling context.

**Kind**: inner method of [<code>createDevOps</code>](#createDevOps)  

| Param |
| --- |
| name | 
| createFunction | 

<a name="createDevOps..getProject"></a>

### createDevOps~getProject(projectName, expectExists) ⇒ <code>\*</code>
Create and return Project instance.
Throws error if expectExists === true but pipeline doesn't exist.

**Kind**: inner method of [<code>createDevOps</code>](#createDevOps)  

| Param | Default |
| --- | --- |
| projectName |  | 
| expectExists | <code>true</code> | 

