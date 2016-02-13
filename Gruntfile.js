module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-babel');
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
      src: ['javascripts/application.js']
    },
    scsslint: {
      options: {
        conifg: '.scss-lint.yml',
        colorizeOutput: true
      },
      allFiles: ['stylesheets/*.scss']
    },
    babel: {
      options: {
        presets: ['es2015']
      },
      pageviews: {
        files: {
          'public/application.js': ['javascripts/application.js'],
          'public/helpers.js' : ['javascripts/helpers.js'],
          'public/templates.js': ['javascripts/templates.js'],
          'public/site_map.js': ['javascripts/site_map.js'],
          'public/config.js': ['javascripts/config.js'],
          'public/chart.js': ['javascripts/chart.js']
        }
      },
      // top: {
      //   files: {
      //     'public/top/application.js': ['javascripts/top/application.js'],
      //     'public/helpers.js' : ['javascripts/helpers.js'],
      //     'public/templates.js': ['javascripts/templates.js'],
      //     'public/config.js': ['javascripts/config.js'],
      //     'public/chart.js': ['javascripts/chart.js']
      //   }
      // }
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
      // top: {
      //   options: {
      //     sourcemap: 'none'
      //   },
      //   files: [{
      //     expand: true,
      //     cwd: 'stylesheets/top',
      //     src: ['application.scss'],
      //     dest: 'public/top',
      //     ext: '.css'
      //   }]
      // },
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
          'public/application.js': [
            'vendor/javascripts/jquery.min.js',
            'vendor/javascripts/moment.min.js',
            'vendor/javascripts/bootstrap.min.js',
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/Chart.min.js',
            'javascripts/polyfills.js',
            'public/site_map.js',
            'public/templates.js',
            'public/config.js',
            'public/helpers.js',
            'public/chart.js',
            'public/application.js'
          ],
          'public/application.css': [
            'vendor/stylesheets/bootstrap.min.css',
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public/application.css'
          ]
        }
      },
      // top: {
      //   files: {
      //     'public/top/application.js': [
      //       'vendor/javascripts/jquery.min.js',
      //       'vendor/javascripts/moment.min.js',
      //       'vendor/javascripts/bootstrap.min.js',
      //       'vendor/javascripts/select2.min.js', // may not need
      //       'vendor/javascripts/daterangepicker.min.js',
      //       'vendor/javascripts/Chart.min.js',
      //       'javascripts/site_map.js',
      //       'public/templates.js',
      //       'public/config.js',
      //       'public/helpers.js',
      //       'public/chart.js',
      //       'public/top/application.js'
      //     ]
      //   }
      // }
    },
    uglify: {
      options: {
        compress: true
      },
      all: {
        files: {
          'public/application.js': ['public/application.js'],
          // 'public/top/application.js': ['public/top/application.js']
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

  grunt.registerTask('production', ['lint', 'babel', 'sass:dist', 'concat', 'uglify:all', 'haml']);
  grunt.registerTask('pageviews', ['lint', 'babel:pageviews', 'sass:pageviews', 'concat:pageviews', 'haml']);
  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);
  grunt.registerTask('haml', ['hamlify']);
};
