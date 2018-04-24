# Developer Notes

## Setup Development Environment
### Install Node.js via nvm
The Devops provisioning toolkit is written in Node.js. See: [Nodejs.org](https://Nodejs.org/en/)
It's important to use the latest LTS version. Currently at the time of writing this, it is version 8.9.1. 

We recommend using NVM, the node version manager. See [nvm.sh](http://nvm.sh/)

On OSX if you use homebrew, you can just install nvm like so:

    brew install nvm

Otherwise just follow the instructions on http://nvm.sh/
To install Node.js do:

    nvm install v8.9.1


### Installing Devops-Prov SDK for development
In order to explain how to install the SDK as a developer we are assuming a
project directory structure as follows:

    .../devops/
              sdk/                         <-- SDK sources
                 node_modules/
                 src/
                 tests/
                 ...
              projects/                    <-- SDK Project space
                      example_project/
                      node_modules/        
    

#### Here's how you get there:
Inside your workspace folder or where ever you like to checkout code do the following:
1. ```mkdir devops ```
1. ```git clone ssh://git@git.source.akamai.com:7999/devopsprov/devops-sdk.git sdk```
   
   This should create a sdk folder within devops
1. ```cd sdk``` followed by ```./build.sh```. This should install all third party libraries and dependencies and 
run all the tests using mocha and run jshint as well.
1. In order to use the SDK and its CLI command as a developer create a npm link inside the sdk folder like so: ```npm link```
1. Go back up to devops/ and do ```mkdir projects && cd projects```
1. ```npm link ../sdk``` This should create a node_modules directory with a symbolic link in it.
1. Now we should be able to use the devops-prov CLI command:


    $ devops-prov -h
    
    Usage: devops-prov [options] [command]
    
    Options:

    -V, --version            output the version number
    -h, --help               output usage information    
    ... more information following ...


## Building
for a quick an easy way to execute build and check that everything is OK do:

    ./build.sh 


## Using the CLI command
### Setting up EdgeGrid credentials
Follow the instructions here: [Provisioning Open Credentials](https://developer.akamai.com/introduction/Prov_Creds.html)
 in order to setup a new API client, unless you already have one.
Store the credentials in a file called client.properties inside the projects folder. 


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
