'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('login', function ($location, $window, $rootScope, $log, user, persona, Session) {
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
            $log.error('bad login'); // TODO do something better
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
            // "Note that Persona may automatically call either onlogin or onlogout when your page loads, but not both."
            // Firefox likes to automatically call onlogout, even though it will return 401 Unauthorized.
            // Not really much else you can do on a logout error anyway
            $log.info('Error logging out');
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
