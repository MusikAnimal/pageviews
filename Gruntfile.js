module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-scss-lint');

  const coreJSDependencies = [
    'vendor/javascripts/jquery.min.js',
    'vendor/javascripts/moment.min.js',
    'vendor/javascripts/bootstrap.min.js'
  ];
  const coreCSSDependencies = [
    'vendor/stylesheets/bootstrap.min.css'
  ];

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
      allFiles: ['stylesheets/**/*.scss']
    },
    browserify: {
      pageviews: {
        options: {
          transform: [['babelify', { presets: ['es2015'] }]]
        },
        files: {
          'public/pageviews.js': [
            'javascripts/shared/*.js',
            'javascripts/pageviews.js'
          ]
        }
      },
      topviews: {
        options: {
          transform: [['babelify', { presets: ['es2015'] }]]
        },
        files: {
          'public/topviews/topviews.js': [
            'javascripts/shared/*.js',
            'javascripts/topviews/topviews.js'
          ]
        }
      }
    },
    sass: {
      pageviews: {
        options: {
          sourcemap: 'none',
          style: 'expanded'
        },
        files: [{
          'public/pageviews.css': 'stylesheets/pageviews.scss',
          'public/faq.css': 'stylesheets/faq.scss',
          'public/url_structure.css': 'stylesheets/url_structure.scss'
        }]
      },
      topviews: {
        options: {
          sourcemap: 'none',
          style: 'expanded'
        },
        files: [{
          'public/topviews/topviews.css': 'stylesheets/topviews/topviews.scss',
          'public/topviews/faq.css': 'stylesheets/topviews/faq.scss',
          'public/topviews/url_structure.css': 'stylesheets/topviews/url_structure.scss'
        }]
      },
      dist: {
        options: {
          style: 'compressed',
          sourcemap: 'none'
        },
        files: [{
          'public/pageviews.css': 'stylesheets/pageviews.scss',
          'public/faq.css': 'stylesheets/faq.scss',
          'public/url_structure.css': 'stylesheets/url_structure.scss',
          'public/topviews/topviews.css': 'stylesheets/topviews/topviews.scss',
          'public/topviews/faq.css': 'stylesheets/topviews/faq.scss',
          'public/topviews/url_structure.css': 'stylesheets/topviews/url_structure.scss'
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
          'public/application.js': coreJSDependencies.concat([
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/Chart.min.js',
            'public/pageviews.js'
          ]),
          'public/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public/pageviews.css'
          ]),
          'public/faq/application.js': coreJSDependencies,
          'public/faq/application.css': coreCSSDependencies.concat([
            'public/faq.css'
          ]),
          'public/url_structure/application.js': coreJSDependencies,
          'public/url_structure/application.css': coreCSSDependencies.concat([
            'public/url_structure.css'
          ])
        }
      },
      topviews: {
        files: {
          // order matters here
          'public/topviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'public/topviews/topviews.js'
          ]),
          'public/topviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public/topviews/topviews.css'
          ]),
          'public/topviews/faq/application.js': coreJSDependencies,
          'public/topviews/faq/application.css': coreCSSDependencies.concat([
            'public/topviews/faq.css'
          ]),
          'public/topviews/url_structure/application.js': coreJSDependencies,
          'public/topviews/url_structure/application.css': coreCSSDependencies.concat([
            'public/topviews/url_structure.css'
          ])
        }
      }
    },
    uglify: {
      options: {
        compress: true
      },
      all: {
        files: {
          'public/application.js': ['public/application.js'],
          'public/faq/application.js': ['public/faq/application.js'],
          'public/url_structure/application.js': ['public/url_structure/application.js'],

          'public/topviews/application.js': ['public/topviews/application.js'],
          'public/topviews/faq/application.js': ['public/topviews/faq/application.js'],
          'public/topviews/url_structure/application.js': ['public/topviews/url_structure/application.js']
        }
      }
    }
  });

  grunt.registerTask('views', 'copy views to public', function() {
    // FIXME: rewrite to programmatically copy files
    var exec = require('child_process').exec;
    var cmds = [
      'cp views/index.php public/index.php',
      'cp views/faq.php public/faq/index.php',
      'cp views/url_structure.php public/url_structure/index.php',
      'cp views/topviews/index.php public/topviews/index.php',
      'cp views/topviews/faq.php public/topviews/faq/index.php',
      'cp views/topviews/url_structure.php public/topviews/url_structure/index.php'
    ];
    cmds.forEach(function(cmd) {
      exec(cmd, function(error, stdout, stderr) {
        console.log(cmd);
        // command output is in stdout
      });
    });
  });

  grunt.registerTask('sass_all', ['sass:dist', 'concat']);
  grunt.registerTask('production', ['lint', 'browserify', 'sass:dist', 'concat', 'uglify', 'views']);
  grunt.registerTask('pageviews', ['lint', 'browserify:pageviews', 'sass:pageviews', 'concat:pageviews', 'views']);
  grunt.registerTask('topviews', ['lint', 'browserify:topviews', 'sass:topviews', 'concat:topviews', 'views']);
  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);
};
