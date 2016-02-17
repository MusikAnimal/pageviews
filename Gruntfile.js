module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-scss-lint');

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['javascripts/**/*.js'],
        tasks: ['browserify']
      },
      css: {
        files: 'stylesheets/**/*.scss',
        tasks: ['sass']
      }
    },
    eslint: {
      src: ['javascripts/**/*.js']
    },
    scsslint: {
      options: {
        conifg: '.scss-lint.yml',
        colorizeOutput: true
      },
      allFiles: ['stylesheets/*.scss']
    },
    browserify: {
      pageviews: {
        options: {
          transform: [['babelify', { presets: ['es2015'] }]]
        },
        files: {
          'public/application.js': [
            'javascripts/**/*.js',
            '!javascripts/**/*_test.js'
          ]
        }
      },
    },
    sass: {
      pageviews: {
        options: {
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          cwd: 'stylesheets',
          src: ['application.scss'],
          dest: 'public',
          ext: '.css'
        }]
      },
      dist: {
        options: {
          style: 'compressed',
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          cwd: 'stylesheets',
          src: ['application.scss'],
          dest: 'public',
          ext: '.css'
        }, {
          expand: true,
          cwd: 'stylesheets/top',
          src: ['application.scss'],
          dest: 'public/top',
          ext: '.css'
        }]
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      pageviews: {
        files: {
          // order matters here
          'public/application.js': [
            'vendor/javascripts/jquery.min.js',
            'vendor/javascripts/moment.min.js',
            'vendor/javascripts/bootstrap.min.js',
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/Chart.min.js',
            'public/application.js'
          ],
          'public/application.css': [
            'vendor/stylesheets/bootstrap.min.css',
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public/application.css'
          ]
        }
      }
    },
    uglify: {
      options: {
        compress: true
      },
      all: {
        files: {
          'public/application.js': ['public/application.js']
        }
      }
    }
  });

  grunt.registerTask('hamlify', 'compile haml into html', function() {
    var exec = require('child_process').exec;
    var cmds = [
      'haml views/index.haml public/index.html',
      'haml views/faq/index.haml public/faq/index.html',
      'haml views/url_structure/index.haml public/url_structure/index.html'
    ];
    cmds.forEach(function(cmd) {
      exec(cmd, function(error, stdout, stderr) {
        console.log(cmd);
        // command output is in stdout
      });
    });
  });

  grunt.registerTask('production', ['lint', 'browserify', 'sass:dist', 'concat', 'uglify:all', 'haml']);
  grunt.registerTask('pageviews', ['lint', 'browserify:pageviews', 'sass:pageviews', 'concat:pageviews', 'haml']);
  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);
  grunt.registerTask('haml', ['hamlify']);
};
