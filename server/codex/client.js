'use strict';

var conf = require('../conf');
var elasticsearch = require('elasticsearch');

module.exports = new elasticsearch.Client(conf.elasticsearch);
