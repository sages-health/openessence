'use strict';

module.exports = function (settings) {
  settings.phantom.enabled = false;

  settings.users = {
    'foo@bar.com': {
      roles: ['admin']
    }
  };

  settings.MAP_URL = "'http://localhost:8080/styles/bright-v9/?vector#{z}/{x}/{y}'"
  settings.MAP_LATITUDE = '41.4925'
  settings.MAP_LONGITUDE = '-99.9018'

  settings.session.secret = '!superDuperSecretSe$$i@nKey!';

  return settings;
};
