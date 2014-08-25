'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('aggregateUtil', function () {
  return {
    csvToAggregate: function (csvRec) {
      var aggregateRec = angular.copy(csvRec);
      if (aggregateRec.reportDate) {
        delete aggregateRec.rowId;
        delete aggregateRec.week;
        delete aggregateRec.year;
        delete aggregateRec.acuteFever;
        delete aggregateRec.diarrhoea;
        delete aggregateRec.influenza;
        delete aggregateRec.prolongedFever;

        if (csvRec.medicalFacility && csvRec.medicalFacility.sites) {
          if (csvRec.medicalFacility.sites.reporting) {
            aggregateRec.medicalFacility.sites.reporting = parseInt(aggregateRec.medicalFacility.sites.reporting);
          }
          if (csvRec.medicalFacility.sites.total) {
            aggregateRec.medicalFacility.sites.total = parseInt(aggregateRec.medicalFacility.sites.total);
          }
        }
        aggregateRec.symptoms = [];
        if (csvRec.acuteFever) {
          aggregateRec.symptoms.push({name: 'Acute Fever and Rash', count: parseInt(csvRec.acuteFever)});
        }
        if (csvRec.diarrhoea) {
          aggregateRec.symptoms.push({name: 'Diarrhoea', count: parseInt(csvRec.diarrhoea)});
        }
        if (csvRec.influenza) {
          aggregateRec.symptoms.push({name: 'Influenza-like Illness', count: parseInt(csvRec.influenza)});
        }
        if (csvRec.prolongedFever) {
          aggregateRec.symptoms.push({name: 'Prolonged Fever', count: parseInt(csvRec.prolongedFever)});
        }
        return aggregateRec;
      }
    }
  };
});
