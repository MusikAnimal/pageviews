# Pageviews Analysis
A pageviews analysis tool for Wikimedia Foundation wikis

[![Build Status](https://travis-ci.org/MusikAnimal/pageviews.svg?branch=master)](https://travis-ci.org/MusikAnimal/pageviews)
[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

## Dependencies
This guide mostly assumes you're using OSX or Linux. The setup process may differ on Windows machines.

1. [Ruby](https://www.ruby-lang.org/en/)

1. [Sass](http://sass-lang.com/)

  Sass will soon be replaced with [Less](http://lesscss.org/) to remove the Ruby dependency.

1. [PHP](http://php.net/)

  PHP is for rendering partials in the views and for the [Intuition](https://github.com/Krinkle/intuition) i18n framework. There otherwise is no backend logic.

1. [Node](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)

1. [Grunt](http://gruntjs.com/)

1. [ESLint](http://eslint.org/) and a SCSS linter

  The linters are not necessary, but preferred so your code maintains a consistent style.

This first time around you'll need to install all node pacakges and dependencies with `npm install`. You'll also need to install [Composer](https://getcomposer.org/) and run `composer update`.

## Configuration

Create a copy of `config.sample.php` named `config.php`, and within that file, set `ROOTDIR` to your project root path.

## Implementation approach
This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/)
where possible, and compiled to ES5 with [Babel](https://babeljs.io/) when you run Grunt. If you _need_ to add a polyfill for
something, add it to `/javascript/shared/polyfills.js`. Don't use jQuery utilities when native JavaScript can do it.

For CSS don't worry about adding vendor prefixes to anything in the CSS3 spec. If it works in Chrome and Firefox, leave it
at that. Other browsers will still function without the styling. Use [Bootstrap](http://getbootstrap.com/) classes if possible.

[Browserify](http://browserify.org/) is used to help follow a module pattern. You'll need to `require('./file_name')` any file that is a dependency.

[JSDoc](http://usejsdoc.org/) is the preferred comment format. Try to document each function you create. The linters will complain if you don't!

IE9 and below are not supported.

## Compilation
All assets and views are ultimated placed in `public_html`. With the exception of images, you won't need to make any manual modifications to this directory.

### Structure
The repo currently contains two (and eventually three) separate applications, that share code with each other. The root directory of `javascripts`, `stylesheets` and `views` represent the Pageviews app. Other apps have a subdirectory therein. The main asset files share the same name as the app (e.g. `pageviews.js` for the main JavaScript file for Pageviews). Partials of any kind are prepended with underscores (e.g. `_footer.php`).

#### JavaScripts
Each app has it's own `config.js` and `session.js`. Config are constants for application-wide use, and session are application-wide variables. When these files are compiled, they are concatenated into a single `application.js` that lives within the directory for that app inside `public_html`.

Shared JavaScript goes in the `/shared` directory and will be automatically included in each `application.js`.

#### Sass
Because of implications with concatenation, each SCSS file is first compiled into a file with the same name within `public_html`, and _then_ concatentated into an `application.css` which is included in the views.

Each page has it's own `.scss` file that imports dependencies.

#### Views
The views within `/views` and `/public_html` are identical. It's simply for structural aesthetics that we work outside `public_html` and let the Grunt task copy over the views. `grunt watch` can be configured to do this whenever you hit save on any view (same is true of JavaScript and Sass).

### Local
Run `grunt pageviews` for the main Pageviews app, or `grunt topviews` for Topviews. To save time, you can run `grunt views` to copy the views, or `grunt sass` to compile the SCSS.

If you're only working with the JavaScript, just run `grunt browserify`. Then when you're done with your work run `grunt concat` and `grunt uglify` to make your code production-ready.

### Production
Before making a pull request or pushing to master, remember to run `grunt production` so the assets are minified and concatenated.

## Tests
Right now all we have for tests are the linters... you can run those with `grunt lint` or `npm test`. They will be ran automatically when you push or create a pull request. If for some reason you need a particular linter rule to be ignored, you can add exceptions (see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason), [Eslint](http://eslint.org/docs/user-guide/configuring)).

Moving forward we'll look into integration/automated testing, as unit tests don't seem to be the most fitting for this application.
