'use strict';

module.exports = function (settings) {
  settings.phantom.enabled = false;

  settings.users = {
    'foo@bar.com': {
      roles: ['admin']
    }
  };

  settings.session.secret = '!superDuperSecretSe$$i@nKey!';

  return settings;
};
