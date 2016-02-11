# Pageviews Analysis
A pageviews analysis tool for Wikimedia Foundation wikis

## Dependencies
This guide mostly assumes you're using OSX or Linux. If that's the case, you can probably jump to step #2

1. [Ruby](https://www.ruby-lang.org/en/)

1. [Haml](http://haml.info/)

1. [Sass](http://sass-lang.com/)

1. [Node](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)

1. [Grunt](http://gruntjs.com/)

1. [ESLint](http://eslint.org/) and a SCSS linter

  The linters are not necessary, but preferred so your code maintains a consistent style.

## Compilation

### Local
Run `grunt pageviews` for the main pageviews app, `grunt top` for the top pages app, or just `grunt` to compile everything.

### Production
Before pushing to master remember to run `grunt production` so the assets are minified

## Implementation approach

This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/)
where possible, and compiled to ES5 with [Babel](https://babeljs.io/) when you run Grunt. If you _need_ to add a polyfill for
something, add it to `/javascript/polyfills.js`. Don't use jQuery utilities when native JavaScript can do it.

For CSS don't worry about adding vendor prefixes to anything in the CSS3 spec. If it works in Chrome and Firefox, leave it
at that. Other browsers will still function without the styling. Use [Bootstrap](http://getbootstrap.com/) classes where possible.

## Tests

...to come, hopefully. Likely will use [Jest](https://facebook.github.io/jest/)
