# v0.1.9 beta 1 (2018-06-11)
## Stories
* Make PAPI requests made by PD SDK recognizable in logs and backend
* Replace default section name from [credentials] to [papi] in the code.
* Change wording to “Promotional Deployment Error:” opposed to “DevOps problem”
* New-pipeline command when called with “-e” option accepts property name. Use account information of existing property for creating new pipeline.
* When 'lstat' and 'promote' command is run check activation status.
* Update SDK documentation to support Akamai CLI use case

## Bugs
* Lstat info is misleading/false
* 'promote' not working since CLI prepends ctrl_ in PAPI call
* Manually set credentials to [papi] in devopsSettings.json file and [papi] do not exists in .edgerc file
* Fix the error on np -e without giving property-id or giving Invalid property-id
