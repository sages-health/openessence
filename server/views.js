'use strict';

module.exports = function (env) {
  if (env === 'development' || env === 'test') {
    return __dirname + '/../views';
  } else if (env === 'production') {
    return __dirname + '/../dist/views';
  } else {
    throw new Error('Unknown environment ' + env);
  }
};
