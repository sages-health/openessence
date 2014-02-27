'use strict';

var _ = require('lodash');
var express = require('express');
var httpProxy = require('http-proxy');
var conf = require('../conf');
var settings = require('./settings');
var notFound = require('../error');

var proxy = httpProxy.createProxyServer({
  target: conf.elasticsearch.url
});

var app = express();

// fix for https://github.com/nodejitsu/node-http-proxy/issues/180
app.use(require('connect-restreamer')());

var aliases = settings.getManagedAliasesSync();

app.param('index', function (req, res, next, index) {
  if (_.contains(aliases, index) || index === '_all') {
    // TODO restrict access to _all or filter it to allowed indices only
    next();
  } else {
    notFound(req, res);
  }
});

var proxyReq = function proxyReq (req, res) {
  proxy.web(req, res);
};

app.options('*', proxyReq);
app.head('*', proxyReq);

app.post('/kibana-int/dashboard/_search', proxyReq); // TODO restrict users to their own dashboard
app.get('/kibana-int/dashboard/*', proxyReq);
app.get('/_nodes', proxyReq); // TODO kibana only needs version (maybe patch kibana?)
app.get('/:index/_mapping', proxyReq);
app.post('/:index/_search', proxyReq);

module.exports = app;
