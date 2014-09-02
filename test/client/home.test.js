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

  beforeEach(function () {
    angular.mock.module(app.name, function ($provide) {
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

    var $window = {
      location: {href: ''},
      encodeURIComponent: window.encodeURIComponent
    };

    $controller(MainCtrl, {$scope: scope, user: mockUser, $window: $window});
    expect(scope.logout).to.exist;

    scope.logout();

    expect($window.location.href).to.equal('/');

    done();
  });
});
