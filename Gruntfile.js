'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // see https://github.com/shama/grunt-hub/issues/11
  grunt.loadNpmTasks('grunt-hub');
  grunt.renameTask('watch', 'hubWatch');

  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(function (name) {
    if (name !== 'grunt-hub') {
      grunt.loadNpmTasks(name);
    }
  });

  // configurable paths
  var yeomanConfig = {
    app: 'public',
    dist: 'dist'
  };

  grunt.initConfig({
    yeoman: yeomanConfig,
    pkg: require('./package.json'),
    env: 'dev', // this property is modified at runtime, depending on whether we're doing a full (production) build

    // build Kibana
    hub: {
      all: {
        src: ['kibana/Gruntfile.js'],
        tasks: ['build']
      }
    },

    // start server
    express: {
      options: {
        port: process.env.PORT || 9000,
        script: 'server.js'
      },
      dev: {
        options: {
          'node_env': 'development',
          debug: true
        }
      },
      prod: {
        options: {
          'node_env': 'production',
          debug: false
        }
      },
      test: {
        options: {
          'node_env': 'test',
          debug: true
        }
      }
    },

    // open web browser
    open: {
      server: {
        url: 'http://localhost:<%= express.options.port %>'
      }
    },

    watch: {
      coffee: {
        files: ['<%= yeoman.app %>/scripts/{,*/}*.coffee'],
        tasks: ['coffee:dist']
      },
      coffeeTest: {
        files: ['test/spec/{,*/}*.coffee'],
        tasks: ['coffee:test']
      },
      compass: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['compass:server']
      },
      express: {
        files: [
          'server.js',
          'server/**/*.{js,json}'
        ],
        tasks: ['express:<%= env %>'],
        options: {
          livereload: true,
          spawn: false
        }
      },
      livereload: {
        // install the LiveReload extension for your browser of choice to get this to work
        options: {
          livereload: true
        },
        files: [
          '<%= yeoman.app %>/{,*/}*.html',
          '{.tmp,<%= yeoman.app %>}/styles/{,*/}*.css',
          '{.tmp,<%= yeoman.app %>}/scripts/{,*/}*.js',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/*',
            '!<%= yeoman.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        '<%= yeoman.app %>/scripts/{,*/}*.js'
      ]
    },
    coffee: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/scripts',
          src: '{,*/}*.coffee',
          dest: '.tmp/scripts',
          ext: '.js'
        }]
      },
      test: {
        files: [{
          expand: true,
          cwd: 'test/spec',
          src: '{,*/}*.coffee',
          dest: '.tmp/spec',
          ext: '.js'
        }]
      }
    },
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>/styles',
        cssDir: '.tmp/styles',
        generatedImagesDir: '.tmp/images/generated',
        imagesDir: '<%= yeoman.app %>/images',
        javascriptsDir: '<%= yeoman.app %>/scripts',
        fontsDir: '<%= yeoman.app %>/styles/fonts',
        importPath: '<%= yeoman.app %>/bower_components',
        httpImagesPath: '/images',
        httpGeneratedImagesPath: '/images/generated',
        httpFontsPath: '/styles/fonts',
        relativeAssets: false
      },
      dist: {},
      server: {
        options: {
          debugInfo: true
        }
      }
    },

    // filerev operates on scripts in /dist, so it must be run after uglify (which puts the scripts there)
    filerev: {
      scripts: {
        src: 'dist/public/scripts/{,*/}*.js'
      },
      styles: {
        src: 'dist/public/styles/{,*/}*.css'
      },
      images: {
        src: 'dist/public/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
      },
      fonts: {
        src: 'dist/public/styles/fonts/*'
      }
    },

    /* useminPrepare adds configs at runtime for concat, uglify, and cssmin:
     * concat concatenates files and saves them in .tmp/concat
     * uglify runs uglify on the files in .tmp/concat/scripts and outputs to dist/scripts
     * cssmin minifies CSS in .tmp/concat and outputs to dist/styles
     */
    useminPrepare: {
      html: 'views/login.html',
      options: {
        dest: 'dist/public'
      }
    },
    usemin: {
      html: ['dist/views/*.html'], // TODO add fragments
      css: ['<%= yeoman.dist %>/public/styles/{,*/}*.css'],
      options: {
        assetsDirs: [
          '<%= yeoman.dist %>/public'
        ]
      }
    },
    // imagemin has a Windows issue, see https://github.com/gruntjs/grunt-contrib-imagemin/issues/108
    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg}',
          dest: '<%= yeoman.dist %>/public/images'
        }]
      }
    },
    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/public/images'
        }]
      }
    },

    // By default, your `index.html` <!-- Usemin Block --> will take care of
    // minification. This option is pre-configured if you do not wish to use Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css',
    //         '<%%= yeoman.app %>/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    // uglify: {
    //   dist: {
    //     files: {
    //       '<%%= yeoman.dist %>/scripts/scripts.js': [
    //         '<%%= yeoman.dist %>/scripts/scripts.js'
    //       ]
    //     }
    //   }
    // },

    htmlmin: {
      views: {
        files: [
          {
            expand: true,
            src: ['views/*.html'],
            dest: 'dist'
          }
        ]
      },
      dist: {
        options: {
          /*removeCommentsFromCDATA: true,
          // https://github.com/yeoman/grunt-usemin/issues/44
          //collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true*/
        },
        files: [{
          expand: true,
          src: ['<%= yeoman.app %>/views/*.html'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },

    // Put files not handled in other tasks here
    copy: {
      dist: {
        files: [
          {
            expand: true,
            dot: true,
            cwd: '<%= yeoman.app %>',
            dest: '<%= yeoman.dist %>/public',
            src: [
              '*.{ico,png,txt}',
              '.htaccess',
              'bower_components/**/*',
              'images/{,*/}*.{gif,webp}',
              'styles/fonts/*'
            ]
          },
          {
            expand: true,
            cwd: '.tmp/images',
            dest: '<%= yeoman.dist %>/public/images',
            src: [
              'generated/*'
            ]
          }
        ]
      }
    },

    concurrent: {
      server: [
        'coffee:dist',
        'compass:server'
      ],
      test: [
        'coffee',
        'compass'
      ],
      dist: [
        'coffee',
        'compass:dist',
        'imagemin',
        'svgmin',
        'htmlmin'
      ]
    },
    cdnify: {
      dist: {
        html: ['<%= yeoman.dist %>/*.html']
      }
    },
    ngmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/scripts', // must be run after concat and before uglify (which copies scripts to dist)
          src: '*.js',
          dest: '.tmp/concat/scripts'
        }]
      }
    },

    karma: {
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      }
    }
  });

  grunt.registerTask('server', function (target) {
    if (target === 'build' || target === 'prod' || target === 'production') {
      grunt.config('env', 'prod');
      grunt.task.run([
        'build',
        'express:prod', // FIXME production build is currently broken
        'open',
        'watch'
      ]);
    } else {
      grunt.config('env', 'dev');
      grunt.task.run([
        'clean:server',
        'concurrent:server',
        'express:dev',
        'open',
        'watch'
      ]);
    }
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
    'karma'
  ]);

  grunt.registerTask('build', [
    'hub', // build kibana
    'clean:dist', // no incremental builds in Grunt (unlike Gradle) :(
    'jshint',
    'useminPrepare',
    'concurrent:dist',
    'concat', // this task is generated by useminPrepare
    'ngmin',
    'copy:dist',
    'cdnify',
    'cssmin', // generated by useminPrepare
    'uglify', // generated by useminPrepare, puts uglified scripts in dist
    'filerev',
    'usemin'
  ]);

  grunt.registerTask('default', [
    'test',
    'build'
  ]);
};
