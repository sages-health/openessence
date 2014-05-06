'use strict';

/**
 * Given the current settings, returns settings specific to the development environment.
 * @param settings current settings
 * @returns {*} settings
 */
module.exports = function (settings) {
  settings.sessionSecret = 'superSecretSessionKey';
  settings.phantom.enabled = false;

  return settings;
};
