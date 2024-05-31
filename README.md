# Akamai Property Manager CLI

* [Overview](#overview)

* [Available commands](#available-commands)

* [Stay up to date](#stay-up-to-date)

* [Upgrade to this version](#upgrade-to-this-version)

* [Concepts](#concepts)

* [Workflows](#workflows)

    * [Property management with snippets workflow](#property-management-with-snippets-workflow)

    * [Akamai Pipeline workflow](#akamai-pipeline-workflow)    

* [Get started](#get-started)

* [Install the Akamai Property Manager CLI](#install-the-akamai-property-manager-cli)

* [Set up property snippets](#set-up-property-snippets)

    * [Create snippets of your Property Manager configuration](#create-snippets-of-your-property-manager-configuration)

    * [Add a new snippet](#add-a-new-snippet)

* [Create and set up a new pipeline](#create-and-set-up-a-new-pipeline)

    * [Create a new pipeline](#create-a-new-pipeline)

    * [Update the variableDefinitions file](#update-the-variabledefinitions-file)

	* [Common product IDs](#common-product-ids)

    * [Save and promote changes through the pipeline](#save-and-promote-changes-through-the-pipeline)

* [How you can use this CLI](#how-you-can-use-this-cli)

    * [Retrieve the latest version of the property from Property Manager](#retrieve-the-latest-version-of-the-property-from-property-manager)

    * [Retrieve a specific rule from Property Manager](#retrieve-a-specific-rule-from-property-manager)

    * [Use Property Manager user variables](#use-property-manager-user-variables)

    * [Use attributes that vary across environments with Akamai Pipeline](#use-attributes-that-vary-across-environments-with-akamai-pipeline)

    * [Work with edge hostnames](#work-with-edge-hostnames)

        * [Create edge hostnames](#create-edge-hostnames)

        * [Reuse edge hostnames](#reuse-edge-hostnames)

        * [Use multiple edge hostnames](#use-multiple-edge-hostnames)

        * [Domain suffixes for edge hostnames](#domain-suffixes-for-edge-hostnames)

    * [Work with advanced behaviors](#work-with-advanced-behaviors)

    * [Work with CP codes](#work-with-cp-codes)

    * [Work with multiple accounts](#work-with-multiple-accounts)

    * [Use existing properties in your pipeline](#use-existing-properties-in-your-pipeline)

* [Notice](#notice)

# Overview

Property Manager CLI v2 lets you make configuration changes locally and automate the deployment of Akamai property changes across one or many local environments. It replaces [Property Manager CLI v1](https://github.com/akamai/cli-property), which has been deprecated.

It comes with these command groupings:

* **`akamai property-manager`.** Use to create, update, and manage Property Manager configurations locally.

* **`akamai pipeline`.** Use the Akamai Pipeline, which lets you make configuration changes within an automated pipeline of up to 30 environments.  

See [Workflows](#workflows) for more information.

With this client-side application, you can:

* **Better manage updates to your properties.** You can break down your property configuration locally into small, client-side files, or snippets. For example, you can have separate snippets for individual rules and behaviors. Different teams can own specific snippets and independently update Property Manager. Managing your properties this way gives you more flexibility and can help reduce merge conflicts.

* **Automate a pipeline.** With the CLI's Akamai Pipeline functionality, you can create a chain of environments that suit your organization's specific needs. A typical pipeline starts with one-to-many development and test environments and completes when the code reaches your production environment.

* **Validate.** This CLI uses Property Manager validation before deploying changes.

* **Customize variable definitions between environments.** If you want to use one variable value in a development environment and try out a different value in a test environment, you can add a [custom variable](#using-property-manager-user-variables) to your Property Manager CLI template files.

# Available commands

Want to see all available CLI commands? See this [help for Property Manager CLI commands](docs/cli_pm_commands_help.md) and this [help for Akamai Pipeline commands](docs/pipeline_commands_help.md).

# Stay up to date

To make sure you always use the latest version of the Property Manager CLI, run this command:
`akamai update property-manager`.

See the [Property Manager release notes](https://learn.akamai.com/en-us/release_notes/core_features/property_manager_10/) page to review the latest updates for this CLI.

# Upgrade to this version

The first version of this CLI ([cli-property](https://github.com/akamai/cli-property)), has been deprecated. Review [Upgrade to the Latest Property Manager CLI](docs/upgrade.md) before using this latest version ([cli-property-manager](https://github.com/akamai/cli-property-manager)).

# Concepts

To learn more about the concepts behind this CLI and the Property Manager API (PAPI), see the PAPI [Overview](https://developer.akamai.com/api/core_features/property_manager/vlatest.html#overview) section.

# Workflows

The Property Manager CLI lets you perform:

* **Property management with snippets.** Use this workflow to make configuration changes for a property locally. With it, you can break down parts of your Propery Manager configuration into smaller files called snippets. Different teams own specific parts of the configuration, and deploy updates without waiting for others.

* **Akamai Pipeline.** Use this workflow to set up configuration templates and create an automated pipeline. You use the pipeline to deploy Property Manager changes to your various environments.

## Property management with snippets workflow

Here’s a typical workflow when you want to break your Property Manager configuration into separate rules-based files, or snippets:

1. [Install and configure the CLI.](#get-started)

1. Make some decisions:

    * Do you want to import an existing property in Property Manager locally, create a new property from scratch, or use an existing property as a template?

    * How do you want to divide up the configuration? By default, the CLI creates a separate template, or snippet, for each top level rule in your configuration. You can add, remove, or modify snippets.

    * Do you need any new supporting processes? For example, if different teams are involved, how will you manage ownership of the different templates?

1. Import an existing property by running the `akamai property-manager import --network <Optional: network> --propver <Optional: propver>` command. This creates a local instance of your configuration. You can also create a new property if needed.

1. Verify that the `/config-snippets` folder contains a separate JSON-based configuration snippet for each rule in your property configuration. <br> In this folder, the `main.json` file ties all the snippets together. It lists the available snippets and contains the local permissions for each snippet.

1. Edit the snippets as needed to reflect the rule changes you want to deploy. <br> If another team owns a snippet, once they make their changes locally, they can copy it into the `/config-snippets` folder.

1. Run the `akamai property-manager activate` command to activate the latest version of the property. This command syncs the local changes in your `/config-snippets` directory to the Akamai network. Once activation is complete, you can verify changes in the Property Manager UI.

## Akamai Pipeline workflow

Here’s a typical workflow for using Akamai Pipeline:

1. [Install and configure the CLI.](#get-started)

1. Make some decisions:

    * Do you want to use an existing property or a specific product as a template for your pipeline?

    * Which of your environments do you want to include? These environments are often properties that have a lot in common. For example, your

    * What do you want to call your pipeline?

2. Create a new pipeline based on your decisions. If you’re using an existing property as a template, you’ll need the property ID or name. If you’re using a product as a template, you’ll need account information, like the contract ID. The CLI includes commands for retrieving account-specific IDs. <br>

	**Note:** The new pipeline adds one new Akamai property for each environment. The naming convention of the property is `<environment_name>.<pipeline_name>`.   

3. In the pipeline’s `environments` folder, edit the `variableDefinitions.json` file to set the attributes shared across the pipeline.

4. In the folders created for each environment, edit the `variables.json` file to reflect the settings specific to that environment.

5. In the `templates` folder, make your desired code change in the JSON-based configuration snippets.

6. Promote the change to the first environment. Promoting saves and activates your change, and propagates it to the next environment in your pipeline.

7. Verify that the change was successfully promoted to the first environment, and test the change.

8. Complete steps 6 and 7 for each additional environment in the pipeline.

# Get started

In order to start using Akamai Pipeline, complete these tasks:

* Verify you have a Unix-like shell environment, like those available with Mac OS X, Linux, and similar operating systems.

* Set up your credential files as described in [Get Started with APIs](https://learn.akamai.com/en-us/learn_akamai/getting_started_with_akamai_developers/developer_tools/getstartedapis.html), and add the `Property Manager (PAPI)` service.

* Install the [Akamai CLI tool](https://github.com/akamai/cli). Before starting this installation, verify that the `.edgerc` file you set up in the previous step contains a token in the `[papi]` section.

* Install [Node Version Manager](http://nvm.sh/) (NVM), which lets you run applications with different node version requirements side by side.

* Install the Long Term Support (LTS) version of [Node.js](https://Nodejs.org/en/). Here are the installation commands to run:

    ```
    nvm install --lts
    nvm use --lts
    ```

# Install the Akamai Property Manager CLI

You use the Akamai CLI tool to install the Property Manager CLI code. Here’s how:

1. Under your user home directory create a project folder: `mkdir <folder_name>`. For example:
`mkdir akamai_pipeline`. <br> You’ll run Property Manager CLI commands from this folder, which also contains the default values for the CLI and a separate subdirectory for each pipeline you create.

2. Run the installation command: `akamai install property-manager`

3. Verify that the CLI is set up for your OPEN API permissions:

    1. Run this command to return the list of contracts you have access to:
            `akamai property-manager list-contracts`

    1. Verify that the list of contracts returned is accurate for your access level.

4. Continue by either [creating snippets for property management](#set-up-property-snippets) or [setting up a new pipeline](#create-and-set-up-a-new-pipeline).


# Set up property snippets

Create your local client side snippets to let different teams own different parts of your property configuration.

## Create snippets of your Property Manager configuration

1. Select which property configuration you want to create a local instance of.

1. Determine how to handle any [custom user variables](#using-property-manager-user-variables).

1. Run the `akamai property-manager import --network <Optional: network> --propver <Optional: propver>` command to create a local instance of your Property Manager configuration.

1. In your project directory structure, navigate to the new `config-snippets` folder. <br> This folder contains a separate JSON-based configuration snippet for each rule in your property configuration.

1. Verify the folder structure, which will look something like this:

        project_name/
            /config-snippets
                main.json
                compression.json
                static.json
				cloudlets.json
                ...

    Each snippet represents one of the property's child rules.		

1. If needed, add or edit snippets to support your organization's development structure. <br> Say, you have a `cloudlets.json` snippet that only includes Edge Redirector. Since Marketing owns this Cloudlet, change the filename to `mkt-EdgeRedirect.json` to note the owner and the application the rule is for.  

1. Open the `main.json` file, which corresponds to the property's default rule. Edit the rule values as needed, and update the `children` array to reflect any snippet name changes, [additions](#add-a-new-snippet), or deletions.  

1. If required, set up local permissions for each JSON snippet.

1. Run the `akamai property-manager activate` command to activate your changes. <br> It's a good practice to test your changes before activating on production.

1. If you'd like, verify your changes in the Property Manager UI.

## Add a new snippet

If you want to add a new snippet to your property configuration:

1. Create a JSON file for the new snippet that represents a [Property Manager rule](https://developer.akamai.com/api/core_features/property_manager/v1.html#rule), including any child rules. <br> For example:

	```
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
	```

1. Open the `main.json` file.

1. Add the snippet to the `children` object:

    ```
	"rules": {
			"name": "default",
			"children": [
				"#include:Cache_extensions.json",
				"#include:Catalog.json",
				"#include:Furniture.json",
			    "#include:Clothing.json",
				],
			"Behaviors": [
			…
			… ],
			}
    ```

1. Save your changes.

1. Run the `akamai property-manager activate` command to activate your changes.


# Create and set up a new pipeline

You can use the CLI to create a new pipeline. Before creating any type of pipeline, you’ll need the names of 1 to 30 environments that you want to include. If you're using a product as a template, you'll also need group, product, and contract IDs. If you're using a property as a template, you'll need either the property name or ID.

**Note:** You only have to create a pipeline once.

## Create a new pipeline

To create a new pipeline:  

1. Retrieve and store the contract, group, and product IDs for your pipeline:

    1. Run this command to list contract IDs (`contractId`):  `akamai pipeline list-contracts`

    2. Run this command to list group IDs (`groupId`):  `akamai pipeline list-groups`

    3. Run this command to [list product IDs](#common-product-ids) (`productId`):
            `akamai pipeline list-products -c <contractId>`

	**Note:** The IDs returned depend on your user permissions.

2. Determine which environments to include in your pipeline, and what you want to name them. The environment names you choose are used in the pipeline’s directory structure.

3. Choose a unique, descriptive name for your pipeline to avoid duplicate property names. <br> When creating the pipeline, the CLI adds the pipeline name as a suffix to each property created. So, if your pipeline is `example.com`, and your environments are `dev`, `qa`, and `www`, the new properties will be `dev.example.com`, `qa.example.com`, and `www.example.com`. You want to be sure you don't have any existing properties with these names.

4. If creating a pipeline using a [specific product](#common-product-ids) as a template, run this command:  
        `akamai pipeline new-pipeline -c <contractId> -g <groupId> -d <productId> -p <pipelineName> <environmentName1 environmentName2...>`

    For example, if you want to base your pipeline on Ion (`SPM`), you'd enter a command like this:
      `akamai pipeline new-pipeline -c 1-23ABC -g 12345 -d SPM -p MyPipeline123 qa prod`

5. If creating a pipeline using an existing property as a template:

    1. Determine how to handle any [custom user variables](#using-property-manager-user-variables).

    2. Run this command:  
       `akamai pipeline new-pipeline -p <pipelineName> -e <propertyId or propertyName> <environment1_name environment2_name...>`

    For example: `akamai pipeline new-pipeline -p MyPipeline123 -e www.example.com qa prod`

6. Verify the pipeline folder structure, which will look something like this:

    ```
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
    ```

7. Edit `variableDefinitions.json` to declare variables that you can use in any of the templates. <br> See
[Update the variableDefinitions.json file](#update-the-variabledefinitions-file) for details.

8. In each environment-specific subdirectory under the `/environments` folder, edit these JSON files:                      

<table>
  <tr>
    <th>File</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>hostnames.json</code></td>
    <td>Contains a list of hostname objects for this environment.
<br> If the <code>edgeHostnameId</code> is <code>null</code>, the CLI creates edge hostnames for you. If you want to use an existing edge hostname, set both the <code>cnameTo</code> and <code>edgeHostnameId</code> values accordingly. </td>
  </tr>
  <tr>
    <td><code>variables.json</code></td>
    <td>After editing your <code>variableDefinitions.json</code> file, update this file with the actual values for the environment. You'll likely need to update the content provider (CP) code, origin hostnames, and any additional variables you added.  
<br> <b>Note:</b> The CLI throws errors if there is a discrepancy between this file and the environment’s <code>variableDefinitions.json</code> file. For example, an error occurs if the <code>variables.json</code> file contains a variable that isn’t declared in the <code>variableDefinitions.json</code> file.
 </td>
  </tr>
</table>

## Update the variableDefinitions file
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
  <td><ol><li>Make a parameter for it inside your template snippets using <code>“${env.&lt;variableName&gt;}"</code><br>For example: <code>"ttl": “${env.ttl}"</code></li>
  <li>Add it to <code>variableDefinitions.json</code> and set it to <code>null</code>. You can set the type to anything you choose.</li><li>Add it to your environment-specific <code>variables.json</code> files and set the individual values.
</li></ol></td>
  </tr>
  </table>

## Common product IDs
If creating a new pipeline based on a product template, you’ll need to know your product ID. Here are some of the more commonly-used ones:

<table>
  <tr>
    <th>Product</th>
    <th>Code</th>
  </tr>
  <tr>
    <td>Ion</td>
    <td>SPM</td>
  </tr>
  <tr>
    <td>Dynamic Site Accelerator</td>
    <td>Site_Accel</td>
  </tr>
  <tr>
    <td>Rich Media Accelerator</td>
    <td>Rich_Media_Accel</td>
  </tr>
  <tr>
    <td>Web Application Accelerator</td>
    <td>Web_App_Accel</td>
  </tr>  
</table>

If you don’t see your product code, run this command to return the product IDs available for your account:
`akamai pipeline list-products -c <contractId>`  

## Save and promote changes through the pipeline

Once you make changes to your pipeline, you can save and promote those changes to all environments in your pipeline.

To save and promote changes:

1. Make your configuration change within the desired snippet inside your `templates` folder. This folder contains JSON snippets for the top-level rules in your property’s configuration.

2. Optionally, update the property files to reflect your changes without saving to Property Manager:
        `akamai pipeline merge -p <pipelineName> <environment_name>`

3. Save your changes, validate your configuration, and create a new property version:
        `akamai pipeline  save -p <pipelineName> <environment_name>`

4. Promote the change to the environment you want to update:
        `akamai pipeline  promote -p <pipelineName> -n <network> <environment_name> -e <notification_emails>`

    The `<network>` value corresponds to Akamai’s staging and production networks. Enter either `STAGING` or `PROD` for this value. For example:
        `akamai pipeline  promote -p MyPipeline123 -n STAGING -e jsmith@example.com qa`

    When run, `promote` merges the template and variables files, saves any changes to Property Manager, and
    activates the property version on the selected Akamai network. The `-e` lets you send notification emails to the
	email addresses you enter. If you don't use `-e`, the CLI doesn't send email updates unless you added default addresses with the `set-default` command.

    **Note:** You should receive an email once activation is complete. Activation times vary, so you may want to wait several minutes before attempting to run this command.

5. Repeat steps 2 through 4 until you promote your changes to all environments in the pipeline.

6. Verify that the updates made it to all environments in the pipeline:
        `akamai pipeline lstat -p <pipelineName>`

# How you can use this CLI

Here are some ways you can use the Property Manager CLI to meet your business needs.

## Retrieve the latest version of the property from Property Manager

If you also use the Property Manager UI, make sure your client side files are in sync with the latest property version on the network.

To retrieve all updates from the latest or specific property version, run this command: `akamai property-manager update-local -p <property_name> --network <Optional: network> --propver <Optional: propver>`. <br> The `update-local` command overrides any locally-saved configuration version with the latest or specified property version.

## Retrieve a specific rule from Property Manager

You may want to manually retrieve the new rules from the Property Manager UI without updating all of your local snippets.

To get the JSON syntax for these rules, open the property version in the Property Manager application, select a rule, and click **View Rule JSON** to display the syntax. You can then copy the JSON and [create a new snippet](#add-a-new-snippet) for the rule.

## Use Property Manager user variables

Some Property Manager behaviors, like Origin Server [`origin`](https://developer.akamai.com/api/core_features/property_manager/v2018-02-27.html#origin), let you define custom user variables for certain settings.

Before using a property with this CLI, see whether it contains custom variables. If it does, review these custom variables in the Property Manager application and adjust as needed.
When you’re ready to create the pipeline or local configuration, use the `--variable-mode user-var-value` option with one of these values:

* `user-var-value`. Creates local versions of the custom variables that the CLI can use.

* `no-var`. Does not create local versions of the custom variables.

If you’re creating a new property from scratch, you can also use the `default` value, which replaces parts of the template configuration, like the `origin` behavior, with Property Manager’s default settings.

If you've already created a pipeline and want declare a new user variable, you can revise the `../environments/variableDefinitions.json` and `../environments/{environment}/variables.json` files using the [syntax for Property Manager variables](https://developer.akamai.com/api/core_features/property_manager/v1.html#variables).

## Use attributes that vary across environments with Akamai Pipeline

Property Manager CLI is a client-only library. With it you can create tokens for any attribute in your configuration. Each environment can then have different values for that attribute.

Say you want a behavior enabled on one of your three environments for testing purposes. How can you set this up for your pipeline?

Many behaviors have a boolean `enabled` field, which is essentially an on-off switch. Here’s an example for the Forward Rewrite Cloudlet:

```
{
  "name": "forwardRewrite",
  "options": {
    "enabled": true,
    "cloudletPolicy": {
      "id": 12345,
      "name": "some policy name"
    }
  }
}
```

We need to change the value of `enabled` to a variable. We'll do this in a few steps:


1. Pick a variable name, like `forwardRewriteEnabled`, and add it to the `variableDefinitions.json` file:

    ```
    {
        "definitions": {
            "forwardRewriteEnabled": {
                "type": "boolean",
                "default": true
            },
    ...
       }
    }
    ```

1. In the `variables.json` file for each environment, add a new JSON variable with a valid value. In this example, the variable needs a boolean value:

    ```
    {
    "forwardRewriteEnabled": false,
    ...
    }
    ```

1. In the `templates` folder, update the JSON file containing the Forward Rewrite behavior by replacing the boolean value with the variable expression using the `env` prefix:

1. In the `templates` folder, open the JSON file containing the Forward Rewrite behavior.

1. Replace the boolean value with the variable expression using the `env` prefix, which represents the current environment:

    ```
    {
      "name": "forwardRewrite",
      "options": {
        "enabled": "${env.forwardRewriteEnabled}", //notice type string!
        "cloudletPolicy": {
          "id": 12345,
          "name": "some policy name"
        }
      }
    }
    ```
1. Merge, save, and promote your change as needed.

## Work with edge hostnames

The Property Manager CLI lets you create and reuse edge hostnames for your properties. It supports Standard Transport Layer Security (TLS), Enhanced TLS, and shared certificate edge hostnames.

### Create edge hostnames

With this CLI, you can create Standard Transport Layer Security (TLS), Enhanced TLS, and shared certificate edge hostnames. To create secure TLS hostnames, you can use a CPS managed certificate or a default certificate, one managed by Property Manager.

#### Use a CPS managed certificate

When you first create a pipeline, it sets up a directory structure that includes JSON templates for each environment in the pipeline.

To create an edge hostname, follow these steps:

1. In the `hostname.json` template file, make sure the `edgeHostnameId` is set to `null`. It's `null` by default.

1. Check the entry in the `cnameTo` field. For a new hostname, make sure no existing hostnames already have the name and include the correct [domain suffix](#domain-suffixes-for-edge-hostnames). To [reuse](#reusing-edge-hostnames) an existing hostname, make sure `cnameTo` matches the hostname name exactly and also enter the `id`.

1. If you want to create an edge hostname that is secure, you'll also have to add an enrollment ID to the `hostname.json` file:

    1. Retrieve the `enrollment-id` from the [CPS CLI](https://github.com/akamai/cli-cps).

    1. Add a `certEnrollmentId` member to the `hostname.json` file and enter the `enrollment-id` as the value.

1. Run the `akamai pipeline save` command.

When you run the command, the CLI will save your pipeline, validate its configuration, and create edge hostnames for you.

Here's an example of what the entry in the `hostname.json` file might look like before you run the `akamai pipeline save` command:

```
   [
		{
			"cnameFrom": "www.example-1.com",
			"cnameTo": "www.example-1.edgekey.net",
			"certEnrollmentId": "12356666",
			"cnameType": "EDGE_HOSTNAME",
			"edgeHostnameId": null
		}
	]
```

####Use a default certificate

When you first create a pipeline, it sets up a directory structure that includes JSON templates for each environment in the pipeline.

To create an edge hostname, follow these steps:

1. In the `hostname.json` template file, make sure the `edgeHostnameId` is set to `null`. It's `null` by default.

1. Check the entry in the `cnameTo` field. For a new hostname, make sure no existing hostnames already have the name and include the correct [domain suffix](#domain-suffixes-for-edge-hostnames). To [reuse](#reusing-edge-hostnames) an existing hostname, make sure `cnameTo` matches the hostname name exactly and also enter the `id`.

1. To create a secure edge hostname using a default certificate, set the `certProvisioningType` to `DEFAULT`.

    Here's an example of what the entry in the `hostname.json` file might look like before you run the `akamai pipeline save` command:


    ```
       [
        {
          "cnameFrom": "www.example.com",
          "cnameTo": "www.example.edgekey.net",
          "certProvisioningType": "DEFAULT",
          "cnameType": "EDGE_HOSTNAME",
          "edgeHostnameId": null
        }
      ]
    ```

1. Run the `akamai pipeline save` command.

    When you run the command, the CLI will save your pipeline, validate its configuration, and create edge hostnames for you.



1. In the response, find the `CertStatus`.

1. Default certificates use domain validation to validate the certificate. The response will return a `hostname` and a `target` that you will use to create a CNAME record in your DNS to validate your ownership of the hostname’s domain.

    Here's an example of the part of the response that contains the `CertStatus`:

    ```
    [
        {
            "certStatus": {
                "validationCname": {
                    "hostname": "_acme-challenge.www.example.com",
                    "target": "{token}.www.example.com.akamai-domain.com"
                },
                "staging": [
                    {
                        "status": "PENDING"
                    }
                ],
                "production": [
                    {
                        "status": "PENDING"
                    }
                ]
            }
        }
    ]
    ```
    The status remains `PENDING` until the domain is validated.

### Reuse edge hostnames

To reuse an edge hostname with your pipeline, simply add the existing edge hostname to your `hostnames.json` file. You can also create a new edge hostname in Property Manager and add it to your `hostnames.json` file.

Use this command to view a list of your existing available edge hostnames:
   `akamai property-manager list-edgehostnames -c <contractId> -g <groupId>`

### Use multiple edge hostnames

If you want to use multiple edge hostnames with any environment in your pipeline, you can modify the `hostnames.json` file like this:

	[
		{
			"cnameFrom": "www.example.com",
			"cnameTo": "www.example.edgesuite.net",
			"cnameType": "EDGE_HOSTNAME",
			"edgeHostnameId": 343477
		},
		{
			"cnameFrom": "www.example-1.com",
			"cnameTo": "www.example-1.edgekey.net",
			"certEnrollmentId": "12356666",
			"cnameType": "EDGE_HOSTNAME",
			"edgeHostnameId": 224488
		}
	]

When entering the `cnameTo` value, remember to use the correct [domain suffix](#domain-suffixes-for-edge-hostnames).

When you run the `akamai pipeline save` command, the CLI will create or reuse an edge hostname for each JSON object you entered.

### Domain suffixes for edge hostnames

Each type of edge hostname has its own domain suffix.  Knowing which one to use is important when setting the `cnameTo` value:

<table>
  <tr>
    <th>Edge hostname type</th>
    <th>Domain suffix</th>
	<th>Additional tasks</th>
  </tr>
  <tr>
    <td>Enhanced TLS</td>
    <td>edgekey.net</td>
    <td><p>Include the enrollment ID:</p>
	    <ol>
	    <li>Retrieve the <code>enrollment-id</code> from the <a href="https://github.com/akamai/cli-cps">CPS CLI</a></li>
	    <li>Enter the ID as the <code>certEnrollmentId</code> value.</li>
		</ol>
	</td>
  </tr>
  <tr>
    <td>Standard TLS</td>
    <td>edgesuite.net</td>
    <td>Not applicable.</td>
  </tr>
  <tr>
    <td>shared certificate</td>
    <td>akamaized.net</td>
    <td>Not applicable.</td>
  </tr>
</table>

## Work with advanced behaviors

Does the property you want to use as an Akamai Pipeline template include advanced behaviors? If so, you'll need to convert all advanced behaviors to custom behaviors before creating the pipeline. See [Custom Behaviors for PAPI](https://developer.akamai.com/blog/2018/04/26/custom-behaviors-property-manager-papi) for more information.

With this CLI, you can use advanced and custom behaviors with local instances of properties you create as long as you don’t modify them.

## Work with CP codes

When creating a pipeline using an existing property as a template, verify that the new property includes a valid content provider (CP) code in the `cpCode` object.

If the template property doesn't have a CP code, the CLI automatically adds `INPUT_CPCODE_ID` as the `id`. If you do not replace this placeholder ID with a valid CP code, your pipeline will not work as expected.

**Note:** If needed, you can use PAPI to [create a new CP code](https://developer.akamai.com/api/core_features/property_manager/v1.html#postcpcodes).  

## Work with multiple accounts

If you're an Akamai partner who works with multiple accounts, you can use the account switch key option. It lets you change the account you're using with Akamai Pipeline.

Run the `set-default` command with the `--accountSwitchKey` option and the account ID you want to use. Once you run this command, the account selected persists for all other pipeline commands until you change it. Here's an example:

`akamai pipeline set-default --accountSwitchKey 1-1TJZFB`

To check what the current default account is, run the show defaults command. Here's the short-cut version of the command: `akamai pl sf`.

## Use existing properties in your pipeline

Do you want to use properties that already exist in Property Manager in your pipeline? Use the `-associate-property-name` option when creating your pipeline.  Here's an example of a command that uses this option:

`akamai pl np -p mynewpipeline -e template.example.com –-associate-property-name dev.example.com qa.example.com www.example.com`

In this case, `dev.example.com`, `qa.example.com`, and `www.example.com` are properties that:

* already exist in Property Manager.
* the pipeline has permission to access.

When you run this command, the pipeline doesn't create new properties. Instead, it creates new environments named after and linked to the existing properties you've selected. The environments all use `template.example.com` as the template. When you save or promote, the pipeline publishes a new version with this new template. All prior versions remain, but the newest version is based off of the template you selected.

# Notice

Copyright © 2018-2021 Akamai Technologies, Inc.

Your use of Akamai's products and services is subject to the terms and provisions outlined in [Akamai's legal policies](https://www.akamai.com/us/en/privacy-policies/).
