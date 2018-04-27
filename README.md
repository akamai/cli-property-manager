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

The Promotional Deployment CLI lets you promote changes to Akamai properties across your local environments without manually updating each property on each environment. 

With this client-side application, you set up a pipeline, which is a linked and ordered chain of environments. A pipeline represents the order in which changes are deployed. A typical pipeline starts with local development environments, moves to local QA environments, then finishes with your production environment. The number of environments you deploy to depends on your organization’s particular needs.

**Note:** For information about all available CLI commands, see the [Promotional Deployment CLI Command Help](docs/cli_command_help.md). 

# Sample workflow

Here’s a typical workflow for Promotional Deployment pipelines once you install and configure the CLI:

1. Create new pipeline that aligns with your company’s release path by specifying the following: 

    * name of the pipeline.

    * account-specific information, like contract ID. The CLI includes commands for retrieving account-specific IDs. 

    * the names of each applicable environment.

    * (Optional) the ID of an existing property to use as a template for the pipeline. 
<br> 
**Note:** The new pipeline adds one new Akamai property for each environment. The naming convention of the property is `<environment_name>.<pipeline_name>`.  

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
`akamai install https://<githubusername>:<githubpasswd>@github.com/akamai/cli-promotional-deployment.git`
<br>For example: `akamai install https://John123:password234@github.com/akamai/cli-promotional-deployment.git`
<br>
**Note:** After the beta, the installation command will be `akamai install promotional-deployment`.

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

1. If creating a pipeline using an existing property as a template, complete these steps:

    1. Run this command to retrieve the property’s ID: `akamai pd search <propertyName>`

    1. Run this command to create the pipeline for an existing property:  `akamai pd new-project -c <contractId> -g <groupId> -d <productId> -p <pipelineName> -e <propertyId> <environment1_name environment2_name...>` 
    <br>For example: `akamai pd new-project -c 1-23ABC -g 12345 -d SPM -p MyPipeline123 -e 123 qa prod`

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

7. Edit `variableDefinitions.json` to identify attributes that differ across your environments. See 
[Update the variableDefinitions.json file](#update-the-variableDefinitions.json-file) for details.

8. In each environment-specific subdirectory under the `/environments` folder, edit these JSON files:                      

<table>
  <tr>
    <td>File</td>
    <td>Description</td>
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
Update `variableDefinitions.json` to identify attributes that differ across your environments. Once declared, you can use these attributes as variables in any of the templates.

As a general rule:

<table>
  <tr>
    <td>If an attribute has...</td>
    <td>Then...</td>
  </tr>
  <tr>
    <td>the same value across all environments.</td>
    <td>Provide the default value in <code>variableDefinitions.json</code>. <br> 
	You can also declare a new variable that shares the same value across all environments and enter that default value. <br>
	<b>Note:</b> You can still override the default value in an environment’s <code>variables.json</code> file.</td>
  </tr>
  <tr>
    <td>no default value across environments. Each environment uses a distinct value.</td>
    <td>Set the default to <code>null</code> and add the enviroment-specific value to each <code>variables.json</code> file. <br>
	For example, if the time-to-live (TTL) option in a caching behavior differs between environments, you’d declare a <code>ttl</code> variable in the <code>variableDefinitions.json</code> file. In the environments’ <code>variables.json</code> files, you’d set the value for that specific environment, like this: <code>"ttl": "1d"</code>. You’d then update the appropriate template files by entering the variable expression as the value: <code>"ttl": “${env.ttl}"</code>. 
</td>
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
This command takes the values in the templates and variable files, creates a new rule tree for the property, then saves and activates the rule tree on the selected Akamai network. 

3. Run the following command to make sure the pipeline reflects the latest activation status: `akamai pd cps <environment_name>`
<br> **Note:** Activation times vary, so you may want to wait several minutes before running this command.

4. Repeat steps 2 and 3 until you promote your changes to all environments in the pipeline. 

5. Verify that the updates made it to all environments in the pipeline: 
`akamai pd lstat -p <pipelineName>`

# Notice

This document is provided for informational purposes only and shall not be construed as providing any 
representation or guarantee as to the matters discussed. Akamai assumes no obligation to update or correct 
any matters discussed in the document.

