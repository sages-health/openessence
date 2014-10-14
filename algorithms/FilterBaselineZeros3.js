'use strict';

var openMath = require('./OpenMath');
/*
 Array.prototype.median = function () {
 var v = this.slice(0)
 v.sort(function (a, b) {
 return a - b;
 });
 var half = Math.floor(v.length / 2);
 if (v.length % 2) {
 return v[half];
 }
 else {
 return (v[half - 1] + v[half]) / 2.0;
 }
 }

 Array.prototype.size = function () {
 return([this.length, this[0].length])
 }

 Array.prototype.print = function () {
 for (i = 0; i < this.length; i++) {
 document.write(this[i].toFixed(4), '<br>')
 }
 }
 */
var exports = module.exports = {};

exports.median = function median(vec) {
  var v = vec.slice(0);
  //var v = openMath.slice(vec, 0);
  v.sort(function (a, b) {
    return a - b;
  });

  var half = Math.floor(v.length / 2);
  if (v.length % 2) {
    return v[half];
  }

  else {
    return (v[half - 1] + v[half]) / 2.0;
  }
};

exports.size = function (vec) {
  return([vec.length, vec[0].length]);
};

exports.filterBaselineZerosTest =
  function filterBaselineZerosTest(d) {
    var median = d.median();
    //var nonzeromedian = (d.subset(openMath.find(d))).median();
    var nonzeromedian = openMath.median(openMath.subset2(d, openMath.find(d)));
    return (median > 0 || nonzeromedian > 4);
  };

//////////////////////////////////////////////////////
// The actual main function
exports.filterBaselineZeros =
  function filterBaselineZeros(data) {

    var dt = data.slice(0);

    var testData = [];
    var ndxOK = [];
    var ndxStart = [];
    var ndxEnd = [];
    var numZerosTest = [];
    var minNumZeros = 3;
    var dtOut = [];
    var thresholdProb = 0.01;
//

    testData = dt.slice(0);
    testData.unshift(1);

    for (var i = 0; i < testData.length - 1; i++) {
      if (testData[i] !== 0 && testData[i + 1] === 0) {
        ndxStart.push(i);
      }
    }

    testData = dt.slice(0);
    testData.push(1);

    for (i = 0; i < testData.length - 1; i++) {
      if (testData[i] === 0 && testData[i + 1] !== 0) {
        ndxEnd.push(i);
      }
    }

    var w = 0;

    // alert(ndxEnd)
    // alert(ndxStart)

    for (i = 0; i < ndxStart.length; i++) {
      //   alert([ndxEnd[i]-ndxStart[i]+1,i])
      numZerosTest.push([(ndxEnd[i] - ndxStart[i] + 1), i]);
    }

    // alert('num0 before ' + numZerosTest)
    numZerosTest.sort(function (a, b) {
      return b[0] - a[0];
    });
    //  alert('num0 after ' + numZerosTest)
    //  alert(testData)


    for (i = 0; i < dt.length; i++) {
      ndxOK.push(i);
    }
    var ndxtemp = ndxOK.slice(0)
    // alert(numZerosTest[0][0]+ ","+ numZerosTest[0][1]+ "," + numZerosTest[1][0]+ "," + numZerosTest[1][1])

    var ndxout = [];

    for (i = 0; i < numZerosTest.length; i++) {
      ndxtemp = ndxOK.slice(0)
      var key = numZerosTest[i][1];
      var val = numZerosTest[i][0];
      var k;
      //     alert("key " + key + "val " + val+ "and "+ numZerosTest[i,1])
      //     alert(numZerosTest)
      if (val < minNumZeros) {
        continue;
      }

      if (i === 0) {
        k = ndxStart[key];
      }
      else if (ndxStart[key] > k) {
        for (w = 0; w <= ndxtemp.length; w++) {
          if (ndxtemp[w] == ndxStart[key]) {
            break;
          }
        }
        k = w;
      } else {
        for (w = 0; w <= ndxtemp.length; w++) {
          if (ndxtemp[w] === ndxStart[key]) {
            break;
          }
        }
        k = w;
      }

//alert('ndxtemp length ' + ndxtemp.length)
      for (var j = ndxStart[key]; j <= ndxEnd[key]; j++) {
        //         alert('ndxtemp ' + ndxtemp + 'k ' + k + ' len '+ len )
        //         alert(ndxStart[key] + ' start ' + ndxEnd[key] + 'finish')
        ndxtemp.splice(k, 1);
        //          alert('ndxOK ' + ndxtemp)
      }

      var NumValuesOut = ndxOK.length - ndxEnd[key] + ndxStart[key] - 1;

      if (NumValuesOut === 0) {
        break;
      }
      //dtOut = dt.subset(ndxtemp);
      dtOut = openMath.subset2(dt, ndxtemp);
      nsum = 0;
      for (var p = 0; p < dtOut.length; p++) {
        if (dtOut[p] === 0) {
          nsum++;
        }
      }
      var numZerosOut = Math.max(1, nsum);

      if (Math.pow(numZerosOut / NumValuesOut, val) > thresholdProb) {
        break;
      }

      ndxOK = ndxtemp.slice(0);
    } // End the for-loop
    // ndxOK = ndxtemp.slice(0);

    //dtOut = dt.subset(ndxOK);
    dtOut = openMath.subset2(dt, ndxOK);
    var nsum = 0;
    for (var h = 0; h < dtOut.length; h++) {
      if (dtOut[h] > 0) {
        nsum++;
      }
    }
    if (nsum < 2) {
      ndxOK = [0];
    }

    return ndxOK;
  };
 