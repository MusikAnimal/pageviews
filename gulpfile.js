'use strict';

require('events').EventEmitter.defaultMaxListeners = 40;

const gulp = require('gulp');
const babel = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const pump = require('pump');
const revDelOriginal = require('gulp-rev-delete-original');
const revDel = require('rev-del');
const plugins = require('gulp-load-plugins')();

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
  'mediaviews': {
    css: [
      'vendor/stylesheets/select2.min.css',
      'vendor/stylesheets/daterangepicker.css',
      'vendor/stylesheets/bootstrap-datepicker.min.css'
    ],
    js: [
      'vendor/javascripts/select2.min.js',
      'vendor/javascripts/daterangepicker.js',
      'vendor/javascripts/bootstrap-datepicker.min.js',
      'vendor/javascripts/bootstrap-typeahead.js',
      'vendor/javascripts/Chart.min.js'
    ]
  },
  'metaviews': {
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

apps.concat(['']).forEach(app => {
  const path = app === '' ? '' : `${app}/`;

  /** VIEWS */
  const fileName = path => path.split('/').slice(-1)[0];
  gulp.task(`views-${app}`, () => {
    return gulp.src([`views/${path}*.haml`, 'views/*.haml'], {read: false})
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
      }));
  });

  if (app === 'shared') {
    return;
  }

  /** STYLES */
  const coreCSSDependencies = [
    'vendor/stylesheets/bootstrap.min.css',
    'vendor/stylesheets/toastr.css'
  ];
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
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`styles-${app}`, gulp.series(`css-sass-${app}`, `css-concat-${app}`));

  /** SCRIPTS */
  const coreJSDependencies = [
    'vendor/javascripts/jquery.min.js',
    'vendor/javascripts/jquery.i18n/CLDRPluralRuleParser.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.messagestore.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.fallbacks.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.parser.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.emitter.js',
    'vendor/javascripts/jquery.i18n/jquery.i18n.language.js',
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
  gulp.task(`js-browserify-${app}`, () => {
    const bundler = browserify(
      `javascripts/${path}${app}.js`
    ).transform(babel.configure({
      presets: ['es2015']
    }));
    return bundler.bundle()
      .on('error', err => {
        console.error(err);
        this.emit('end');
      })
      .pipe(source(`${app}.js`))
      .pipe(buffer())
      .pipe(plugins.rename('application.js'))
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`js-concat-${app}`, () => {
    return gulp.src(coreJSDependencies
        .concat(appDependencies[app].js)
        .concat([`public_html/${path}application.js`])
      )
      .pipe(plugins.concat('application.js'))
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`scripts-${app}`, gulp.series(`js-browserify-${app}`, `js-concat-${app}`));

  /** COMPRESSION AND VERSIONING */
  gulp.task(`compress-scripts-${app}`, cb => {
    pump([
      gulp.src(`public_html/${path}application.js`),
      plugins.uglify(),
      gulp.dest(`public_html/${path}`)
    ], cb);
  });
  gulp.task(`compress-styles-${app}`, () => {
    return gulp.src(`public_html/${path}application.css`)
      .pipe(plugins.cleanCss())
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`version-${app}`, () => {
    return gulp.src([`public_html/${path}application.js`, `public_html/${path}application.css`])
      .pipe(plugins.rev())
      .pipe(gulp.dest(`public_html/${path}`))
      .pipe(revDelOriginal())
      .pipe(plugins.rev.manifest())
      .pipe(revDel({dest: `public_html/${path}`}))
      .pipe(gulp.dest(`public_html/${path}`));
  });
  gulp.task(`compress-${app}`, gulp.series(
    gulp.parallel(`compress-styles-${app}`, `compress-scripts-${app}`),
    `version-${app}`
  ));
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
gulp.task('stylelint', () => {
  return gulp.src('stylesheets/**/*.scss')
    .pipe(plugins.stylelint({
      reporters: [
        {formatter: 'string', console: true}
      ]
    }));
});

/** JSDOC */
gulp.task('jsdoc', cb => {
  const config = require('./jsdocs/jsdoc.json');
  gulp.src(['README.md', 'javascripts/**/*.js'], {read: false})
    .pipe(plugins.jsdoc3(config, cb));
});

const nonMetaApps = apps.filter(app => app !== 'metaviews');

/** MAIN TASKS */
gulp.task('lint', gulp.parallel('eslint', 'stylelint'));
gulp.task('styles', gulp.parallel(...apps.map(app => `styles-${app}`)));
gulp.task('scripts', gulp.parallel(...apps.map(app => `scripts-${app}`)));
gulp.task('views', gulp.parallel(...apps.concat(['faq_parts', 'url_parts']).map(app => `views-${app}`)));
gulp.task('compress', gulp.parallel(...apps.map(app => `compress-${app}`)));

apps.forEach(app => {
  gulp.task(app, gulp.parallel(...[
    `styles-${app}`, `scripts-${app}`, `views-${app}`
  ]));
});

gulp.task('watch', () => {
  // compile all apps if shared files are altered
  gulp.watch('stylesheets/**/*.scss', gulp.parallel('styles'));
  gulp.watch('javascripts/**/*.js', gulp.parallel('scripts'));

  apps.concat(['faq_parts', 'url_parts', '']).forEach(app => {
    const path = app === '' ? '' : `${app}/`;
    gulp.watch(`views/${path}*.haml`, gulp.parallel(`views-${app}`));
  });
});

gulp.task('production', gulp.series('lint', gulp.parallel('styles', 'scripts', 'views'), 'jsdoc', 'compress'));

gulp.task('default', gulp.parallel('watch'));
