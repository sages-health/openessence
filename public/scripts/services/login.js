'use strict';

var angular = require('angular');
var services = require('../services');
require('../services/user');
require('../services/persona');
require('../services/Session');

var NAME = 'login';

angular.module(services.name).factory(NAME, function ($location, $window, $rootScope, user, persona, Session) {
  // including persona script kills phantomjs
  if (persona) { // TODO do this by injecting NOOP navigator
    navigator.id.watch({
      loggedInUser: user.email,
      onlogin: function (assertion) {
        // user logged in with Persona, need to create session
        new Session({
          assertion: assertion
        })
          .$save()
          .then(function (response) {
            user.email = response.email;
            $rootScope.$broadcast('login', user);
          })
          .catch(function () {
            // bad login
            console.error('bad login'); // TODO do something better
            navigator.id.logout(); // this is required by Persona on bad login
          });
      },

      onlogout: function () {
        // user logged out with Persona, need to destroy session
        Session.delete().$promise
          .then(function () {
            user.email = null;
            $rootScope.$broadcast('logout');
          })
          .catch(function () {
            console.error('Logout failure'); // TODO do something better
          });
      }
    });
  }

  return {
    prompt: function () {
      navigator.id.request({
        siteName: 'Fracas'
        // TODO more options from https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.request
      });
    },
    logout: function () {
      navigator.id.logout();
    }
  };
});

module.exports = NAME;
