# Pageviews Analysis
A suite of tools to visualize pageviews data of Wikimedia Foundation wikis

Live tool: https://tools.wmflabs.org/pageviews (and [Langviews](https://tools.wmflabs.org/langviews), [Topviews](https://tools.wmflabs.org/topviews), [Siteviews](https://tools.wmflabs.org/siteviews), [Massviews](https://tools.wmflabs.org/massviews), [Redirect Views](https://tools.wmflabs.org/redirectviews), [Userviews](https://tools.wmflabs.org/userviews))

User documentation: https://meta.wikimedia.org/wiki/Pageviews_Analysis

JavaScript documentation: https://tools.wmflabs.org/pageviews/jsdocs

Metaviews (pageviews of the Pageviews apps): https://tools.wmflabs.org/pageviews/meta

IE10 and Safari 8 and below are not supported.

[![Build Status](https://travis-ci.org/MusikAnimal/pageviews.svg?branch=master)](https://travis-ci.org/MusikAnimal/pageviews)

## Dependencies
This guide mostly assumes you're using OSX or Linux. The setup process may differ on Windows machines.

1. [Node](https://nodejs.org/en/)

1. [PHP](http://php.net/) 5.6

  PHP is for rendering partials in the views and for the [Intuition](https://github.com/Krinkle/intuition) i18n framework. There otherwise is no backend logic.

1. [Composer](https://getcomposer.org/)

1. [ESLint](http://eslint.org/) and a SCSS linter*

  *The linters are not necessary, but preferred so your code maintains a consistent style.

## Setup

1. Install all node packages and dependencies with `npm install`

1. Run `composer update` to install all PHP dependencies

1. Create a copy of `config.sample.php` named `config.php`, and within that file, set `ROOTDIR` to your project root path.

1. Run `gulp` to watch the javascripts, stylesheets and views and automatically recompile when new changes are saved.

NOTE: Some routing in the app uses absolute paths, hence you may wish to modify your local web server to point to `localhost/pageviews` as opposed to browsing directly to the PHP file. In Apache, under `<IfModule alias_module>` you can create an alias with
```
Alias /pageviews /path/to/pageviews/public_html
Alias /massviews /path/to/pageviews/public_html/massviews
```
and so forth for all the other apps.

## Code walkthrough
This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/) where possible, and transpiled to ES5 with [Babel](https://babeljs.io/). If you need to add a polyfill for something, add it to `/javascript/shared/polyfills.js`.

All assets and views are ultimately placed in `public_html`. With the exception of images, you won't need to make any manual modifications to this directory.

### Structure
The repo contains seven separate applications that share code with each other (Pageviews, Langviews, Topviews, Siteviews, Massviews, Redirect Views, and Userviews). The root directory of `javascripts`, `stylesheets` and `views` represent the Pageviews app. Other apps have a subdirectory therein. The main development asset files share the same name as the app (e.g. `pageviews.js` for the main JavaScript file for Pageviews). After compilation each app has it's own `application.js` and `application.css`. PHP partials and Sass imports are prepended with underscores (e.g. `_footer.php`, `_mixins.scss`).

#### JavaScripts
[Browserify](http://browserify.org/) is used to help follow a module pattern. You'll need to `require('./file_name')` any file that is a dependency. All JavaScript is written in ES6 (and possibly ES7).

Each app has it's own `config.js`, which are constants for application-wide use. Pageviews and Siteviews have a `templates.js` file that defines how data is shown in the right column on the interface.

Shared JavaScript goes in the `/shared` directory and must be required as needed. `list_helpers.js` is used on apps that have a list view, which are Massviews and Langviews. All apps but Topviews show a chart of some sort, and require `chart_helpers.js`.

When the JS files are compiled, they are concatenated into a single `application.js` that lives within the directory for that app inside `public_html`.

All JavaScript is documented using [JSDoc](http://usejsdoc.org/). The documentation is hosted at https://tools.wmflabs.org/pageviews/jsdocs. You can generate the docs locally by running:
```
gulp jsdoc && open jsdocs/gen/index.html
```

#### Styles
Styles are written in [http://sass-lang.com/](Sass) and [compiled to CSS](https://github.com/dlmanning/gulp-sass). The CSS is then [automatically vendor-prefixed](https://github.com/sindresorhus/gulp-autoprefixer) to support modern browsers. [Bootstrap](http://getbootstrap.com/) is used as the CSS framework.

Each page has it's own `.scss` file that imports dependencies. Shared files are simply prefixed with an underscore. `_mixins.scss` is for the mixins, placeholders, keyframes and colour variables. Similar to the JavaScripts, `_list_view.scss` is imported by apps that have a list view (Langviews, Massviews), and `_chart_view.scss` by apps that show charts.

#### Haml
The views within `/views` are written in [MtHaml](https://github.com/arnaud-lb/MtHaml) and compiled to PHP files in `/public_html`.

### Local
Run `gulp` to simply watch for changes and automatically compile as needed. You can also run tasks by app and function, such as `gulp massviews` for all Massviews-related files, or `gulp scripts` to compile only the JavaScripts, but `gulp` by itself should be all you need.

### Production
Before making a pull request or pushing to master, remember to run `gulp production` so the assets are minified and concatenated. JSDocs are also generated, and placed in a dedicated sub-repo (not submodule) in `jsdocs/gen`. These can optionally be pull requested to the [JSDocs repo](https://github.com/MusikAnimal/pageviews-jsdocs).

## Tests
Tests will be ran automatically when you push or create a pull request.

### Acceptance
It is probably easiest to create a pull request to run acceptance tests on Travis. To run the tests locally, you'll need:
* [JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
* [Selenium Standalone Server](http://www.seleniumhq.org/download/)
* [Firefox](http://www.mozilla.org/firefox-download)

IMPORTANT: The default browser Selenium uses is Firefox, and as of Firefox 47 the necessary webdriver, `FirefoxDriver` has been removed. A working combination is Selenium WebDriver 2.53.1 and Firefox 47.0.1 (not Firefox 47, or later versions than 47.0.1). Once installed run `java -jar selenium-server-standalone-2.53.1.jar` to start the selenium server and `./nightwatch` to run the tests. You can run specific tests with `./nightwatch --test tests/my_test.js`.

If a test fails when you push to remote, check the build and there will be a link to a video of the test, along with the output of the logs.

### Linters
The styling of all ES6 and SCSS is enforced with linters. You can run these locally with `gulp lint`, and will also be ran when you run `gulp production`. If you need a particular rule to be ignored, you can add exceptions (see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason), [Eslint](http://eslint.org/docs/user-guide/configuring)).
