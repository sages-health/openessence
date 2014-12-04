'use strict';

var openMath = require('./OpenMath');

//These functions are necessary to get normal and t distributions and their inverses
// Inverse normal: probability (0,1) gets converted to mean 0 variance 1 Gaussian value
function invnorm(p) {
  var t = (p > .5) ? (1 - p) : p
  var s = Math.sqrt(-2.0 * Math.log(t))
  var a = 2.515517 + (0.802853 * s) + (0.010328 * s * s)
  var b = 1 + (1.432788 * s) + (0.189269 * s * s) + (0.001308 * s * s * s)
  var u = s - (a / b)
  return (p < .5) ? (-u) : u;
}

// Helper functions for t distribution (Log Gamma)
function LogGamma(Z) {
  var S = 1 + 76.18009173 / Z - 86.50532033 / (Z + 1) + 24.01409822 / (Z + 2) - 1.231739516 / (Z + 3) + .00120858003 / (Z + 4) - .00000536382 / (Z + 5);
  var LG = (Z - .5) * Math.log(Z + 4.5) - (Z + 4.5) + Math.log(S * 2.50662827465);
  return LG
}

// Helper functions for t distribution - Beta(A,B)
function Betinc(X, A, B) {
  var A0 = 0;
  var B0 = 1;
  var A1 = 1;
  var B1 = 1;
  var M9 = 0;
  var A2 = 0;
  var C9;
  while (Math.abs((A1 - A2) / A1) > .00001) {
    A2 = A1;
    C9 = -(A + M9) * (A + B + M9) * X / (A + 2 * M9) / (A + 2 * M9 + 1);
    A0 = A1 + C9 * A0;
    B0 = B1 + C9 * B0;
    M9 = M9 + 1;
    C9 = M9 * (B - M9) * X / (A + 2 * M9 - 1) / (A + 2 * M9);
    A1 = A0 + C9 * A1;
    B1 = B0 + C9 * B1;
    A0 = A0 / B1;
    B0 = B0 / B1;
    A1 = A1 / B1;
    B1 = 1;
  }
  return A1 / A
}

//Signum
function sign(x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

// The actual TDistribution object
// First cumulative probability
exports.cumulativeProbability =
  function cumulativeProbability(X, df) {
    if (df <= 0) {
      alert("Degrees of freedom must be positive")
    } else {
      var tcdf, betacdf;
      var A = df / 2;
      var S = A + .5;
      var Z = df / (df + X * X);
      var BT = Math.exp(LogGamma(S) - LogGamma(.5) - LogGamma(A) + A * Math.log(Z) + .5 * Math.log(1 - Z));

      if (Z < (A + 1) / (S + 2)) {
        betacdf = BT * Betinc(Z, A, .5)
      } else {
        betacdf = 1 - BT * Betinc(1 - Z, .5, A)
      }
      if (X < 0) {
        tcdf = betacdf / 2
      } else {
        tcdf = 1 - betacdf / 2
      }
    }
    return(tcdf)
  }

// And inverse Cumulative Probability - the most difficult to get
// Uses a simple interpolation algorithm involving the straight t-distribution
// With normal values as starting guesses
// At 1e-10 precision, the value is correct up to about the 5th decimal
exports.inverseCumulativeProbability =
  function inverseCumulativeProbability(T, df) {
    var epsilon = parseFloat(1e-10);
    var diff = 1;
    var out = 0;
    var temp = 0;
    if (T > 0.5) {
      out = invnorm(T);
    }
    else {
      out = -invnorm(T);
    }
    temp = this.cumulativeProbability(out, df);
    diff = sign(out) * (T - temp);
    var diff2 = diff;
    var k = 0.5;
    var out2;

    while (Math.abs(diff) > epsilon) {
      if (diff < 0) {
        out2 = out * k;
      }
      else {
        out2 = (1 + k) * out;
      }
      temp = this.cumulativeProbability(out2, df)
      diff2 = sign(out2) * (T - temp);

      if (sign(diff2) != sign(diff)) {
        k = k / 2;
        if (Math.abs(diff2) < epsilon) {
          out = out2;
        }
        out2 = out;

      }
      diff = diff2;
      out = out2;
    }
    return(out2);
  }
