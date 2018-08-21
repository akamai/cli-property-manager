# Promotional Deployment CLI Beta

* [Overview](#overview)

* [Sample workflow](#sample-workflow)

* [Get started](#get-started)

* [Installing Promotional Deployment](#installing-promotional-deployment)

* [Create and set up a new pipeline](#create-and-set-up-a-new-pipeline)

    * [Update the variableDefinitions.json file](#update-the-variableDefinitions.json-file)

* [Save and promote changes through the pipeline](#save-and-promote-changes-through-the-pipeline)

* [Notice](#notice)

# Overview 

The Promotional Deployment CLI lets you leverage your configurations as code snippets and allows for the creation of a customized deployment pipeline defined by the user to automate the promotion of Akamai property changes across local environments. 


It focuses on the following primary benefits:
1. Creation of an automated build pipeline (linked chain of environments that changes can propagate through). A typical pipeline starts with local development environments, moves to QA and Integration environments, then finishes with your production environment. The number of environments you deploy to depends on your organization’s specific needs
2. Client side tokenization enables you to tokenize any attribute within their configuration file, vary this between environments, and automate your entire configuration build process
3. Local configuration snippets enables many teams to own and work on different parts of their configuration file independently in parallel
4. A client side validation engine enables users to instantly validate their configuration syntax locally 
5. A CLI based interface ensures portability across any type of environment

**Note:** For information about all available CLI commands, see the [Promotional Deployment CLI Command Help](docs/cli_command_help.md). 

# Stay up to date
To make sure you always use the latest version of the CLI, run this command: 
akamai update promotional-deployment

# Sample workflow

Here’s a typical workflow for Promotional Deployment pipelines once you install and configure the CLI:

1. Create new pipeline that aligns with your company’s release path by specifying the following: 

    * name of the pipeline.

    * account-specific information, like contract ID. The CLI includes commands for retrieving account-specific IDs. 

    * the names of each applicable environment. **Note:** The new pipeline adds one new Akamai property for each environment. The naming convention of the property is `<environment_name>.<pipeline_name>`.  

    * (Optional) the ID of an existing property to use as a template for the pipeline. 

2. In the pipeline’s environments folder, edit the `variableDefinitions.json` file to reflect the attributes shared across the pipeline. 

3. In the folders created for each environment, edit the `variables.json` file to reflect the settings specific to that environment.

4. In the `templates` folder, make your desired code change in the JSON-based configuration snippets.

5. Promote the change to the first environment. Promoting saves and activates your change, and propagates it to the next environment in your pipeline.

6. Verify that the change was successfully promoted to the first environment, and test the change.

7. Complete steps 5 and 6 for each additional environment in the pipeline.

# Get started 

In order to start using Promotional Deployment, you have to complete these tasks: 

* Verify you have a Unix-like shell environment, like those available with Mac OS X, Linux, and similar operating systems.

* Set up your OPEN API by [authorizing your client](https://developer.akamai.com/introduction/Prov_Creds.html) and [configuring your credentials](https://developer.akamai.com/introduction/Conf_Client.html) for the [Property Manager API (PAPI)](https://developer.akamai.com/api/luna/papi/overview.html). 

* Install the [Akamai CLI tool](https://github.com/akamai/cli).

* Install [Node Version Manager](http://nvm.sh/) (NVM), which lets you run applications with different node version requirements side by side.

* Install [Node.js](https://Nodejs.org/en/) version 8.0 Long Term Support (LTS). 

# Installing Promotional Deployment

You use the Akamai CLI tool to install the code. Once you complete the installation, you can use the `akamai pd` CLI commands.

Here’s how to install Promotional Deployment:

1. Create a project folder under your user home directory: `mkdir <folder_name>`. For example: 
`mkdir promotional_deployment`. <br> You’ll run Promotional Deployment CLI commands from this folder, which also contains the default values for the CLI and a separate subdirectory for each pipeline you create. 

2. During the beta period, run this installation command: 
`akamai install promotional-deployment`

3. Verify that the CLI is set up for your OPEN API permissions:

    1. Run this command to return the list of contracts you have access to: `akamai pd list-contracts`
    1. Verify that the list of contracts returned is accurate for your access level. 

# Create and set up a new pipeline

You use the CLI to create a new pipeline. Before creating a pipeline, you’ll need to specify group, product, and contract IDs, and two or more environment names. 

**Note:** You only have to create a pipeline once.

To create a new pipeline:  

1. Retrieve and store the contract, group, and product IDs for your pipeline:
<br> **Note:** The IDs returned depend on the permissions associated with your username.

    1. Run this command to list contract IDs (contractId):  `akamai pd list-contracts`

    2. Run this command to list group IDs (groupId):  `akamai pd list-groups`

    3. Run this command to list product IDs (productId): 
`akamai pd list-products -c <contractId>`

2. Determine which environments you want to include in your pipeline, and what you want to name them. The environment names you choose are used in the pipeline’s directory structure.

3. Choose a descriptive name for your pipeline. 

4. If creating a pipeline using a specific product as a template, run this command:  `akamai pd np -c <contractId> -g <groupId> -d <productId> -p <pipelineName> <environmentName1 environmentName2...>`  
<br> For example, if you want to base your pipeline on Ion, you'd enter a command like this: `akamai pd np -c 1-23ABC -g 12345 -d SPM -p MyPipeline123 qa prod`

1. If creating a pipeline using an existing property as a template, run this command:  `akamai pd np -p <pipelineName> -e <propertyId or propertyName> <environment1_name environment2_name...>` 
    <br>For example: `akamai pd np -p MyPipeline123 -e MyProperty qa prod`

6. Verify the pipeline folder structure, which will look something like this:

        pipeline_name/
            projectInfo.json
            /cache
            /dist
            /environments
                variableDefinitions.json
                /environment1_name
                    envInfo.json
                    hostnames.json
                    variables.json
                    ...
               /environment2_name
                    envInfo.json
                    hostnames.json
                    variables.json
                    ...
                   
            /templates
                main.json
                compression.json
                ...
                static.json

7. Edit `variableDefinitions.json` to declare variables that you can use in any of the templates. See 
[Update the variableDefinitions.json file](#update-the-variableDefinitions.json-file) for details.

8. In each environment-specific subdirectory under the `/environments` folder, edit these JSON files:                      

<table>
  <tr>
    <th>File</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>Hostnames.json</code></td>
    <td>Contains a list of hostname objects for this environment. 
<br> If the <code>edgeHostnameId</code> is <code>null</code>, the CLI creates edge hostnames for you. If you want to use an existing edge hostname, set both the <code>cnameTo</code> and <code>edgeHostnameId</code> values accordingly. </td>
  </tr>
  <tr>
    <td><code>Variables.json</code></td>
    <td>After editing your <code>variableDefinitions.json</code> file, update this file with the actual values for the environment, like content provider (CP) code, origin hostnames, and any additional variables you added.  
<br> <b>Note:</b> The CLI throws errors if there is a discrepancy between this file and the environment’s <code>variableDefinitions.json</code> file. For example, an error would occur if there’s a variable in the <code>variables.json</code> file that isn’t declared in the <code>variableDefinitions.json</code> file.
 </td>
  </tr>
</table>

## Update the variableDefinitions.json file 
Update `variableDefinitions.json` to declare variables that you can use in any of the templates.

As a general rule:

<table>
  <tr>
    <th>If an attribute has...</th>
    <th>Then...</th>
  </tr>
  <tr>
    <td>the same value across all environments and is already in the <code>variableDefinitions.json</code> file.</td>
    <td>Provide the default value in <code>variableDefinitions.json</code>. <br> 
	<b>Note:</b> You can still override the default value in an environment’s <code>variables.json</code> file.</td>
  </tr>
  <tr>
  <td>different values across environments and is already in the <code>variableDefinitions.json</code> file.</td>
    <td>Set the default to <code>null</code> in <code>variableDefinitions.json</code> and add the environment-specific value to each <code>variables.json</code> file.</td>
  </tr>
  <tr>
  <td>different values across environments and does not exist in the <code>variableDefinitions.json</code> file.</td>
  <td><ol><li>Parameterize it inside your template snippets using <code>“${env.&lt;variableName&gt;}"</code><br>For example: <code>"ttl": “${env.ttl}"</code></li>
  <li>Add it to <code>variableDefinitions.json</code> and set it to <code>null</code>. You can set the type to anything you choose.</li><li>Add it to your environment-specific <code>variables.json</code> files and set the individual values.
</li></ol></td>
  </tr>
  </table>

# Save and promote changes through the pipeline

Once you make changes to your pipeline, you can save and promote those changes to all environments in your pipeline. 

To save and promote changes:

1. Make your configuration change within the desired snippet inside your templates folder. This folder contains JSON snippets for the top-level rules in your property’s configuration. 

2. Promote the change to the first environment in your pipeline: `akamai pd promote -p <pipelineName> -n <network> <environment_name> <notification_emails>`. 
<br> The `<network>` value corresponds to Akamai’s staging and production networks. You can enter `STAGING` or `PROD` for this value.
<br>
For example: `akamai pd promote -p MyPipeline123 -n STAGING qa jsmith@example.com`
<br>
This command takes the values in the templates and variable files, creates a new set of rules for the property, then saves and activates the property version on the selected Akamai network. 

3. Once the activation is complete, run the following command to make sure the pipeline reflects the latest activation status: `akamai pd cs <environment_name>`
<br> **Note:** You should receive an email once activation is complete. Activation times vary, so you may want to wait several minutes before attempting to run this command.

4. Repeat steps 2 and 3 until you promote your changes to all environments in the pipeline. 

5. Verify that the updates made it to all environments in the pipeline: 
`akamai pd lstat -p <pipelineName>`

# Advanced Use Cases

# Reuse secure edge hostnames
When you first create a pipeline and run the akamai pd save command, it saves your pipeline and validates your pipeline’s configuration. In addition, this command creates edge hostnames for you, if the value of the  edgeHostnameId is null in the hostnames.json file. 

Promotional Deployment can only create non-secure (HTTP) edge hostnames. If you want to use a secure (HTTPS) edge hostname with your pipeline, you can add an existing secure edge hostname to your hostnames.json file. You can also create a new one in Property Manager and add it to your hostnames.json file. Just be aware that it might take a while before the system sees the new secure edge hostname.

# Parallel development with property snippets

The Promotional Deployment CLI retrieves your configuration locally and breaks it into a series of property snippets. These can be found under the ‘templates’ directory inside your pipeline directory structure.

Property snippets are client-side <includes> that enable different teams or developers to own different parts of the configuration file. By default, a configuration file is broken into pre-defined snippets but you can add, remove, and modify as needed.

Adding a new snippet
Assume you are looking to add a new snippet Catalog.json owned by your Catalog team. This team is looking to control timeouts for the Catalog App within your organization. This requires the following two steps:


1. Have a Catalog.json file ready and set permissions so only the Catalog team can modify this. The JSON snippet for this will be:

       {
       "name": "Catalog",
       "children": [],
       "behaviors": [
            {
               "name": "timeout",
               "options": {
               	"value": "5s"
               } } ],
       "criteria": [
            {
               "name": "path",
               "options": {
            	   "matchOperator": "MATCHES_ONE_OF",
            	   "values": [
                   	   "/catalog/*"
            	   ],
            	   "matchCaseSensitive": false
               } } ],
       "criteriaMustSatisfy": "all"
       }
    

2. Include this snippet in the main.json file found in your Snippets directory using “#include:Catalog.json”

As a best practice, the Catalog team works on this Snippet locally and copies it over the Snippets directory whenever a new change is ready. This unblocks other teams from deploying live changes. Once copied over, the team validates the syntax for any new change using ‘akamai pd save -p <pipeline_name> -e <environment_name>

The ‘children’ section of the main.json file can be used to add, remove, and control the order in which Snippets are executed. Sub-snippets can also be worked on by leveraging a ‘children’ section in individual include files. In our example above, the Catalog.json file can include a SubCatalog.json file with path match set to “/catalog/subcatalog/*”

# Working with Advanced and Read-Only Behaviors
If you want to use a configuration with advanced behaviors as a template, you need to convert all advanced behaviors to Custom Behaviors before creating the pipeline. If you want to use a configurations with read-only behaviors as a template, this needs to be unlocked before creating your pipeline.


# Notice

This document is provided for informational purposes only and shall not be construed as providing any 
representation or guarantee as to the matters discussed. Akamai assumes no obligation to update or correct 
any matters discussed in the document.

