'use strict';

module.exports = function (settings) {
  settings.phantom.enabled = false;

  settings.users = {
    'foo@bar.com': {
      roles: ['admin']
    }
  };

  settings.MAP_URL = "'http://localhost:8080/styles/klokantech-basic/rendered/{z}/{x}/{y}.png'"
  settings.MAP_LATITUDE = '41.4925'
  settings.MAP_LONGITUDE = '-99.9018'

  settings.session.secret = '!superDuperSecretSe$$i@nKey!';
  settings.session.store = 'redis';

  return settings;
};
