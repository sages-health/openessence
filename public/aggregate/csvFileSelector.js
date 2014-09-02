'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var moment = require('moment');
var $ = require('jquery');
require('jquery-csv');

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
angular.module(directives.name).directive('csvFileSelector', /*@ngInject*/ function ($rootScope) {
  return {
    restrict: 'E',
    template: require('./csv-file-selector.html'),
    transclude: true,
    scope: {
      tableData: '=?',
      fileParams: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.fileParams = scope.fileParams || {};
          scope.fileParams.delimiter = scope.fileParams.delimiter || '"';
          scope.fileParams.separator = scope.fileParams.separator || ',';
          scope.fileParams.headerRow = scope.fileParams.headerRow ? scope.fileParams.headerRow : true;
          scope.fileParams.showPreview = scope.fileParams.showPreview ? scope.fileParams.showPreview : true;

          scope.tableData = [];

          scope.onFileSelect = function ($files) {
            // Check if file is CSV type
            if ($files[0].type !== 'application/vnd.ms-excel') {
              scope.badFile = true;
              scope.$apply(function () {
                scope.tableData = [];
              });
              $rootScope.$emit('csvData', scope.tableData);
              return;
            } else {
              scope.badFile = false;
            }
            scope.fileParams.file = $files[0];
            scope.parse();
          };

          var parseDate = function (date) {
            if (date) {
              // default to ISO date format.
              // TODO: User/site config file should be able to overrite default date format
              if (moment(date, 'YYYY-MM-DD', true).isValid()) {
                return moment(date, 'YYYY-MM-DD').toDate();
              }
            }
          };

          scope.parse = function () {
            if (!scope.fileParams.file) {
              return;
            }
            var reader = new FileReader();
            reader.readAsText(scope.fileParams.file);
            reader.onload = function (event) {
              var csv = event.target.result;
              var tableData = [];

              $.csv.toArrays(csv, scope.fileParams).forEach(function (row, ix) {
                // ensure we have 11 columns (Initial version of aggregate data csv file has 11 columns)
                if ((!scope.fileParams.headerRow || ix !== 0) && row.length >= 11) {
                  tableData.push({
                    rowId: ix,
                    year: row[0],
                    week: row[1],
                    reportDate: parseDate(row[2]),
                    medicalFacility: {
                      district: row[3],
                      sites: {
                        total: !isNaN(row[5]) ? row[5] : undefined,
                        reporting: !isNaN(row[6]) ? row[6] : undefined
                      }
                    },
                    createDate: parseDate(row[4]),
                    acuteFever: !isNaN(row[7]) ? row[7] : undefined,
                    diarrhoea: !isNaN(row[8]) ? row[8] : undefined,
                    influenza: !isNaN(row[9]) ? row[9] : undefined,
                    prolongedFever: !isNaN(row[10]) ? row[10] : undefined
                  });
                }
              });

              scope.$apply(function () {
                scope.tableData = tableData;
              });

              $rootScope.$emit('csvData', scope.tableData);

            };
          };

          scope.gridOptions = {
            data: 'tableData',
            enableColumnResize: true,
            multiSelect: false,
            columnDefs: [
              {field: 'rowId', displayName: 'Row #', width: 40},
              {field: 'year', displayName: 'Year'},
              {field: 'week', displayName: 'Week'},
              {field: 'reportDate', displayName: 'Date', width: 100,
                cellTemplate: '<div class="ngCellText">{{formatDate(row.getProperty(col.field))}}</div>'},
              {field: 'medicalFacility.district', displayName: 'District', width: 100},
              {field: 'medicalFacility.sites.total', displayName: 'Total Sites'},
              {field: 'medicalFacility.sites.reporting', displayName: 'Sites Reporting'},
              {field: 'acuteFever', displayName: 'Acute Fever and Rashes', width: 80},
              {field: 'diarrhoea', displayName: 'Diarrhoea', width: 80},
              {field: 'influenza', displayName: 'Influenza-like Illness', width: 80},
              {field: 'prolongedFever', displayName: 'Prolonged Fever', width: 80}
            ]
          };

          scope.formatDate = function (dt) {
            return (dt === undefined) ? '' : moment(dt).format('YYYY-MM-DD');
          };

          scope.$watchCollection('[fileParams.separator, fileParams.delimiter, fileParams.headerRow]', function () {
            scope.parse();
          });

          scope.$on('csvPreview', function () {
            scope.parse();
          });
        }
      };
    }
  };
});
