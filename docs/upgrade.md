# Upgrade to the Latest Property Manager CLI

The original Property Manager CLI, [cli-property](https://github.com/akamai/cli-property), has been deprecated. The latest CLI, [cli-property-manager](https://github.com/akamai/cli-property-manager), includes most features from the original. There are differences in command and option names between the two CLI versions.

# How do I install the latest version?

When upgrading, you install the new version as if it were a new installation. Use the instructions starting with [Get Started](https://github.com/akamai/cli-property-manager/blob/master/README.md#get-started) in the README.md file.

# Updated commands

Here's a list of commands that have changed between the two versions:

Original CLI command  | New CLI command | Notes
------------ | ------------- | -------------
`activate <property>` | `activate` | `BOTH` argument no longer supported for the `network` option.
`deactivate <property>` | `deactivate` | `BOTH` argument no longer supported for the `network` option.
`create <property>` | `new-property` | These options not currently supported: `--cpcode`, `--edgehostname`, `--file`, `--forward`, `--hostnames`, `--origin`, `--newcpcodename`, `--nocopy`, and `--notes`.
`delete <property>` | `delete` | The `--property` option replaces the `<property>` argument.
`format` | `list-rule-formats` |
`groups` | `list-groups` | `contractId` replaces `contract`.
`list` | `list-properties` | `contractId` replaces `contract` and `groupId` replaces `group`.
`products` | `list-products` | `contractId` replaces `contract`.
`retrieve <property>` | `show-ruletree` | The `list-rule-formats` command replaces `--format`, the `list-property-hostnames` command replaces `--hostnames`, and the `list-property-variables` command replaces `--variables`.
`update <property>` | `update-property` | The `--property` option replaces the `<property>` argument, the --dry-run option replaces --dryrun, the --note option replaces --notes, and the --message option is an alias of --note.

# Updated options

Some options from original version were also updated in the new version:

Original CLI option | New CLI option
------------ | -------------
`--clone` | `--propertyId`
`--config` | `--edgerc`
`--contract` | `--contractId`
`--debug` | `--verbose`
`--email` | `--emails`
`--group` | `--groupId`
`--notes` | `--message`
`--product` | `--productId`
`--srcver` | `--propver`


Copyright © 2020 Akamai Technologies, Inc.
