# Pageviews Analysis
A pageviews analysis tool for Wikimedia Foundation wikis

[![Build Status](https://travis-ci.org/MusikAnimal/pageviews.svg?branch=master)](https://travis-ci.org/MusikAnimal/pageviews)
[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

## Dependencies
This guide mostly assumes you're using OSX or Linux. If that's the case, you can probably already have Ruby. Try in your terminal with `ruby -v`. If you are only updating the JavaScript (where all the logic lives), you don't need Ruby, Haml, or Sass. Even for Haml and Sass, you could update the source and use an online converter to update the compiled version, then just run `grunt concat` to correctly concatenate those files for production use.

1. [Ruby](https://www.ruby-lang.org/en/)

1. [Haml](http://haml.info/)

1. [Sass](http://sass-lang.com/)

1. [Node](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)

1. [Grunt](http://gruntjs.com/)

1. [ESLint](http://eslint.org/) and a SCSS linter

  The linters are not necessary, but preferred so your code maintains a consistent style.

## Compilation

This first time around you'll need to install all node pacakges and dependencies with `npm install`.

### Local
Run `grunt pageviews` for the main pageviews app. To save time, you can run `grunt haml` to just compile the HAML files, or `grunt sass` to compile the SCSS.

If you're only working with the JavaScript, and don't want to deal with Ruby dependencies (HAML, SASS), just run `grunt browserify`. Then when you're done with your work run `grunt concat` and `grunt uglify` to make your code production-ready.

### Production
Before making a pull request or pushing to master, remember to run `grunt production` so the assets are minified and concatenated.

## Implementation approach

This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/)
where possible, and compiled to ES5 with [Babel](https://babeljs.io/) when you run Grunt. If you _need_ to add a polyfill for
something, add it to `/javascript/shared/polyfills.js`. Don't use jQuery utilities when native JavaScript can do it.

For CSS don't worry about adding vendor prefixes to anything in the CSS3 spec. If it works in Chrome and Firefox, leave it
at that. Other browsers will still function without the styling. Use [Bootstrap](http://getbootstrap.com/) classes if possible.

[Browserify](http://browserify.org/) is used to help follow a module pattern. You'll need to `require('./file_name')` any file that is a dependency.

[JSDoc](http://usejsdoc.org/) is the preferred comment format. Try to document each function you create. The linters will complain if you don't!

IE9 and below are not supported.

## Tests

Right now all we have for tests are the linters... you can run those with `grunt lint` or `npm test`. They will be ran automatically when you push or create a pull request. If for some reason you need a particular linter rule to be ignored, you can add exceptions (see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason), [Eslint](http://eslint.org/docs/user-guide/configuring)).

Moving forward we'll look into integration/automated testing, as unit tests don't seem to be the most fitting for this application.
