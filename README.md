# Pageviews Analysis
A pageviews analysis tool for Wikimedia Foundation wikis

![Build status](https://travis-ci.org/MusikAnimal/pageviews.svg?branch=master)

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
Run `grunt pageviews` for the main pageviews app, `grunt top` for the top pages app, or just `grunt` to compile everything.

### Production
Before pushing to master remember to run `grunt production` so the assets are minified.

## Implementation approach

This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/)
where possible, and compiled to ES5 with [Babel](https://babeljs.io/) when you run Grunt. If you _need_ to add a polyfill for
something, add it to `/javascript/polyfills.js`. Don't use jQuery utilities when native JavaScript can do it.

For CSS don't worry about adding vendor prefixes to anything in the CSS3 spec. If it works in Chrome and Firefox, leave it
at that. Other browsers will still function without the styling. Use [Bootstrap](http://getbootstrap.com/) classes where possible.

## Tests

Run with `npm test`. For JavaScript unit testing, we are using [Jest](https://facebook.github.io/jest/). Only critical functionality need be tested. Linters are also ran with the test. If for some reason you need a particular linter rule to be ignored, you can add exceptions (see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason), [Eslint](http://eslint.org/docs/user-guide/configuring))
