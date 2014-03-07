'use strict';

var angular = require('angular');
var services = require('../modules').services;

// inspired by https://github.com/witoldsz/angular-http-auth

angular.module(services.name).factory('errorInterceptor', function ($q, $injector, $rootScope, $window, toaster) {
  // get around circular dependency, see
  // http://stackoverflow.com/questions/20647483/angularjs-injecting-service-into-a-http-interceptor-circular-dependency
  var $http;
  var $state;

  return {
    responseError: function (rejection) {
      // clients can pass `errorInterceptor: false` to $http to skip this handling
      if (rejection.config.errorInterceptor === false) {
        return $q.reject(rejection);
      }

      $http = $http || $injector.get('$http');
      $state = $state || $injector.get('$state');

      if (rejection.status >= 500) {
        // TODO gettext
        // TODO contextual info about response
        // TODO move to notification service
        // TODO copy good parts of humanize
        toaster.pop('error', 'Error', 'Server error'); // TODO make these more like Ubuntu's notifications
        // TODO make translucent on mouseover NOT by default (#toast-container > :hover)
        // TODO don't stop timer on mouseover
      } else if (rejection.status === 401) {
        // 401 is the only time it makes sense to retry: after user has logged in the request should succeed
        var deferred = $q.defer();

        var removeLoginListener = $rootScope.$on('login', function () {
          removeLoginListener();
          $http(rejection.config)
            .then(function (response) {
              deferred.resolve(response);
            })
            .catch(function (response) {
              deferred.reject(response);
            });
        });

        $state.go('home.relogin');

        return deferred.promise;
      } else if (rejection.status === 403) {
        // TODO gettext
        toaster.pop('error', '', 'You don\'t have permission to do that. Sorry about that.');
      } else if (rejection.status >= 400) {
        // TODO gettext
        toaster.pop('error', '', 'Something went wrong :(');
      }

      return $q.reject(rejection);
    }
  };
});
