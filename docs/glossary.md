# Glossary
Technical terms used throughout the project sources and documentation. In some cases there are synonyms.

#### Pipeline 
Or better DevOps Pipeline. Throughout the SDK also referred as project, since this term is a bit less specific to DevOps. 
One might want to use the SDK for things that aren't DevOps pipelines.

#### Project
Synonym to Pipeline in the SDK context. 

#### Environment
Represents one or more hostnames, one property used in conjunction with a customer origin server installation. 
Environments are grouped under a Project or Pipeline. Conceptually environments are ordered in a linear fashion, the leftmost 
one is receiving cutting edge changes and the right most is considered the public facing production environment.
Configuration changes are pushed from left to right.

#### Akamai Property
Formerly known as configuration. Set of rules, settings and configuration options defining the behavior of an Akamai 
edge server when processing an end user request over HTTP/HTTPS.

#### Rule tree
JSON formatted tree data structure representing conditions and behaviors as a whole representing an Akamai Property

#### template
JSON snippet which is part of a rule tree.

#### variable
named placeholder to be used in a template representing an environment specific value.

#### Merge
assemble rule tree by resolving all includes from the main template directly and indirectly and also replace all
variables expression with their environment specific values.

#### Promote
Promoting an environment incorporates changes from the environment to the left, or if there isn't one, changes from 
developers and activating them to the Akamai production (or staging) network.
