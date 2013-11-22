'use strict';

module.exports = function (env) {
  if (env === 'development' || env === 'test') {
    return 'views';
  } else if (env === 'production') {
    return 'dist/views';
  } else {
    throw new Error('Unknown environment ' + env);
  }
};
