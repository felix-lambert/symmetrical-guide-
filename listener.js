`use strict`;

const loadConfig = require(`./config/configLoader`);
const bunyan     = require('bunyan');
const request    = require('request');

let TOPIC = ``;
let client;

function sendMessageToAPI(jsonMessage, url, token) {
  return new Promise(function(resolve, reject) {
    const options = {
      "url": url,
      "headers": {
        "Content-Type": "application/json",
        "Authorization": token
      },
      "form": {"message": jsonMessage}
    };

    function callback(error, response) {
      if (error) {
        return reject(error);
      } else if (response.statusCode !== 200) {
        return reject({error: 'unexpectedStatus', status: response.statusCode, body: response.body});
      } else {
        return resolve(response);
      }
    }

    request.post(options, callback);
  })
}

loadConfig()
  .then((config) => {
    const loggerConfig = config.loggerConfig ?
      config.loggerConfig : {"name": "ct-app"};

    const Log = bunyan.createLogger(loggerConfig);

    Log.info(`Config loaded`);

    if (config.awsIot) {
      Log.info(`Broker: AWS IoT`);
      const awsIot = require('aws-iot-device-sdk');
      client       = awsIot.device(config.awsIot);
      TOPIC        = `ct-iot/+/+/up`;
    } else {
      Log.info(`Broker: ${config.mqtt.mqttUrl}`);
      const mqtt = require(`mqtt`);
      client     = mqtt.connect(config.mqtt.mqttUrl);
      TOPIC      = `lora/+/up`;
    }

    client.on(`connect`, () => {
      Log.info(`Connected to broker, subscribing to ${TOPIC}`);
      // subscribe to all upstream lora packets
      client.subscribe(TOPIC, {qos: 1});
    });

    client.on(`error`, (error) => {
      Log.error(`MQTT error: `, error);
      process.exit(1);
    });

    //executed processMessage() when received a MQTT message
    client.on(`message`, (topic, message) => {
      Log.info(`Incoming message on  ${topic}`);

      let jsonMessage           = JSON.parse(message.toString());
      jsonMessage.topic         = topic;
      jsonMessage.throughAWSIoT = config.awsIot ? true : false;

      sendMessageToAPI(jsonMessage, config.api.url + 'messageFromMeter', config.api.token)
        .then(() => {
          Log.info(`Message from ${topic} forwarded to API`);
        })
        .catch((err) => {
          Log.error(`Message from ${topic} forward to API failed: ${JSON.stringify(err)} - ${JSON.stringify(message)}`);
        })
    });

    Log.info(`MQTT Listener is running version ${process.env.npm_package_version}`);
  })
  .catch((err) => {
    console.log(`Error while loading configuration ${err}`);
  });