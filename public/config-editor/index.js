'use strict';

require('../scripts/modules').controllers
  // edit controllers
  .controller('ConfigEditCtrl', require('./config-edit-ctrl'));

require('./config-age-group.js');
require('./config-group.js');
require('./config-multi-select.js');
require('./config-table.js');
require('./config-table-mapping.js');
