'use strict';

var angular = require('angular');
var services = require('../services');
require('./persona');

var NAME = 'user';

angular.module(services.name).factory(NAME, function ($http, $location, $window, persona) {

  var user = {
    email: angular.element('meta[name="_email"]').attr('content'),

    // useful abstraction in case user identifiers change
    isLoggedIn: function () {
      return !!user.email;
    }
  };

  // including persona script kills phantomjs
  if (persona) {
    navigator.id.watch({
      loggedInUser: user.email,
      onlogin: function (assertion) {
        // user logged in with Persona, need to create session
        $http.post('/session/browserid', {
          assertion: assertion
        })
          .success(function (response) {
            user.email = response.email;
            $location.path('/');
          })
          .error(function () {
            // bad login
            navigator.id.logout();
            console.error('bad login'); // TODO do something better
          });
      },

      onlogout: function () {
        // user logged out with Persona, need to destroy session
        $http.delete('/session/browserid')
          .success(function () {
            user.email = null;

            // TODO implement logout view with a nice message like "Sorry to see you go"
            $window.location.reload();
          })
          .error(function () {
            console.error('Logout failure'); // TODO do something better
          });
      }
    });
  }

  return user;
});

module.exports = NAME;
