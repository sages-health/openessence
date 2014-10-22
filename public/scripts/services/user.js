'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($resource, $rootScope, $log, $window, appName, persona) {
  var PersonaSession = $resource('/session/browserid', {}, {
    save: {
      method: 'POST',
      errorInterceptor: false // don't want to redirect to /relogin before we've signed in
    },
    delete: {
      method: 'DELETE',

      // Disable our custom HTTP error handling so we don't get extraneous errors from 401s when Firefox over-zealously
      // tries to destroy session on page load. You can still handle any errors manually, if you really want to
      errorInterceptor: false
    }
  });

  var LocalSession = $resource('/session/local', {}, {
    save: {
      method: 'POST',
      errorInterceptor: false
    }
  });

  // we force a page reload on logout, so the DOM element should never change
  var userEl = angular.element('meta[name="_user"]').attr('content');
  var user = userEl ? JSON.parse(userEl) : null;

  var afterLogin = function (_user) {
    user = _user;
    $rootScope.$broadcast('login');
  };

  var afterLogout = function () {
    $rootScope.$broadcast('logout');
  };

  if (persona) {
    $window.navigator.id.watch({
      loggedInUser: user ? user.email : null,
      onlogin: function (assertion) {
        // user logged in with Persona, need to create session
        new PersonaSession({
          assertion: assertion
        }).$save(afterLogin,
          function error (response) {
            $rootScope.$broadcast('loginError', response);
            $window.navigator.id.logout(); // this is required by Persona on bad login
          });
      },

      onlogout: function () {
        if (user.authType === 'persona') {
          // "Note that Persona may automatically call either onlogin or onlogout when your page loads, but
          // not both." Firefox likes to automatically call onlogout, which at best is a NO-OP when the user isn't
          // logged in, and at worst will log the user out if they logged in through something other than Persona.
          // So we make sure the user actually has a Persona session before we destroy it.
          PersonaSession.delete(afterLogout, function error () {
            // usually from Firefox's overzealous session termination before the user's logged in
            $log.info('Error logging out');
          });
        }
      }
    });
  }

  return {
    getUser: function () {
      return user;
    },

    login: (function () {
      var loginStrategies = {
        persona: function () {
          if (!persona) {
            /*jshint quotmark:false */
            throw new Error("Can't login with Persona: Persona is disabled");
          }

          $window.navigator.id.request({
            siteName: appName
            // TODO more options from https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.request
          });
        },

        local: function (credentials) {
          new LocalSession(credentials).$save(afterLogin, function error (response) {
            $rootScope.$broadcast('loginError', response);
          });
        }
      };

      return function (strategy) {
        loginStrategies[strategy].apply(this, Array.prototype.slice.call(arguments, 1));
      };
    })(),

    logout: function () {
      if (!user) {
        // user not logged in, so nothing to do
        return;
      }

      if (user.authType === 'persona') {
        $window.navigator.id.logout();
        // navigator.id.watch callbacks handle the rest
      } else if (user.authType === 'local') {
        LocalSession.delete().$promise
          .then(afterLogout);
      } else {
        throw new Error('Unknown auth type ' + user.authType);
      }
    },

    isLoggedIn: function () {
      return !!user;
    },

    isDataEnterer: function () {
      return user && user.roles && user.roles.indexOf('data_entry') !== -1;
    },

    isAdmin: function () {
      return user && user.roles && user.roles.indexOf('admin') !== -1;
    }
  };
};
