'use strict';
const leNode = require('le_node');
const ENV = process.env.NODE_ENV || 'development';
const s3Bucket = 'citytaps.secrets';
const s3File = 'aws_MQTT_listerner_secrets.json';

module.exports = function loadConfig() {
  return new Promise(function(resolve, reject) {

    let config = {};
    // If ENV is aws, load secrets from S3, else load from config file
    if (ENV === 'aws') {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({ signatureVersion: 'v4' });
      const params = { Bucket: s3Bucket, Key: s3File };

      s3.getObject(params, function(err, data) {
        if (err) {
          return reject(err + err.stack); // an error occurred
        } else {
          config = buildConfFromS3(JSON.parse(data.Body.toString()));
          return resolve(config);
        }
      })
    } else {
      const config = require('./config.' + ENV);
      return resolve(config);
    }
  });
};

function buildConfFromS3(envParams) {
  let config = {
    "api": {
      "url": envParams.apiURL,
      "token": envParams.apiToken,
    },
    "loggerConfig": {
      "name": envParams.appName,
      "streams": [
        leNode.bunyanStream({
          secure: true,
          minLevel: envParams.logentriesMinLevel,
          token: envParams.logentriesToken
        }), {
          "level": "debug",
          "stream": process.stdout
        }
      ]
    },
    "awsIot": {
      "host": envParams.AWSIoT_host,
      "port": 8883,
      "caCert": Buffer.from(envParams.AWSIoT_caCert),
      "clientCert": Buffer.from(envParams.AWSIoT_clientCert),
      "privateKey": Buffer.from(envParams.AWSIoT_privateKey)
    }
  };
  return config;
}