# Contributing

## Dependencies
This guide mostly assumes you're using MacOS or Linux. The setup process may differ on Windows machines.

1. [Node](https://nodejs.org/en/) with the version specified by [.nvmrc](.nvmrc).

1. [PHP](http://php.net/) 7.2+ – PHP is for rendering partials in the views and for the
   [Intuition](https://github.com/Krinkle/intuition) i18n framework, and for some internal APIs that query the replicas.

1. [Composer](https://getcomposer.org/)

## Setup
1. Install all node packages and dependencies with `npm install`.

1. Run `composer install` to install all PHP dependencies.

1. Run `npm install` to install all Node dependencies.

1. Create a copy of `config.sample.php` named `config.php`. See the comments within that file on what you
   need to configure.

1. Optionally [create the "meta" database](https://wikitech.wikimedia.org/wiki/Tool:Pageviews#Meta_database) on your
   local machine. This database is used for usage tracking, and also to store known
   [false positives](https://pageviews.toolforge.org/topviews/faq/#false_positive) for Topviews.
   Unless you're working on Topviews, you can skip this step.

1. Run `./node_modules/.bin/gulp` to watch the javascripts, stylesheets and views and automatically
   recompile when new changes are saved.

1. Go to the public directory (`cd public_html`) and start the server with `php -S localhost:8000`.

You should be able to access each application as a subpath of localhost:8000, e.g. http://localhost:8000/pageviews.

## Code walkthrough
JavaScript is written in ES6+ where possible, and transpiled to ES5 with [Babel](https://babeljs.io/).
If you need to add a polyfill for something, add it to `/javascript/shared/polyfills.js`.

All assets and views are ultimately placed in `public_html`. With the exception of images,
you won't need to make any manual modifications to this directory.

### Structure
The repo contains eight separate applications that share code with each other
(Pageviews, Langviews, Topviews, Siteviews, Massviews, Redirect Views, Userviews, and Mediaviews).
Each app has a dedicated subdirectory within `javascripts`, `stylesheets` and `views`.
The main development asset files share the same name as the app (e.g. `pageviews.js` for the main JavaScript
file for Pageviews). After compilation each app has its own `application.js` and `application.css` in the public_html
directory. PHP partials and Sass imports are prepended with underscores (e.g. `_footer.php`, `_mixins.scss`).

There are symlinks all throughout the public_html directory. These are to ensure you can use the native
PHP server on your local machine and also deploy to Toolforge with the same code.
The symlinks effectively change the document root of Toolforge's lighttpd server.

#### JavaScripts
[Browserify](http://browserify.org/) is used to help follow a module pattern.
You'll need to `require('./file_name')` any file that is a dependency.
All JavaScript is written in ECMAScript 2015+.

Each app has its own `config.js`, which are constants for application-wide use.
Pageviews, Siteviews and Mediaviews also have a `templates.js` file that defines how data is shown
in the right column on the interface.

Shared JavaScript goes in the `/shared` directory and must be required as needed.
`list_helpers.js` is used on apps that have a list view, which are Massviews, Langviews, Redirect Views
and Userviews. All apps but Topviews show a chart of some sort, and require `chart_helpers.js`.

When the JS files are compiled, they are concatenated into a single `application.js`
that lives within the directory for that app inside `public_html`. When you run the production build,
they will get versioned and the original `application.js` will be deleted.

All JavaScript is documented using [JSDoc](http://usejsdoc.org/).
The documentation is hosted at https://pageviews.toolforge.org/jsdocs.
You can generate the docs locally by running:
```
./node_modules/.bin/gulp jsdoc && open jsdocs/gen/index.html
```

#### Styles
Styles are written in [Sass](https://sass-lang.com/) (of the [SCSS](https://sass-lang.com/documentation/syntax#scss) variety) and [compiled to CSS](https://github.com/dlmanning/gulp-sass).
The CSS is then [automatically vendor-prefixed](https://github.com/sindresorhus/gulp-autoprefixer) to support
modern browsers. [Bootstrap](http://getbootstrap.com/) is used as the CSS framework.

Each page has its own `.scss` file that imports dependencies. Shared files are simply prefixed with an
underscore. `_mixins.scss` is for the mixins, placeholders, keyframes and colour variables.
Similar to the JavaScripts, `_list_view.scss` is imported by apps that have a list view
(Massviews, Langviews, Redirect Views and Mediaviews), and `_chart_view.scss` by apps that show charts.

In development, the styles are concatenated into `application.css`, one for each app. In the production
build, these get versioned and the original `application.css` is removed.

#### Haml
The views within `/views` are written in [MtHaml](https://github.com/arnaud-lb/MtHaml)
and compiled to PHP files in `/public_html`.

### Local
Run `./node_modules/.bin/gulp` to watch for changes and automatically compile as needed.
You can also run tasks by app and function, such as `gulp massviews` for all Massviews-related files,
or `gulp scripts` to compile only the JavaScripts, but `gulp` by itself should be all you need.

Do not pay much mind to all the redundant asset files generated in public_html. When you run the production
build (see below), the assets are versioned and all unused files are removed. The HTML sources the correct
version in [_head.haml](views/_head.haml), looking for `application.js` and `application.css` first
(development), and if it's not there it reads the `rev-manifest.json` to know what assets to source.

### Production
Before making a pull request or pushing to master, remember to run `./node_modules/.bin/gulp production`
so the assets are minified, concatenated, and versioned. JSDocs are also generated, and placed in a
dedicated sub-repo (not submodule) in `jsdocs/gen`. These can optionally be pull requested to
the [JSDocs repo](https://github.com/MusikAnimal/pageviews-jsdocs).

For deployment instructions, see [Tool:Pageviews](https://wikitech.wikimedia.org/wiki/Tool:Pageviews) on Wikitech.org.

## Tests
Tests will be ran automatically when you push or create a pull request.

### Acceptance
Pageviews Analysis was once tested with acceptance tests, but after significant maintenance burden
and general flakiness of the tests, they have been retired :(

### Linters
The styling of all JavaScript and SCSS is enforced with linters. You can run these locally with
`./node_modules/.bin/gulp lint`, and will also be ran when you run `gulp production`.
If you need a particular rule to be ignored, you can add exceptions
(see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason),
[Eslint](http://eslint.org/docs/user-guide/configuring)).
