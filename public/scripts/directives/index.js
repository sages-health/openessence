'use strict';

require('../modules').directives
  .directive('editView', require('./editView'))
  .directive('conflictMessage', require('./conflictMessage'));
