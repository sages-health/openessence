'use strict';

require('angular-mocks');

var chai = require('chai');
var expect = chai.expect;

var angular = require('angular');
var app = require('../../public/scripts/app');

describe('form', function () {
  var scope;
  var $compile;
  var $httpBackend;
  var $timeout;

  var formMarkup = '<outpatient-form page="page" on-submit="submit" record="record"></outpatient-form>';
  var formTpl;

  beforeEach(function () {
    angular.mock.module(app.name, function ($provide) {
      $provide.constant('lang', 'en');
    });

    angular.mock.inject(function (_$compile_, $rootScope, _$httpBackend_, _$timeout_) {
      $compile = _$compile_;
      scope = $rootScope.$new();
      $httpBackend = _$httpBackend_;
      $timeout = _$timeout_;

      formTpl = $compile(formMarkup);

      $httpBackend.when('GET', '/public/translations/en.json')
        .respond({en: {}});
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
//    $httpBackend.verifyNoOutstandingRequest();
  });

  it('should hide disabled fields', function () {
    scope.page = 1;
    scope.submit = function () {};

    $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
      .respond({
        results: [
          {
            _id: '1',
            _score: null,
            _version: 1,
            _source: {
              name: 'demo',
              fields: [
                {
                  name: 'visitDate',
                  enabled: false
                }
              ]
            }
          }
        ]
      });

    var element = formTpl(scope);

    scope.$digest();
    $httpBackend.flush();

    // offsetParent == null is a good proxy for determining that an element is hidden
    var visitDateInput = element.find('#entry-visit-date');
    expect(visitDateInput.get(0).offsetParent).to.equal(null);
  });

  describe('facility', function () {
    it('should be selected if record has one', function () {
      scope.page = 1;
      scope.submit = function () {};
      scope.record = {
        _source: {
          medicalFacility: {
            name: 'Foo',
            location: {
              county: 'Bar'
            }
          }
        }
      };

      $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
        .respond({
          results: [
            {
              _id: '1',
              _score: null,
              _version: 1,
              _source: {
                name: 'demo',
                fields: [
                  {
                    name: 'medicalFacility',
                    enabled: true,
                    values: [
                      scope.record._source.medicalFacility,
                      {
                        name: 'Baz'
                      }
                    ]
                  }
                ]
              }
            }
          ]
        });

      var element = formTpl(scope);
      scope.$digest();
      $httpBackend.flush();

      var facilityEl = element.find('#entry-visit-facility').first();
      var optionEl = facilityEl.find('option[selected]').get(0);

      expect(optionEl.value).to.equal('Foo');
      expect(optionEl.text).to.equal('Foo');
    });

    it('should select facility even if it is not a known value', function () {
      scope.page = 1;
      scope.submit = function () {};
      scope.record = {
        _source: {
          medicalFacility: {
            name: 'Foo',
            location: {
              county: 'Bar'
            }
          }
        }
      };

      $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
        .respond({
          results: [
            {
              _id: '1',
              _score: null,
              _version: 1,
              _source: {
                name: 'demo',
                fields: [
                  {
                    name: 'medicalFacility',
                    enabled: true,
                    values: []
                  }
                ]
              }
            }
          ]
        });

      var element = formTpl(scope);
      scope.$digest();
      $httpBackend.flush();

      var facilityEl = element.find('#entry-visit-facility').first();
      var optionEl = facilityEl.find('option[selected]').get(0);

      expect(optionEl.value).to.equal('Foo');
      expect(optionEl.text).to.equal('Foo');
    });

    it('should include blank option', function () {
      scope.page = 1;
      scope.submit = function () {};

      $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
        .respond({
          results: [
            {
              _id: '1',
              _score: null,
              _version: 1,
              _source: {
                name: 'demo',
                fields: [
                  {
                    name: 'medicalFacility',
                    enabled: true,
                    values: [
                      {name: 'Facility1'}
                    ]
                  }
                ]
              }
            }
          ]
        });

      var element = formTpl(scope);
      scope.$digest();
      $httpBackend.flush();

      var facilityEl = element.find('#entry-visit-facility').first();
      var option = facilityEl.find(':first-child').get(0);

      expect(option.value).to.equal('');
      expect(option.text).to.equal('');
    });

    it('should include "Other" optgroup if medicalFacility.other enabled', function () {
      scope.page = 1;
      scope.submit = function () {};

      $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
        .respond({
          results: [
            {
              _id: '1',
              _score: null,
              _version: 1,
              _source: {
                name: 'demo',
                fields: [
                  {
                    name: 'medicalFacility',
                    enabled: true,
                    values: [
                      {name: 'Facility1'}
                    ]
                  },
                  {
                    name: 'medicalFacility.other',
                    enabled: true
                  }
                ]
              }
            }
          ]
        });

      var element = formTpl(scope);
      scope.$digest();
      $httpBackend.flush();

      var facilityEl = element.find('#entry-visit-facility').first();
      var option = facilityEl.find('optgroup > option[value="Other"]').get(0);

      expect(option).to.be.ok;
    });

    it('should not include "Other" optgroup if medicalFacility.other is not enabled', function () {
      scope.page = 1;
      scope.submit = function () {};

      $httpBackend.when('GET', '/resources/form?q=name:demo&size=1')
        .respond({
          results: [
            {
              _id: '1',
              _score: null,
              _version: 1,
              _source: {
                name: 'demo',
                fields: [
                  {
                    name: 'medicalFacility',
                    enabled: true,
                    values: [
                      {name: 'Facility1'}
                    ]
                  }
                  // no medicalFacility.other
                ]
              }
            }
          ]
        });

      var element = formTpl(scope);
      scope.$digest();
      $httpBackend.flush();

      var facilityEl = element.find('select[ng-model="visit.medicalFacility"]').first();
      var option = facilityEl.find('optgroup > option[value="Other"]').get(0);

      expect(option).to.not.be.ok;
    });
  });

  // TODO test a multi-select
});
