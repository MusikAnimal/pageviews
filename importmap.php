<?php

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
    'pageviews' => [
        'path' => './assets/pageviews/init.js',
        'entrypoint' => true,
    ],
    'chart.js' => [
        'version' => '2.3.0',
    ],
    'chartjs-color' => [
        'version' => '2.0.0',
    ],
    'color-convert' => [
        'version' => '0.5.3',
    ],
    'chartjs-color-string' => [
        'version' => '0.4.0',
    ],
    'banana-i18n' => [
        'version' => '2.4.0',
    ],
    '@wikimedia/codex' => [
        'version' => '2.6.0',
    ],
    'vue' => [
        'version' => '3.5.35',
    ],
    '@wikimedia/codex/dist/codex.style.min.css' => [
        'version' => '2.6.0',
        'type' => 'css',
    ],
    '@vue/runtime-dom' => [
        'version' => '3.5.35',
    ],
    '@vue/runtime-core' => [
        'version' => '3.5.35',
    ],
    '@vue/shared' => [
        'version' => '3.5.35',
    ],
    '@vue/reactivity' => [
        'version' => '3.5.35',
    ],
    '@wikimedia/codex-icons' => [
        'version' => '2.6.0',
    ],
    '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css' => [
        'version' => '2.6.0',
        'type' => 'css',
    ],
    '@hotwired/stimulus' => [
        'version' => '3.2.2',
    ],
    '@symfony/stimulus-bundle' => [
        'path' => './vendor/symfony/stimulus-bundle/assets/dist/loader.js',
    ],
    '@symfony/ux-vue' => [
        'path' => './vendor/symfony/ux-vue/assets/dist/loader.js',
    ],
];
