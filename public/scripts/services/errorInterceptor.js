'use strict';

// inspired by https://github.com/witoldsz/angular-http-auth

// @ngInject
module.exports = function ($q, $injector, $rootScope, $filter, notification) {
  // get around circular dependency, see
  // http://stackoverflow.com/questions/20647483/angularjs-injecting-service-into-a-http-interceptor-circular-dependency
  var $state;
  //var gettextCatalog;

  return {
    responseError: function (rejection) {
      // clients can pass `errorInterceptor: false` to $http to skip this handling
      if (rejection.config.errorInterceptor === false) {
        return $q.reject(rejection);
      }

      $state = $state || $injector.get('$state');
      //gettextCatalog = gettextCatalog || $injector.get('gettextCatalog'); // depends on $http for remote loading

      if (rejection.status >= 500) {
        notification.error($filter('i18next')('Something went wrong :('));
      } else if (rejection.status === 403 || rejection.status === 401) {
        // TODO show a popup (not implemented because it's buggy)
        $state.go('login');
      } else if (rejection.status >= 400) {
        // It's not really useful to show a popup if the client did something bad. Contextual feedback,
        // like a validation error in a form, makes more sense
        // notification.error(gettextCatalog.getString(gettext('That was a very bad request :(')));
      }

      return $q.reject(rejection);
    }
  };
};
