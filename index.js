"use strict";
const Redis = require('ioredis');
const util = require('util');
const layouts = require('log4js').layouts;

function logstashRedis(config, layout) {
  let redis = config.redis ? new Redis(config.redis) : new Redis();
  let type = config.logType ? config.logType : config.category;
  layout = layout || layouts.dummyLayout;
  if(!config.fields) {
    config.fields = {};
  }

  return function log(loggingEvent) {
    if (loggingEvent.data.length > 1) {
      let secondEvData = loggingEvent.data[1];
      for (let k in secondEvData) {
        config.fields[k] = secondEvData[k];
      }
    }
    config.fields.level = loggingEvent.level.levelStr;

    let logObject = {
      "@version" : "1",
      "@timestamp" : (new Date(loggingEvent.startTime)).toISOString(),
      "type" : config.logType ? config.logType : config.category,
      "message" : layout(loggingEvent),
      "fields" : config.fields
    };
    sendLog(redis, config.key, logObject);
  };
}

function sendLog(redis, key, logObject) {
  let logString = JSON.stringify(logObject);
  redis.rpush(key, logString, function (err, result) {
    if (err) {
      console.error("log4js-logstash-redis - Error: %s", util.inspect(err))
    }
  });
}

function configure(config) {
  let layout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return logstashRedis(config, layout);
}

exports.appender = logstashRedis;
exports.configure = configure;
