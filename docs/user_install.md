# User Installation 
## Setup Environment
### Install Node.js
The Devops provisioning toolkit is written in Node.js. See: https://Nodejs.org/en/
It's important to use the latest LTS version. Currently at the time of writing this, it is version 8.9.1. 

It's possible to just install node from a tar ball. 
In order to allow different applications with different node version requirements to be able to run side by side
we recommend using NVM, the node version manager. See http://nvm.sh/
On OSX if you use homebrew, you can just install nvm like so:

    brew install nvm

Otherwise just follow the instructions on http://nvm.sh/
Once you go nvm install, install Node.js like so:

    nvm install v8.9.1

### Create project space folder
Each devops pipeline (project) lives in its own folder under a project space folder.
The project space folder contains following files and directories
 * node_modules this is where node installs the DevOps SDK code (unless you install it globally)
 * client.properties file containing Akamai Open client ids
 * devopsSettings.json file containing default values and settings for DevOps SDK
 
So before you start, create a project space folder for example under your user home directory:

    $ mkdir devops_projects

### Install the SDK    
Then install the DevOps SDK inside that folder:

    $ cd devops_projects
    $ npm install devops-prov-sdk

Now there should be a node_modules folder inside of devops_projects.    
(Not recommended: It's also possible to install the SDK globally using the -g option on the npm command.)

### Use the SDK CLI command
npm installs the SDK's CLI command devops-prov in devops_projects/node_modules/.bin
So in order to use it, you either create a symbolic link to a bin folder contained in your PATH or you add
devops_projects/node_modules/.bin to the PATH variable. 

Symbolic link example:

    ln -s /home/myuser/devops_projects/node_modules/.bin/devops-prov /usr/local/bin
    
PATH variable example:

    export PATH=/home/myuser/devops_projects/node_modules/.bin:$PATH
    
### Testing devops-prov command with credentials
Run the following command:

    $ devops-prov list-contracts
    
    ╒═════════════╤════════════════════╕
    │"Contract ID"│"Contract Type Name"│
    ╞═════════════╪════════════════════╡
    │"1-ABC123"   │"TIER_1_RESELLER"   │
    ├─────────────┼────────────────────┤
    │"1-DEF456"   │"INDIRECT_CUSTOMER" │
    └─────────────┴────────────────────┘
