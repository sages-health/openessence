'use strict';
var exports = module.exports = {};

/**
 *
 */
// This is a binary search function to be used with linear interpolation
exports.binarySearch = function binarySearch(vec, find) {
  var low = 0, high = vec.length - 1,
    i;
  //alert('again'+low+'_'+high+'_'+find)
  if (find === 0) {
    low = 1;
    high = 0;
    i = 0;
  }

  while (low <= high) {
    //  document.writeln('<br>FIND ',find, ' I ',i, 'low ', low, ' high ', high)
    i = Math.floor((low + high) / 2);
    if (vec[i] < find) {
      low = i + 1;
      continue;
    }

    if (vec[i] > find) {
      high = i - 1;
      continue;
    }

    return i;

  }

  return i;
//  if (this[i] == find) {alert('xhrun');return [i,i]}
//  else if (this[i] > find) {alert('hrun');return[i,i+1]}
//  else { alert('hruk'+i + find);return [i-1,i]}
  // alert('alert' + i)

};

// linear interpolation - slightly simplified version
exports.interp1 = function interp1(list1, list2, x) {

  var i = this.binarySearch(list1, x);
  //  alert(i);
  var last = list1.length - 1;
  // In case stat is 0 or smaller than the first item in the list1(which is 0), return 1
  if (x === 0 || x < list1[0]) {
    return list2[0];
  }
  // In case stat is larger than the last value, return the last value + linear adjustment
  else if (x > list1[last]) {
    return (list2[last] + ((x - list1[last]) * ((list2[last] - list2[last - 1]) / (list1[last] - list1[last]))));
  }
  // In case stat is larger than the list value for the corresponding index i, return the corresponding + adjustment
  else if (x > list1[i]) {
    return (list2[i] + ((x - list1[i]) * ((list2[i + 1] - list2[i]) / (list1[i + 1] - list1[i]))));
  }
  // In case stat is smaller than the list value for the corresponding index i, return the previous value + adjustment
  else if (x < list1[i]) {
    return (list2[i - 1] + ((x - list1[i - 1]) * ((list2[i ] - list2[i - 1]) / (list1[i] - list1[i - 1]))));
  }
  // In case of exact equality, return the list item
  else if (x === list1[i]) {
    return list2[i];
  }
};

// Just used for debugging
exports.dispfloat = function dispfloat(arr) {
  var A = [];
  for (var i = 0; i < arr.length; i++) {
    A.push(parseFloat(arr[i]).toFixed(4));
  }
  return(A);
};

// Equivalent of subset operation in Matlab
exports.subset2 = function subset2(vec1, vec2) {
  var vec3 = [];
  for (var i = 0; i < vec2.length; i++) {
    vec3.push(vec1[vec2[i]]);
  }
  return(vec3);
};

/*
 // Equivalent of subset operation in Matlab adjusting for the array starting at 0 - used in GS SAGES
 exports.subset2_js = function subset2_js (vec1, vec2) {
 var vec4 = [];
 for (var i = 0; i < vec2.length; i++) {
 vec4.push(vec1[vec2[i] - 1]);
 }
 return(vec4);
 };
 */

// Supporting function for IsHoliday checking something like 3rd Monday of the month
function getNQ(n, q, year, month) {
  var d = new Date();
  d.setFullYear(year, parseInt(month - 1), 1);

  var dow = d.getDay();
// formula requires Sunday to be zero
  var dom = 1 + (q - 1) * 7 + (n + 7 - dow) % 7;
  return dom;
}

function getNL(nd, n, year, month) {
  var d = new Date();
  d.setFullYear(year, parseInt(month - 1), nd);
  var dow = d.getDay();
// formula requires Sunday to be zero
  var dom = nd - (dow - n + 7) % 7;
  return dom;
}

// Input the starting date; output - the holiday vector (according to US holidays)
// Something that we might want to change if working in another country
exports.isHoliday = function isHoliday(startDate, len) {
  var hols = [], day, month, weekday, year;

  for (var i = 0; i < len; i++) {
    var bH = false;
    var mil = 86400000;
    var startDate2 = new Date(startDate.getTime() + mil * i);
    day = startDate2.getDate();
    month = startDate2.getMonth() + 1;  // month starts from 0
    weekday = startDate2.getDay();
    year = startDate2.getFullYear();

    if ((month === 1 && day === 1) || (month === 7 && day === 4) || (month === 11 && day === 11) ||
      (month === 12 && day === 25)) {
      bH = true;
    }
    if (weekday === 2 && ((month === 1 && day === 2) || (month === 7 && day === 5) || (month === 11 && day === 12) ||
      (month === 12 && day === 26))) {
      bH = true;
    }
    if (weekday === 6 && ((month === 12 && day === 31) || (month === 7 && day === 3) || (month === 11 && day === 10) ||
      (month === 12 && day === 24))) {
      bH = true;
    }
    // Martin Luther King Jr. Day
    if (month === 1 && day === getNQ(1, 3, year, month)) {
      bH = true;
      //     alert('MLK DAY')
    }
    // President's Day
    if (month === 2 && day === getNQ(1, 3, year, month)) {
      bH = true;
      //   alert('PRESIDENTs DAY')
    }
    // Memorial Day
    if (month === 5 && day === getNL(31, 1, year, month)) {
      bH = true;
    }
    // Labor Day
    if (month === 9 && day === getNQ(1, 1, year, month)) {
      bH = true;
    }
    // Columbus Day
    if (month === 10 && day === getNQ(1, 2, year, month)) {
      bH = true;
    }
    // Thanksgiving
    if (month === 11 && day === getNQ(4, 4, year, month)) {
      bH = true;
    }

    if (bH === true) {
      hols.push(1);
    }
    else {
      hols.push(0);
    }
  }
  return(hols);
};


//Simple sort
exports.nsort = function nsort(vals) {
  return vals.sort(function (a, b) {
    return a - b;
  });
};

//Checks if array components are numbers
exports.numbers = function numbers(vals) {
  var nums = [];
  if (vals === null) {
    return nums;
  }

  for (var i = 0; i < vals.length; i++) {
    var n = Number(vals[i]);
    if (!isNaN(n)) {
      vals.push(n);
    }
  }
  return nums;
};

// Percentile function - input percentile is in 0 to 1 range
exports.percentile = function percentile(vals, ptile) {
  vals = this.numbers(vals);
  if (vals.length === 0 || ptile === null || ptile < 0) {
    return NaN;
  }

  // Fudge anything over 100 to 1.0
  if (ptile > 1) {
    ptile = 1;
  }
  vals = this.nsort(vals);
  var i = (vals.length * ptile) - 0.5;
  if ((i || 0) === i) {
    return vals[i];
  }
  // interpolated percentile -- using Estimation method
  var intPart = i > 0 ? i : 0;
  var fract = i - intPart;
  return (1 - fract) * vals[intPart] + fract * vals[intPart + 1];
};

/*
 // Used for debugging
 exports.print2 = function print2 (d) {
 for (var i = 0; i < d.length; i++) {
 for (var j = 0; j < d[0].length; j++) {
 document.write(d[i][j], ',');
 }
 document.write('<br>');
 }
 };
 */

// Normal Cumulative Distribution Function of standard normal random variable: mean 0 and variance 1

exports.normcdf = function normcdf(z) {
  var t = (z > 0) ? z : (-z);
  var p = 1 - Math.pow((1 + (t * (0.0498673470 + t * (0.0211410061 + t *
    (0.0032776263 + t * (0.0000380036 + t * (0.0000488906 + t *
      0.0000053830))))))), -16) / 2;
  return (z > 0) ? p : (1 - p);
};

// Find all the vector indices which are less than a given falue
exports.findLT = function findLT(d, value) {
  if (d.length !== null) {
    var r = [];
    for (var j = 0; j < d.length; j++) {
      if (d[j] < value) {
        r.push(j);
      }
    }
    //  alert(r)
    return r;
  }
  return [0];
};

// Find all the vector indices that are greater than 0
exports.find = function find(d) {
  if (d.length !== null) {
    var r = [];
    for (var i = 0; i < d.length; i++) {
      if (d[i] > 0.0) {
        r.push(i);
      }
    }

    return r;
  }
  return [0];
};


/*
 // Vector Absolute Value operation
 function arrayAbs (arrayin) {
 if (arrayin.length !== null) {
 var r = [];
 for (var i = 0; i < arrayin.length; i++) {
 r.push(Math.abs(arrayin[i]));
 }
 return r;
 }
 return [0];
 }


 // Vector Modulus operation
 function arrayMod (d, x) {
 if (d.length > 0) {
 var r = [];
 for (var i = 0; i < d.length; i++) {
 r.push((parseInt(d[i]) + x) % x);
 }
 return r;
 }
 return [0];
 }

 //Matlab ismember: returns an array containing 1 (true) where the data in A is found in B. Elsewhere, it returns 0 (false)
 function isMember (A, B) {
 var N = A.length, M = B.length, r = new Array(N);
 for (var i = 0; i < N; i++) {
 r[i] = 0;
 for (j = 0; j < M; j++) {
 if (A[i] == B[j]) {
 r[i] = 1;
 break;
 }
 }
 }
 return r;
 }


 // Subset of vector d from i1 to i2
 function dataVec (d, i1, i2) {
 if (0 <= i1 && i2 < d.length) {
 var r = Array(i2 - i1 + 1);
 for (var j = 0; j < (i2 - i1 + 1); j++) {
 r[j] = d[i1 + j];
 }
 return r;
 }
 return [0];
 }
 */

// Adding a constant to an array
exports.arrayAdd = function arrayAdd(vec1, num) {
  for (var i = 0; i < vec1.length; i++) {
    vec1[i] += num;
  }
  return(vec1);
};

// Mean as an array prototype
exports.average = function average(vec) {
  var sum = 0;
  for (var i = 0; i < vec.length; i++) {
    if (isNaN(vec[i]) | vec[i] === null) {
      return null;
    }
    sum += Number(vec[i]);
    // document.write('<br>',sum,'sum_',this[ll],'_thisll_<br>')
  }
  return(sum / vec.length);
};

// Standard deviation as array prototype
exports.std = function std(vec) {
  var sum2 = 0;
  var mean = this.average(vec);

  for (var ii = 0; ii < vec.length; ii++) {
    if (isNaN(vec[ii]) || vec[ii] === null) {
      return null;
    }
    sum2 = sum2 + (vec[ii] - mean) * (vec[ii] - mean);
  }
  return(Math.sqrt(sum2 / (vec.length - 1)));
};

//Create a vector of constants (x) of the length  (len)
exports.valueVec =
  function valueVec(x, len) {
    var val = [];
    for (var i = 0; i < len; i++) {
      val.push(x);
      // document.write('<br>',sum,'sum_',this[ll],'_thisll_<br>')
    }
    return(val);
  };

// Equivalent to Matlab reshape (when going from vector to MxN matrix)
function reshape(arrayin, M, N) {
  var out = [];

  for (var i = 0; i < M; i++) {
    out[i] = new Array();
    for (var j = 0; j < N; j++) {
      out[i][j] = 0;
    }
  }

  var n = 0;
  for (var j = 0; j < N; j++) {
    for (var i = 0; i < M; i++) {
      out[i][j] = arrayin.slice([n], [n + 1]);
      n++;
    }
  }

  return out;
}

// Equivalent to Matlab reshape (when going from matrix to vector)
function reshapeback(arrayin) {
  var M = arrayin.length, N = arrayin[0].length, n = 0;
  var out = Array(M * N);
  for (var j = 0; j < N; j++) {
    for (var i = 0; i < M; i++) {
      out[n++] = arrayin[i][j];
    }
  }
  return out;
}

// equivalent to transpose operation in matlab
function transpose(arrayin) {
  var M = arrayin.length, N = arrayin[0].length;
  if (N === undefined) {
    alert('No N');
  }
  var out = [];
  for (var i = 0; i < N; i++) {
    out[i] = [];
    for (var j = 0; j < M; j++) {
      out[i][j] = 0;
    }
  }

  var n = 0;
  for (var j = 0; j < N; j++) {
    for (var i = 0; i < M; i++) {
      out[j][i] = arrayin[i][j];
      n++;
    }
  }
  return out;
}

// This one is a mean function - will also work on 2-dimensional data
function mean(arrayin) {
  var M = arrayin.length, N = arrayin[0].length;
  var out = [N];
  var sumj = [M];

  if (N === undefined) {
    return this.average(arrayin);
  }
  for (var j = 0; j < N; j++) {
    for (var i = 0; i < M; i++) {
      out[i] = arrayin[i][j];
    }
    sumj[j] = this.average(out);
  }
  return sumj;
}

// To see if the vector is a vector of zeros
exports.ifZero = function ifZero(vec) {
  var flag = true;
  for (var mm = 0; mm < vec.length; mm++) {
    if (vec[mm] > 0) {
      flag = false;
      break;
    }
  }
  return(flag);
};

// Implementing the signum function
exports.sign =
  function sign(x) {
    return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
  };

// Array vector max
exports.max = function max(vec) {
  var m = vec[0];
  for (var i = 1; i < vec.length; i++) {
    if (vec[i] > m) {
      m = vec[i];
    }
  }
  return m;
};

// Array vector min
exports.min = function min(vec) {
  var m = vec[0];
  for (var i = 1; i < vec.length; i++) {
    if (vec[i] < m) {
      m = vec[i];
    }
  }
  return m;
};



