'use strict';

var arrayToString = function (arr) {
  var res = '';
  if (arr && arr.length > 0) {
    arr.forEach(function (row) {
      // Set default count to be 1 (individual data)
      res += '; \'' + row.name + '\': ' + (row.count ? row.count : 1);
    });
  }
  return (res.length === 0) ? '' : res.substring(2);

};
var flattenArray = function (value) {
  if (value.length > 0 && value[0].name !== undefined && value[0].count !== undefined) {
    return arrayToString(value);
  } else if (value.length === 0) {
    return '';
  }
  return JSON.stringify(value);
};

module.exports = {
  arrayToString: arrayToString,
  flattenArray: flattenArray
};
