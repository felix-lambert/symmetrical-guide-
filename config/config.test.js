'use strict';

module.exports = {
  api: {
    url: null,
    token: null
  },
  loggerConfig: {
    "name": "CT MQTT listener",
    "streams": [{
      "level": "debug",
      "stream": process.stdout
    }]
  }

};