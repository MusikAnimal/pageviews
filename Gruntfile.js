module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-scss-lint');
  grunt.loadNpmTasks('grunt-haml-php');
  grunt.loadNpmTasks('grunt-jsdoc');

  const coreJSDependencies = [
    'vendor/javascripts/jquery.min.js',
    'public_html/jquery.i18n.js',
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
    jsdoc: {
      dist: {
        src: ['javascripts/**/*.js'],
        options: {
          destination: 'doc',
          package: 'package.json',
          configure: 'doc/conf.json'
        }
      }
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
      },
      langviews: {
        options: {
          transform: [['babelify', { presets: ['es2015'] }]]
        },
        files: {
          'public_html/langviews/langviews.js': [
            'javascripts/shared/*.js',
            'javascripts/langviews/langviews.js'
          ]
        }
      },
      siteviews: {
        options: {
          transform: [['babelify', { presets: ['es2015'] }]]
        },
        files: {
          'public_html/siteviews/siteviews.js': [
            'javascripts/shared/*.js',
            'javascripts/siteviews/siteviews.js'
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
      langviews: {
        options: {
          sourcemap: 'none',
          style: 'expanded'
        },
        files: [{
          'public_html/langviews/langviews.css': 'stylesheets/langviews/langviews.scss',
          'public_html/langviews/faq.css': 'stylesheets/langviews/faq.scss',
          'public_html/langviews/url_structure.css': 'stylesheets/langviews/url_structure.scss'
        }]
      },
      siteviews: {
        options: {
          sourcemap: 'none',
          style: 'expanded'
        },
        files: [{
          'public_html/siteviews/siteviews.css': 'stylesheets/siteviews/siteviews.scss',
          'public_html/siteviews/faq.css': 'stylesheets/siteviews/faq.scss',
          'public_html/siteviews/url_structure.css': 'stylesheets/siteviews/url_structure.scss'
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
          'public_html/topviews/url_structure.css': 'stylesheets/topviews/url_structure.scss',
          'public_html/langviews/langviews.css': 'stylesheets/langviews/langviews.scss',
          'public_html/langviews/faq.css': 'stylesheets/langviews/faq.scss',
          'public_html/langviews/url_structure.css': 'stylesheets/langviews/url_structure.scss',
          'public_html/siteviews/siteviews.css': 'stylesheets/siteviews/siteviews.scss',
          'public_html/siteviews/faq.css': 'stylesheets/siteviews/faq.scss',
          'public_html/siteviews/url_structure.css': 'stylesheets/siteviews/url_structure.scss'
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
          'public_html/_lang_selector.php': 'views/_lang_selector.haml',
          'public_html/_modals.php': 'views/_modals.haml',
          'public_html/_browser_check.php': 'views/_browser_check.haml',
          'public_html/faq/index.php': 'views/faq.haml',
          'public_html/url_structure/index.php': 'views/url_structure.haml',

          'public_html/topviews/index.php': 'views/topviews/index.haml',
          'public_html/topviews/faq/index.php': 'views/topviews/faq.haml',
          'public_html/topviews/url_structure/index.php': 'views/topviews/url_structure.haml',

          'public_html/langviews/index.php': 'views/langviews/index.haml',
          'public_html/langviews/faq/index.php': 'views/langviews/faq.haml',
          'public_html/langviews/url_structure/index.php': 'views/langviews/url_structure.haml',

          'public_html/siteviews/index.php': 'views/siteviews/index.haml',
          'public_html/siteviews/faq/index.php': 'views/siteviews/faq.haml',
          'public_html/siteviews/url_structure/index.php': 'views/siteviews/url_structure.haml'
        }
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      i18n: {
        files: {
          'public_html/jquery.i18n.js': [
            'vendor/javascripts/jquery.i18n/jquery.i18n.js',
            'vendor/javascripts/jquery.i18n/jquery.i18n.messagestore.js',
            'vendor/javascripts/jquery.i18n/jquery.i18n.parser.js',
            'vendor/javascripts/jquery.i18n/jquery.i18n.emitter.js',
            'vendor/javascripts/jquery.i18n/jquery.i18n.language.js'
          ]
        }
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
      },
      langviews: {
        files: {
          // order matters here
          'public_html/langviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/bootstrap-typeahead.js',
            'vendor/javascripts/simpleStorage.js',
            'public_html/langviews/langviews.js'
          ]),
          'public_html/langviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/langviews/langviews.css'
          ]),
          'public_html/langviews/faq/application.js': coreJSDependencies,
          'public_html/langviews/faq/application.css': coreCSSDependencies.concat([
            'public_html/langviews/faq.css'
          ]),
          'public_html/langviews/url_structure/application.js': coreJSDependencies,
          'public_html/langviews/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/langviews/url_structure.css'
          ])
        }
      },
      siteviews: {
        files: {
          // order matters here
          'public_html/siteviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/select2.min.js',
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/Chart.min.js',
            'public_html/siteviews/siteviews.js'
          ]),
          'public_html/siteviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/select2.min.css',
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/siteviews/siteviews.css'
          ]),
          'public_html/siteviews/faq/application.js': coreJSDependencies,
          'public_html/siteviews/faq/application.css': coreCSSDependencies.concat([
            'public_html/siteviews/faq.css'
          ]),
          'public_html/siteviews/url_structure/application.js': coreJSDependencies,
          'public_html/siteviews/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/siteviews/url_structure.css'
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
          'public_html/topviews/url_structure/application.js': ['public_html/topviews/url_structure/application.js'],

          'public_html/langviews/application.js': ['public_html/langviews/application.js'],
          'public_html/langviews/faq/application.js': ['public_html/langviews/faq/application.js'],
          'public_html/langviews/url_structure/application.js': ['public_html/langviews/url_structure/application.js'],

          'public_html/siteviews/application.js': ['public_html/siteviews/application.js'],
          'public_html/siteviews/faq/application.js': ['public_html/siteviews/faq/application.js'],
          'public_html/siteviews/url_structure/application.js': ['public_html/siteviews/url_structure/application.js']
        }
      }
    }
  });

  grunt.registerTask('sass_all', ['sass:dist', 'concat']);
  grunt.registerTask('pageviews', ['browserify:pageviews', 'sass:pageviews', 'concat:pageviews', 'haml']);
  grunt.registerTask('topviews', ['browserify:topviews', 'sass:topviews', 'concat:topviews', 'haml']);
  grunt.registerTask('langviews', ['browserify:langviews', 'sass:langviews', 'concat:langviews', 'haml']);
  grunt.registerTask('siteviews', ['browserify:siteviews', 'sass:siteviews', 'concat:siteviews', 'haml']);
  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);

  grunt.registerTask('production', () => {
    const tasks = ['lint', 'browserify', 'sass:dist', 'concat', 'uglify', 'haml'];
    grunt.config.set('browserify.pageviews.options.browserifyOptions.debug', false);
    grunt.config.set('browserify.topviews.options.browserifyOptions.debug', false);
    grunt.task.run(tasks);
  });
};
