define(['angular', 'services'], function (angular, services) {
  'use strict';

  angular.module(services.name).factory('user', function () {
    return {
      username: angular.element('meta[name="_username"]').attr('content')
    };
  });
});
