'use strict';

// inspired by https://github.com/witoldsz/angular-http-auth

// @ngInject
module.exports = function ($q, $injector, $rootScope, gettext, notification) {
  // get around circular dependency, see
  // http://stackoverflow.com/questions/20647483/angularjs-injecting-service-into-a-http-interceptor-circular-dependency
  var $http;
  var $state;
  var gettextCatalog;

  return {
    responseError: function (rejection) {
      // clients can pass `errorInterceptor: false` to $http to skip this handling
      if (rejection.config.errorInterceptor === false) {
        return $q.reject(rejection);
      }

      $http = $http || $injector.get('$http');
      $state = $state || $injector.get('$state');
      gettextCatalog = gettextCatalog || $injector.get('gettextCatalog'); // depends on $http for remote loading

      if (rejection.status >= 500) {
        notification.error(gettextCatalog.getString(gettext('Something went wrong :(')));
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

        $state.go('relogin');

        return deferred.promise;
      } else if (rejection.status === 403) {
        notification.error(gettextCatalog.getString(gettext('Insufficient permissions')));
      } else if (rejection.status >= 400) {
        // It's not really useful to show a popup if the client did something bad. Contextual feedback,
        // like a validation error in a form, makes more sense
        // notification.error(gettextCatalog.getString(gettext('That was a very bad request :(')));
      }

      return $q.reject(rejection);
    }
  };
};
