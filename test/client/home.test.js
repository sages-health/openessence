'use strict';

require('angular-mocks');

var chai = require('chai');
var expect = chai.expect;

var angular = require('angular');
var app = require('../../public/scripts/app');
var MainCtrl = require('../../public/scripts/controllers/MainCtrl');

describe('MainCtrl', function () {
  var scope;
  var $controller;
  var $window;

  beforeEach(function () {
    $window = {
      location: {href: ''},
      encodeURIComponent: window.encodeURIComponent
    };
    angular.mock.module(app.name, function ($provide) {
      $provide.value('$window', $window);
      $provide.constant('lang', 'en');
    });

    angular.mock.inject(function (_$controller_, $rootScope, $httpBackend) {
      $controller = _$controller_;
      scope = $rootScope.$new();
      $httpBackend.when('GET', '/public/translations/en.json')
        .respond({en: {}});
    });
  });

  it('should change location on logout', function (done) {
    var mockUser = {
      logout: function () {
        scope.$emit('logout');
      }
    };

    $controller(MainCtrl, {$scope: scope, user: mockUser});
    expect(scope.logout).to.exist;

    scope.logout();

    expect($window.location.href).to.equal('/');

    done();
  });
});
