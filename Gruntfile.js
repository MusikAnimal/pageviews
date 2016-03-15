module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-scss-lint');
  grunt.loadNpmTasks('grunt-haml-php');

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
          'public_html/pageviews.js': [
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
          'public_html/topviews/topviews.js': [
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
          'public_html/pageviews.css': 'stylesheets/pageviews.scss',
          'public_html/faq.css': 'stylesheets/faq.scss',
          'public_html/url_structure.css': 'stylesheets/url_structure.scss'
        }]
      },
      topviews: {
        options: {
          sourcemap: 'none',
          style: 'expanded'
        },
        files: [{
          'public_html/topviews/topviews.css': 'stylesheets/topviews/topviews.scss',
          'public_html/topviews/faq.css': 'stylesheets/topviews/faq.scss',
          'public_html/topviews/url_structure.css': 'stylesheets/topviews/url_structure.scss'
        }]
      },
      dist: {
        options: {
          style: 'compressed',
          sourcemap: 'none'
        },
        files: [{
          'public_html/pageviews.css': 'stylesheets/pageviews.scss',
          'public_html/faq.css': 'stylesheets/faq.scss',
          'public_html/url_structure.css': 'stylesheets/url_structure.scss',
          'public_html/topviews/topviews.css': 'stylesheets/topviews/topviews.scss',
          'public_html/topviews/faq.css': 'stylesheets/topviews/faq.scss',
          'public_html/topviews/url_structure.css': 'stylesheets/topviews/url_structure.scss'
        }]
      }
    },
    haml: {
      options: {
        enableDynamicAttributes: false
      },
      compile: {
        files: {
          'public_html/index.php': 'views/index.haml',
          'public_html/_head.php': 'views/_head.haml',
          'public_html/_footer.php': 'views/_footer.haml',
          'public_html/_modals.php': 'views/_modals.haml',
          'public_html/faq/index.php': 'views/faq.haml',
          'public_html/url_structure/index.php': 'views/url_structure.haml',

          'public_html/topviews/index.php': 'views/topviews/index.haml',
          'public_html/topviews/faq/index.php': 'views/topviews/faq.haml',
          'public_html/topviews/url_structure/index.php': 'views/topviews/url_structure.haml'
        }
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      pageviews: {
        files: {
          // order matters here
          'public_html/application.js': coreJSDependencies.concat([
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/Chart.min.js',
            'public_html/pageviews.js'
          ]),
          'public_html/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/pageviews.css'
          ]),
          'public_html/faq/application.js': coreJSDependencies,
          'public_html/faq/application.css': coreCSSDependencies.concat([
            'public_html/faq.css'
          ]),
          'public_html/url_structure/application.js': coreJSDependencies,
          'public_html/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/url_structure.css'
          ])
        }
      },
      topviews: {
        files: {
          // order matters here
          'public_html/topviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'public_html/topviews/topviews.js'
          ]),
          'public_html/topviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/topviews/topviews.css'
          ]),
          'public_html/topviews/faq/application.js': coreJSDependencies,
          'public_html/topviews/faq/application.css': coreCSSDependencies.concat([
            'public_html/topviews/faq.css'
          ]),
          'public_html/topviews/url_structure/application.js': coreJSDependencies,
          'public_html/topviews/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/topviews/url_structure.css'
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
          'public_html/application.js': ['public_html/application.js'],
          'public_html/faq/application.js': ['public_html/faq/application.js'],
          'public_html/url_structure/application.js': ['public_html/url_structure/application.js'],

          'public_html/topviews/application.js': ['public_html/topviews/application.js'],
          'public_html/topviews/faq/application.js': ['public_html/topviews/faq/application.js'],
          'public_html/topviews/url_structure/application.js': ['public_html/topviews/url_structure/application.js']
        }
      }
    }
  });

  grunt.registerTask('sass_all', ['sass:dist', 'concat']);
  grunt.registerTask('production', ['lint', 'browserify', 'sass:dist', 'concat', 'uglify', 'haml']);
  grunt.registerTask('pageviews', ['lint', 'browserify:pageviews', 'sass:pageviews', 'concat:pageviews', 'haml']);
  grunt.registerTask('topviews', ['lint', 'browserify:topviews', 'sass:topviews', 'concat:topviews', 'haml']);
  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);
};
