#!/usr/bin/env node

/*
 * Copyright (c) 2016. Taimos GmbH http://www.taimos.de
 */

"use strict";

var argv = require('minimist')(process.argv.slice(2));
var stackName = argv._[0];
var awsRegion = argv.region || process.env.AWS_DEFAULT_REGION;

var AWS = require('aws-sdk');
AWS.config.update({retryDelayOptions: {base: 700}});
// Delays with maxRetries = 4: 700, 1400, 2800, 5600
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
  out += ' | ' + padRight(event.ResourceStatus, 36) + ' | ' + padRight(event.ResourceStatusReason, 140) + ' |';
  
  console.log(out);
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

