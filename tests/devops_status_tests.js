//  Copyright 2018. Akamai Technologies, Inc
//  
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  
//      http://www.apache.org/licenses/LICENSE-2.0
//  
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.


global.td = require('testdouble');
const chai = require('chai');
const assert = chai.assert;


const devopsHome = __dirname;

const createDevOps = require('../src/factory');


describe('getEnvironment tests', function() {
    let devops;

    before(function() {
        devops = createDevOps({
            devopsHome
        });
    });

    it('getEnvironment with correct params', function() {
        let environment = devops.getDefaultProject().getEnvironment("prod");
        let envInfo = environment.getEnvironmentInfo();

        let elem = {};
        elem["propertyName"]=environment.propertyName;
        elem["propertyVersion"]=envInfo.latestVersionInfo.propertyVersion;
        elem["productionStatus"]=envInfo.latestVersionInfo.productionStatus;
        elem["stagingStatus"]=envInfo.latestVersionInfo.stagingStatus;
        elem["ruleFormat"]=envInfo.latestVersionInfo.ruleFormat;

        assert.deepEqual(envInfo.latestVersionInfo, {
            "propertyVersion": 1,
            "updatedByUser": "jpws7ubcv5jjsv37",
            "updatedDate": "2017-11-13T21:49:31Z",
            "productionStatus": "INACTIVE",
            "stagingStatus": "INACTIVE",
            "etag": "9fdf49fecd0ed31b57eb13a6326f5190b9a14cc2",
            "productId": "Web_App_Accel",
            "ruleFormat": "latest"
        });

    });

    it('get Projectinfo', function () {
        let projecData = devops.getDefaultProject().getProjectInfo();
        let projectDetails = {};
        projectDetails["hostname"]=projecData.name;
        projectDetails["environments"]=projecData.environments;
        projectDetails["qa_environment"]=projecData.environments[0]+"."+projecData.name;
        projectDetails["staging_environment"]=projecData.environments[1]+"."+projecData.name;
        projectDetails["prod_environment"]=projecData.environments[2]+"."+projecData.name;

        assert.equal(projecData.name, "testproject.com");
        assert.deepEqual(projectDetails,{
            "hostname": 'testproject.com',
            "environments": [ 'qa', 'staging', 'prod' ],
            "qa_environment": 'qa.testproject.com',
            "staging_environment": 'staging.testproject.com',
            "prod_environment": 'prod.testproject.com'});

    });

    it('getEnvironment with wrong env name', function() {
        assert.throws(() => {
            let environment = devops.getDefaultProject().getEnvironment("foobar");
    }, "'foobar' is not a valid environment in pipeline testproject.com");
    });

    it('getEnvironment with wrong project name', function() {
        assert.throws(() => {
            let environment = devops.getProject("blahblah").getEnvironment("foobar");
    }, "Pipeline 'blahblah' doesn't exist!");
    });
});







