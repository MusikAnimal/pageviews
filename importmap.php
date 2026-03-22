<?php

declare( strict_types = 1 );

/**
 * Returns the importmap for this application.
 *
 * - "path" is a path inside the asset mapper system. Use the
 *     "debug:asset-map" command to see the full list of paths.
 *
 * - "entrypoint" (JavaScript only) set to true for any module that will
 *     be used as an "entrypoint" (and passed to the importmap() Twig function).
 *
 * The "importmap:require" command can be used to add new entries to this file.
 */
return [
	'app' => [
		'path' => './assets/app.js',
	],
	'shared' => [
		'path' => './assets/shared.js',
		'entrypoint' => true,
	],
	'pageviews' => [
		'path' => './assets/pageviews/pageviews.js',
		'entrypoint' => true,
	],
	'bootstrap' => [
		'version' => '3.3.5',
	],
	'bootstrap/dist/css/bootstrap.min.css' => [
		'version' => '3.3.5',
		'type' => 'css',
	],
	'chart.js' => [
		'version' => '2.3.0',
	],
	'chartjs-color' => [
		'version' => '2.0.0',
	],
	'moment' => [
		'version' => '2.18.1',
	],
	'color-convert' => [
		'version' => '0.5.3',
	],
	'chartjs-color-string' => [
		'version' => '0.4.0',
	],
	'color-name' => [
		'version' => '1.1.1',
	],
	'select2' => [
		'version' => '4.0.6',
	],
	'jquery' => [
		'version' => '3.2.1',
	],
	'select2/dist/css/select2.min.css' => [
		'version' => '4.0.6',
		'type' => 'css',
	],
	'bootstrap-datepicker' => [
		'version' => '1.7.0',
	],
	'bootstrap-datepicker/dist/css/bootstrap-datepicker3.min.css' => [
		'version' => '1.7.0',
		'type' => 'css',
	],
	'daterangepicker' => [
		'version' => '2.1.25',
	],
	'daterangepicker/daterangepicker.min.css' => [
		'version' => '2.1.25',
		'type' => 'css',
	],
	'toastr' => [
		'version' => '2.1.4',
	],
	'toastr/build/toastr.min.css' => [
		'version' => '2.1.4',
		'type' => 'css',
	],
	'banana-i18n' => [
		'version' => '2.4.0',
	],
];
