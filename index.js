#!/usr/bin/env node

/*
 * Copyright (c) 2016. Taimos GmbH http://www.taimos.de
 */

"use strict";

var argv = require('minimist')(process.argv.slice(2), {
  "default": {
    "color": true,
    "retryMs": 700
    // Delays with maxRetries = 4: 700, 1400, 2800, 5600
  }
});

var stackName = argv._[0];
var awsRegion = argv.region || process.env.AWS_DEFAULT_REGION;
var color = argv.color;
var retryMs = argv.retryMs;

var AWS = require('aws-sdk');
AWS.config.update({retryDelayOptions: {base: retryMs}});
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  
  try {
    var agent = require('proxy-agent');
    AWS.config.update({
      httpOptions: {
        agent: agent(process.env.HTTPS_PROXY || process.env.https_proxy)
      }
    });
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.error('Install proxy-agent for proxy support.');
    }
    else {
      throw e;
    }
  }
}

var Q = require('q');
var cfn = new AWS.CloudFormation({region: awsRegion});

// color
var clc = require("cli-color");
var positive = clc.green;
var negative = clc.redBright;
var neutral = clc.xterm(243);
var warn = clc.xterm(208);
var re_positive = new RegExp("CREATE_COMPLETE|UPDATE_COMPLETE");
var re_negative = new RegExp("CREATE_FAILED|DELETE_FAILED|ROLLBACK_FAILED|ROLLBACK_IN_PROGRESS|UPDATE_FAILED|UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS|UPDATE_ROLLBACK_IN_PROGRESS|UPDATE_ROLLBACK_FAILED|UPDATE_ROLLBACK_COMPLETE|ROLLBACK_COMPLETE");
var re_neutral = new RegExp("DELETE_COMPLETE");
var re_warn = new RegExp("REVIEW_IN_PROGRESS|CREATE_IN_PROGRESS|DELETE_IN_PROGRESS|UPDATE_IN_PROGRESS|UPDATE_COMPLETE_CLEANUP_IN_PROGRESS");

function listEvents(startEvent, startTime) {
  var deferred = Q.defer();
  var params = {
    StackName: stackName
  };
  cfn.describeStackEvents(params, function (err, data) {
    if (err) {
      if (err.message) {
        console.error('ERROR:', err.message);
      } else {
        console.error(JSON.stringify(err));
      }
      deferred.reject(err);
      return;
    }
    var cfnEvents = data.StackEvents;
    var events = [];
    for (var i = 0; i < cfnEvents.length; i++) {
      var event = cfnEvents[i];
      if (startEvent && event.EventId === startEvent) {
        break;
      }
      if (startTime && startTime > event.Timestamp) {
        break;
      }
      events.push(event);
    }
    events.reverse();
    deferred.resolve(events);
  });
  return deferred.promise;
}

function padRight(str, size) {
  var pad = new Array(size).join(' ');
  if (typeof str === 'undefined') {
    return pad;
  }
  return (str + pad).substring(0, pad.length);
}

function printStackName() {
  console.log('| ' + padRight('Stack: ' + stackName, 227) + " |");
}

function printLine() {
  console.log(new Array(231).join('-'));
}

function printEvent(event) {
  // Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason
  var out = '| ' + padRight(event.Timestamp.toISOString(), 25) + ' | ' + padRight(event.LogicalResourceId, 20);
  out += ' | ' + colorizeResourceStatus(padRight(event.ResourceStatus, 36)) + ' | ' + padRight(event.ResourceStatusReason, 140) + ' |';
  
  console.log(out);
}

function colorizeResourceStatus(status) {
  if (color === false || color === 'false') {
    return status;
  }
  if (re_positive.test(status)) {
    return positive(status);
  }
  if (re_negative.test(status)) {
    return negative(status);
  }
  if (re_neutral.test(status)) {
    return neutral(status);
  }
  if (re_warn.test(status)) {
    return warn(status);
  }
  return status;
}

var fiveMinutesAgo = new Date();
fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

var lastEventId;
var firstTime = fiveMinutesAgo;
var completeString = '_COMPLETE';
var failedString = '_FAILED';

function doPrint() {
  listEvents(lastEventId, firstTime).then(function (events) {
    firstTime = undefined;
    events.forEach(function (ev) {
      printEvent(ev);
    });
    var lastEvent = events[events.length - 1];
    if (lastEvent && lastEvent.LogicalResourceId === stackName &&
      (lastEvent.ResourceStatus.substr(-completeString.length) === completeString ||
      lastEvent.ResourceStatus.substr(-failedString.length) === failedString)) {
      printLine();
      return;
    }
    if (lastEvent) {
      lastEventId = lastEvent.EventId;
    }
    setTimeout(doPrint, 1000);
  });
}

printLine();
printStackName();
printLine();
setTimeout(doPrint, 1000);

