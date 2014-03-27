'use strict';

var conf = require('../conf');
var elasticsearch = require('elasticsearch');
var _ = require('lodash');

// cloning needed because of https://github.com/elasticsearch/elasticsearch-js/issues/33
module.exports = new elasticsearch.Client(_.clone(conf.elasticsearch));
