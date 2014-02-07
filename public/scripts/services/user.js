define(['angular', 'services'], function (angular, services) {
  'use strict';

  services.factory('user', function () {
    return {
      username: angular.element('meta[name="_username"]').attr('content')
    };
  });
});
