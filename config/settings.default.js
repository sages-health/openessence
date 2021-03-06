'use strict';

module.exports = function (settings) {
  settings.users = {
    'foo@bar.com': {
      roles: ['admin']
    }
  };

  settings.MAP_URL = "'http://localhost:8080/styles/klokantech-basic/rendered/{z}/{x}/{y}.png'";
  settings.MAP_LATITUDE = '41.2729';
  settings.MAP_LONGITUDE = '-99.3092';
  settings.NODE_ENV='production';

  //Production secret should be set as ENV variable and not here
  settings.session.secret = '!superDuperSecretSe$$i@nKey!';
  settings.session.store = 'redis';

  settings.apiEnabled = true;

  return settings;
};

