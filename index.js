/**
 * Exporting all major classes used in this package.
 *
 * Main function, also used by cli:
 * static DevOps.createDevOps(devopsHome, overrideDependencies)
 *
 *
 * @type {*|(function(): DevOps)}
 */
module.exports = {
    createDevOps: require("./src/factory"),
    DevOps: require("./src/devops"),
    Project: require("./src/project"),
    Environment: require("./src/environment"),
    Merger: require("./src/merger")
};