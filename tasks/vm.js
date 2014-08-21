'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var exec = childProcess.exec;
var path = require('path');
var url = require('url');
var async = require('async');
var _ = require('lodash');

// we use a dedicated VM so we don't bundle up a lot of unrelated containers
var boot2dockerArgs = ['--vm=boot2fracas'];

var runCommand = function (command, args, options, callback) {
  if (!callback) {
    callback = arguments[2];
    options = null;
  }

  var child = spawn(command, args, options);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('close', function () {
    callback(null);
  });

  return child;
};

gulp.task('vm-delete', function (done) {
  runCommand('boot2docker', boot2dockerArgs.concat(['delete']), done);
});

gulp.task('vm-init', ['vm-delete'], function (done) {
  runCommand('boot2docker', boot2dockerArgs.concat(['init']), done);
});

gulp.task('vm-up', ['vm-init'], function (done) {
  runCommand('boot2docker', boot2dockerArgs.concat(['up']), done);
});

/**
 * Build a VM. The VM is a boot2docker instance with our Docker containers configured. boot2docker must be installed
 * on your machine.
 */
gulp.task('vm', ['vm-up'], function (done) {
  async.waterfall([
    function getDockerHost (callback) {
      var dockerIpCommand = 'boot2docker ' + boot2dockerArgs.join(' ') + ' ip';
      exec(dockerIpCommand, function (err, stdout) { // exec instead of spawn so stdout is buffered
        if (err) {
          gutil.log(gutil.colors.red(dockerIpCommand, 'returned', err.code));
          return callback(err);
        }

        // Process stdout instead of outputting it. The IP address of the VM is usually 192.168.59.104,
        // but might not be if you already have a VM assigned to that IP.
        var ip = stdout.toString().match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)[0];
        var dockerEnv = _.assign({}, process.env, {
          DOCKER_HOST: 'tcp://' + ip + ':2375'
        });

        callback(null, dockerEnv);
      });
    },

    function buildElasticsearch (dockerEnv, callback) {
      runCommand('docker', ['build', '-t', 'elasticsearch', '.'], {
        cwd: path.resolve(__dirname, '..', 'docker/elasticsearch'),
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function buildRedis (dockerEnv, callback) {
      runCommand('docker', ['build', '-t', 'redis', '.'], {
        cwd: path.resolve(__dirname, '..', 'docker/redis'),
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function buildFracas (dockerEnv, callback) {
      runCommand('docker', ['build', '-t', 'fracas', '.'], {
        cwd: path.resolve(__dirname, '..'),
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function runElasticsearch (dockerEnv, callback) {
      runCommand('docker', ['run', '-d', '-p', '9200:9200', '--name', 'elasticsearch', 'elasticsearch'], {
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function runRedis (dockerEnv, callback) {
      runCommand('docker', ['run', '-d', '-p', '6379:6379', '--name', 'redis', 'redis'], {
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function runFracas (dockerEnv, callback) {
      var fracasUrl = url.format({
        protocol: 'http:',
        hostname: url.parse(dockerEnv.DOCKER_HOST).hostname,
        port: '9000'
      });

      runCommand('docker', ['run', '-d', '-p', '9000:9000',
                            '-e', 'NODE_ENV=production',
                            '-e', 'USERS=false', // allow anyone to log in
                            '-e', 'URL=' + fracasUrl,
                            '--link', 'elasticsearch:elasticsearch',
                            '--link', 'redis:redis',
                            '--name', 'fracas', 'fracas'], {
        env: dockerEnv
      }, function (err) {
        callback(err, dockerEnv);
      });
    },

    function finish (dockerEnv, callback) {
      var dockerHostname = url.parse(dockerEnv.DOCKER_HOST).hostname;

      gutil.log(gutil.colors.green('You now have a VM running at ' + dockerHostname + ' named boot2fracas.'));
      gutil.log('boot2fracas contains the following Docker containers:\n',
        '    Elasticsearch (available on port 9200)\n',
        '    Redis (available on port 6379)\n',
        '    Fracas (available on port 9000)');
      gutil.log(gutil.colors.green('Open up your web browser to\n' +
        '    http://' + dockerHostname + ':9000' +
          '\n...and let\'s get surveilling!'));

      callback(null);
    }
  ], done);
});
