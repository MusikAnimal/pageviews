'use strict';

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
  const apps = ['pageviews', 'topviews', 'langviews', 'siteviews', 'massviews', 'redirectviews'];

  // set up initial structure of tasks
  let browserifyTasks = {
    options: {
      transform: [['babelify', { presets: ['es2015'] }]]
    }
  };
  let sassTasks = {
    options: {
      sourcemap: 'none',
      style: 'expanded'
    },
    dist: {
      options: {
        style: 'compressed',
        sourcemap: 'none'
      },
      files: {}
    }
  };
  let hamlFiles = {
    'public_html/_head.php': 'views/_head.haml',
    'public_html/_footer.php': 'views/_footer.haml',
    'public_html/_lang_selector.php': 'views/_lang_selector.haml',
    'public_html/_modals.php': 'views/_modals.haml',
    'public_html/_browser_check.php': 'views/_browser_check.haml',
    'public_html/_data_links.php': 'views/_data_links.haml',
    'public_html/_output.php': 'views/_output.haml'
  };
  ['old_data', 'todays_data', 'redirects', 'search_redirects', 'agents', 'chart_type', 'feedback', 'throttle'].forEach(faqPart => {
    hamlFiles[`public_html/faq_parts/${faqPart}.php`] = `views/faq_parts/${faqPart}.haml`;
  });
  ['project', 'date_ranges', 'platform', 'agent', 'autolog'].forEach(urlPart => {
    hamlFiles[`public_html/url_parts/${urlPart}.php`] = `views/url_parts/${urlPart}.haml`;
  });
  let uglifyTask = {
    options: {
      compress: true
    },
    all: {
      files: {}
    }
  };

  // loop through apps and fill in key/values
  apps.forEach(app => {
    const path = app === 'pageviews' ? '' : `${app}/`;

    // BROWSERIFY
    browserifyTasks[app] = {
      files: {
        [`public_html/${path}${app}.js`]: [
          'javascripts/shared/*.js',
          `javascripts/${path}${app}.js`
        ]
      }
    };

    // SASS
    const sourcesHash = {
      [`public_html/${path}${app}.css`]: `stylesheets/${path}${app}.scss`,
      [`public_html/${path}faq.css`]: `stylesheets/${path}faq.scss`,
      [`public_html/${path}url_structure.css`]: `stylesheets/${path}url_structure.scss`
    };
    sassTasks[app] = {
      files: [sourcesHash]
    };
    Object.assign(sassTasks.dist.files, sourcesHash);

    // HAML
    hamlFiles[`public_html/${path}index.php`] = `views/${path}index.haml`;
    hamlFiles[`public_html/${path}faq/index.php`] = `views/${path}faq.haml`;
    hamlFiles[`public_html/${path}url_structure/index.php`] = `views/${path}url_structure.haml`;

    // UGLIFY
    Object.assign(uglifyTask.all.files, {
      [`public_html/${path}application.js`]: [`public_html/${path}application.js`],
      [`public_html/${path}faq/application.js`]: [`public_html/${path}faq/application.js`],
      [`public_html/${path}url_structure/application.js`]: [`public_html/${path}url_structure/application.js`],
    });
  });

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
    browserify: browserifyTasks,
    sass: sassTasks,
    haml: {
      options: {
        enableDynamicAttributes: false
      },
      compile: {
        files: hamlFiles
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
            'vendor/javascripts/Chart.min.js',
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
      },
      massviews: {
        files: {
          // order matters here
          'public_html/massviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/bootstrap-typeahead.js',
            'vendor/javascripts/simpleStorage.js',
            'vendor/javascripts/Chart.min.js',
            'public_html/massviews/massviews.js'
          ]),
          'public_html/massviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/massviews/massviews.css'
          ]),
          'public_html/massviews/faq/application.js': coreJSDependencies,
          'public_html/massviews/faq/application.css': coreCSSDependencies.concat([
            'public_html/massviews/faq.css'
          ]),
          'public_html/massviews/url_structure/application.js': coreJSDependencies,
          'public_html/massviews/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/massviews/url_structure.css'
          ])
        }
      },
      redirectviews: {
        files: {
          // order matters here
          'public_html/redirectviews/application.js': coreJSDependencies.concat([
            'vendor/javascripts/daterangepicker.min.js',
            'vendor/javascripts/bootstrap-typeahead.js',
            'vendor/javascripts/simpleStorage.js',
            'vendor/javascripts/Chart.min.js',
            'public_html/redirectviews/redirectviews.js'
          ]),
          'public_html/redirectviews/application.css': coreCSSDependencies.concat([
            'vendor/stylesheets/daterangepicker.min.css',
            'public_html/redirectviews/redirectviews.css'
          ]),
          'public_html/redirectviews/faq/application.js': coreJSDependencies,
          'public_html/redirectviews/faq/application.css': coreCSSDependencies.concat([
            'public_html/redirectviews/faq.css'
          ]),
          'public_html/redirectviews/url_structure/application.js': coreJSDependencies,
          'public_html/redirectviews/url_structure/application.css': coreCSSDependencies.concat([
            'public_html/redirectviews/url_structure.css'
          ])
        }
      }
    },
    uglify: uglifyTask
  });

  grunt.registerTask('sass_all', ['sass:dist', 'concat']);

  apps.forEach(app => {
    grunt.registerTask(app, [`browserify:${app}`, `sass:${app}`, `concat:${app}`, 'haml']);
  });

  grunt.registerTask('default', ['pageviews']);
  grunt.registerTask('lint', ['eslint', 'scsslint']);

  grunt.registerTask('production', () => {
    const tasks = ['lint', 'browserify', 'sass:dist', 'concat', 'uglify', 'haml'];
    grunt.config.set('browserify.pageviews.options.browserifyOptions.debug', false);
    grunt.config.set('browserify.topviews.options.browserifyOptions.debug', false);
    grunt.task.run(tasks);
  });
};
