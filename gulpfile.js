'use strict';

const gulp = require('gulp');
const babel = require('babelify');
const browserify = require('browserify');
const runSequence = require('run-sequence');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const watchify = require('watchify');
const del = require('del');
const pump = require('pump');
const plugins = require('gulp-load-plugins')();

let shouldNotify = true;
const notify = message => {
  return shouldNotify ? plugins.notify(message) : plugins.notify(() => false);
};

const appDependencies = {
  'pageviews': {
    css: [
      'vendor/stylesheets/select2.min.css',
      'vendor/stylesheets/daterangepicker.css',
      'vendor/stylesheets/bootstrap-datepicker.min.css'
    ],
    js: [
      'vendor/javascripts/select2.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-datepicker.min.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'langviews': {
    css: ['vendor/stylesheets/daterangepicker.css'],
    js: [
      'vendor/javascripts/HackTimer.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-typeahead.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'topviews': {
    css: [
      'vendor/stylesheets/select2.min.css',
      'vendor/stylesheets/bootstrap-datepicker.min.css'
    ],
    'js': [
      'vendor/javascripts/select2.min.js',
      'vendor/javascripts/bootstrap-datepicker.min.js'
    ]
  },
  'siteviews': {
    css: [
      'vendor/stylesheets/select2.min.css',
      'vendor/stylesheets/daterangepicker.css',
      'vendor/stylesheets/bootstrap-datepicker.min.css'
    ],
    js: [
      'vendor/javascripts/select2.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-datepicker.min.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'massviews': {
    css: ['vendor/stylesheets/daterangepicker.css'],
    js: [
      'vendor/javascripts/HackTimer.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-typeahead.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'redirectviews': {
    css: ['vendor/stylesheets/daterangepicker.css'],
    js: [
      'vendor/javascripts/HackTimer.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-typeahead.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'userviews': {
    css: ['vendor/stylesheets/daterangepicker.css'],
    js: [
      'vendor/javascripts/HackTimer.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-typeahead.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'meta': {
    css: [
      'vendor/stylesheets/select2.min.css',
      'vendor/stylesheets/daterangepicker.css'
    ],
    js: [
      'vendor/javascripts/select2.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/Chart.min.js'
    ]
  }
};
const apps = Object.keys(appDependencies);

apps.forEach(app => {
  const path = app === 'pageviews' ? '' : `${app}/`;

  /** STYLES */
  const coreCSSDependencies = [
    'vendor/stylesheets/bootstrap.min.css',
    'vendor/stylesheets/toastr.css'
  ];
  gulp.task(`styles-${app}`, () => {
    runSequence(`css-sass-${app}`, `css-concat-${app}`);
  });
  gulp.task(`css-sass-${app}`, () => {
    return gulp.src(`stylesheets/${path}${app}.scss`)
      .pipe(plugins.sass().on('error', plugins.sass.logError))
      .pipe(plugins.autoprefixer('last 2 version'))
      .pipe(plugins.rename('application.css'))
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`css-concat-${app}`, () => {
    return gulp.src(coreCSSDependencies
        .concat(appDependencies[app].css)
        .concat([`public_html/${path}application.css`])
      )
      .pipe(plugins.concat('application.css'))
      .pipe(gulp.dest(`public_html/${path}`))
      .pipe(notify('Styles task complete'));
  });
  if (app !== 'meta') {
    gulp.task(`styles-${app}-help`, [`styles-${app}-faq`, `styles-${app}-url_structure`]);
    ['faq', 'url_structure'].forEach(helpPage => {
      gulp.task(`styles-${app}-${helpPage}`, () => {
        runSequence(`css-sass-${app}-${helpPage}`, `css-concat-${app}-${helpPage}`);
      });
      gulp.task(`css-sass-${app}-${helpPage}`, () => {
        return gulp.src(`stylesheets/${path}${helpPage}.scss`)
          .pipe(plugins.sass().on('error', plugins.sass.logError))
          .pipe(plugins.autoprefixer('last 2 version'))
          .pipe(plugins.rename('application.css'))
          .pipe(gulp.dest(`public_html/${path}${helpPage}`));
      });
      gulp.task(`css-concat-${app}-${helpPage}`, () => {
        return gulp.src(coreCSSDependencies
            .concat([`public_html/${path}${helpPage}/application.css`])
          )
          .pipe(plugins.concat('application.css'))
          .pipe(gulp.dest(`public_html/${path}${helpPage}`));
      });
    });
  }

  /** SCRIPTS */
  const coreJSDependencies = [
    'vendor/javascripts/jquery.min.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.messagestore.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.fallbacks.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.parser.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.emitter.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.language.js',
    'vendor/javascripts/jquery.i18n/CLDRPluralRuleParser.js',
    'vendor/javascripts/jquery.i18n/languages/bs.js',
    'vendor/javascripts/jquery.i18n/languages/dsb.js',
    'vendor/javascripts/jquery.i18n/languages/fi.js',
    'vendor/javascripts/jquery.i18n/languages/ga.js',
    'vendor/javascripts/jquery.i18n/languages/he.js',
    'vendor/javascripts/jquery.i18n/languages/hsb.js',
    'vendor/javascripts/jquery.i18n/languages/hu.js',
    'vendor/javascripts/jquery.i18n/languages/hy.js',
    'vendor/javascripts/jquery.i18n/languages/la.js',
    'vendor/javascripts/jquery.i18n/languages/ml.js',
    'vendor/javascripts/jquery.i18n/languages/os.js',
    'vendor/javascripts/jquery.i18n/languages/ru.js',
    'vendor/javascripts/jquery.i18n/languages/sl.js',
    'vendor/javascripts/jquery.i18n/languages/uk.js',
    // 'public_html/jquery.i18n.js', // needs to be here for relative paths to i18n messages
    'vendor/javascripts/moment.min.js',
    'vendor/javascripts/bootstrap.min.js',
    'vendor/javascripts/toastr.min.js',
    'vendor/javascripts/simpleStorage.js'
  ];
  gulp.task(`scripts-${app}`, () => {
    runSequence(`js-browserify-${app}`, `js-concat-${app}`);
  });
  gulp.task(`js-browserify-${app}`, () => {
    const bundler = browserify(
      `javascripts/${path}${app}.js`
    ).transform(babel.configure({
      presets: ['es2015']
    }));
    const rebundle = () => {
      return bundler.bundle()
        .on('error', err => {
          console.error(err);
          this.emit('end');
        })
        .pipe(source(`${app}.js`))
        .pipe(buffer())
        .pipe(plugins.rename('application.js'))
        .pipe(gulp.dest(`public_html/${path}`));
    };
    return rebundle();
  });
  gulp.task(`js-concat-${app}`, () => {
    return gulp.src(coreJSDependencies
        .concat(appDependencies[app].js)
        .concat([`public_html/${path}application.js`])
      )
      .pipe(plugins.concat('application.js'))
      .pipe(gulp.dest(`public_html/${path}`))
      .pipe(notify({
        message: 'Scripts task complete',
        onLast: true
      }));
  });
  if (app !== 'meta') {
    gulp.task(`scripts-${app}-help`, [`scripts-${app}-faq`, `scripts-${app}-url_structure`]);
    ['faq', 'url_structure'].forEach(helpPage => {
      gulp.task(`scripts-${app}-${helpPage}`, () => {
        return gulp.src(coreJSDependencies)
          .pipe(plugins.concat('application.js'))
          .pipe(gulp.dest(`public_html/${path}${helpPage}`));
      });
    });
  }

  /** VIEWS */
  const fileName = path => path.split('/').slice(-1)[0];
  gulp.task(`views-${app}`, () => {
    return gulp.src(`views/${path}*.haml`, {read: false})
      .pipe(plugins.shell([
        // 'echo Compiling <%= name(file.path) %> to <%= target(file.path) %>',
        'php haml.php -d -t php <%= file.path %> <%= target(file.path) %>'
      ], {
        templateData: {
          target: path => {
            let newPath = path.replace('pageviews/views', 'pageviews/public_html');
            if (/(faq|url_structure)\.haml$/.test(fileName(path))) {
              newPath = newPath.replace(/\.haml$/, '/index.php');
            }
            return newPath.replace(/\.haml$/, '.php');
          },
          name: path => fileName(path)
        }
      }))
      .pipe(notify({
        message: 'Views task complete',
        onLast: true
      }));
  });

  /** COMPRESSION */
  gulp.task(`compress-${app}`, [`compress-styles-${app}`, `compress-scripts-${app}`]);
  gulp.task(`compress-scripts-${app}`, cb => {
    pump([
      gulp.src(`public_html/${path}application.js`),
      plugins.uglify(),
      gulp.dest(`public_html/${path}`)
    ], cb);
  });
  gulp.task(`compress-styles-${app}`, () => {
    return gulp.src(`public_html/${path}application.css`)
      .pipe(plugins.cssnano())
      .pipe(gulp.dest(`public_html/${path}`));
  });
});

// special handling for faq_parts and url_parts
['faq_parts', 'url_parts'].forEach(path => {
  gulp.task(`views-${path}`, () => {
    return gulp.src(`views/${path}/*.haml`, {read: false})
      .pipe(plugins.shell([
        // 'echo Compiling <%= name(file.path) %> to <%= target(file.path) %>',
        'php haml.php -d -t php <%= file.path %> <%= target(file.path) %>'
      ], {
        templateData: {
          target: path => {
            return path.replace('pageviews/views', 'pageviews/public_html')
              .replace(/\.haml$/, '.php');
          },
          name: path => {
            return path.split('/').slice(-1)[0];
          }
        }
      }));
  });
});

/** LINTING */
gulp.task('eslint', () => {
  return gulp.src(['javascripts/**/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});
gulp.task('scsslint', () => {
  return gulp.src('stylesheets/**/*.scss')
    .pipe(plugins.scssLint());
});

/** JSDOC */
gulp.task('jsdoc', cb => {
  const config = require('./jsdocs/jsdoc.json');
  gulp.src(['README.md', 'javascripts/**/*.js'], {read: false})
    .pipe(plugins.jsdoc3(config, cb));
});

const nonMetaApps = apps.filter(app => app !== 'meta');

/** MAIN TASKS */
gulp.task('lint', ['eslint', 'scsslint']);
gulp.task('styles', apps.map(app => `styles-${app}`));
gulp.task('scripts', apps.map(app => `scripts-${app}`));
gulp.task('views', apps.concat(['faq_parts', 'url_parts']).map(app => `views-${app}`));
gulp.task('compress', apps.map(app => `compress-${app}`));
gulp.task('help', nonMetaApps.map(app => `styles-${app}-help`).concat(
  nonMetaApps.map(app => `scripts-${app}-help`)
), () => {
  gulp.src('').pipe(notify('Help task complete'));
});

apps.forEach(app => {
  gulp.task(app, [
    `styles-${app}`, `scripts-${app}`, `views-${app}`
  ].concat(app === 'meta' ? [] : [`styles-${app}-help`, `scripts-${app}-help`]));
});

gulp.task('watch', () => {
  // compile all apps if shared files are altered
  gulp.watch('stylesheets/_*.scss', ['styles']);
  gulp.watch('javascripts/shared/*.js', ['scripts']);
  gulp.watch(['stylesheets/**/faq.scss', 'stylesheets/**/url_structure.scss'], ['help']);

  apps.concat(['faq_parts', 'url_parts']).forEach(app => {
    const path = app === 'pageviews' ? '' : `${app}/`;
    gulp.watch(
      // ignore FAQ and URL structure files
      [`stylesheets/${path}*.scss`, '!stylesheets/**/faq.scss', '!stylesheets/**/url_structure.scss'],
      [`styles-${app}`]
    );
    gulp.watch(`javascripts/${path}*.js`, [`scripts-${app}`]);
    gulp.watch(`views/${path}*.haml`, [`views-${app}`]);
  });
});

gulp.task('production', () => {
  shouldNotify = false;
  runSequence('lint', ['styles', 'scripts', 'views', 'help'], ['compress', 'jsdoc'], () => {
    shouldNotify = true;
    gulp.src('')
      .pipe(notify('Production build complete'));
  });
});

gulp.task('default', ['watch']);
