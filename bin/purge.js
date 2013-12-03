#!/usr/bin/env node

/**
 * Deletes all Tacbrd data from elasticsearch.
 */
'use strict';

var request = require('request');
var settings = require('../dev');

var ELASTICSEARCH_HOSTNAME = settings.ES_HOST || 'localhost';
var ELASTICSEARCH_PORT = settings.ES_PORT || 9200;
var ELASTICSEARCH_URL = 'http://' + ELASTICSEARCH_HOSTNAME + ':' + ELASTICSEARCH_PORT;

// delete river types, but keep river index since it's used by all rivers
request.del(ELASTICSEARCH_URL + '/_river/er-river');
request.del(ELASTICSEARCH_URL + '/_river/otc-river');

request.del(ELASTICSEARCH_URL + '/er');
request.del(ELASTICSEARCH_URL + '/otc');
