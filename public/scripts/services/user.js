angular.module('fracas.services').factory('user', function () {
  return {
    username: angular.element("meta[name='_username']").attr('content')
  }
});
