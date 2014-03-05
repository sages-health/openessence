'use strict';

var files = './test-*.js';

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'browserify'],
    files: [files],
    exclude: [],
    reporters: ['progress'],
    port: 9876,
    runnerPort: 9100,
    colors: true,
    logLevel: config.LOG_DEBUG,
//    autoWatch: true,
    browsers: ['PhantomJS'],
    captureTimeout: 60000,
    singleRun: false,
    preprocessors: {files: ['browserify']}
  });
};
