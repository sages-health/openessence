'use strict';

require('../modules').filters
  .filter('join', require('./join'))
  .filter('pluck', require('./pluck'))
  .filter('truncate', require('./truncate'));
