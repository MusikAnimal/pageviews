<template>
	<CdxDialog
		:open="open"
		:title="banana.i18n( 'url-structure' )"
		:use-close-button="true"
		class="app-url-structure"
		@update:open="( value ) => emit( 'update:open', value )"
	>
		<!-- Trusted content: our own i18n messages and link markup. -->
		<!-- eslint-disable vue/no-v-html -->
		<p v-html="intro" />

		<h3>
			{{ $i18n( 'url-structure-parameters' ) }}
			<small>{{ $i18n( 'url-structure-parameters-order' ) }}</small>
		</h3>
		<dl class="app-url-structure__params">
			<template v-for="param in params" :key="param.name">
				<dt>{{ param.name }}</dt>
				<dd v-html="param.html" />
			</template>
		</dl>
		<!-- eslint-enable vue/no-v-html -->
	</CdxDialog>
</template>

<script setup>
import { CdxDialog } from '@wikimedia/codex';
import { banana } from '../../i18n.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const code = ( text ) => `<code>${ text }</code>`;
const defaultMsg = `(${ banana.i18n( 'default' ).toLowerCase() })`;

const sitematrixLink = '<a target="_blank" href="https://gerrit.wikimedia.org/r/plugins/' +
	'gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv">' +
	`${ banana.i18n( 'project' ).toLowerCase() }</a>`;
const fullpagenamee = code( '{{FULLPAGENAMEE}}' );

const intro = banana.i18n(
	'url-structure-example',
	'<pre dir="ltr" class="app-url-structure__example">' +
		'https://pageviews.wmcloud.org/?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>',
	code( 'en.wikipedia.org' ),
	sitematrixLink,
	fullpagenamee
);

// The special ranges accepted by the range param (legacy parity).
const rangesList = '<ul>' + [
	[ `${ code( 'latest' ) } ${ defaultMsg }`, banana.i18n( 'url-structure-special-range-latest' ) ],
	[ code( 'latest-<i>N</i>' ), banana.i18n( 'url-structure-special-range-latest-n' ) ],
	[ code( 'current' ), banana.i18n( 'url-structure-current' ) ],
	...[ 'this-week', 'last-week', 'this-month', 'last-month', 'this-year', 'last-year' ]
		.map( ( range ) => [ code( range ), banana.i18n( range ) ] ),
	[ code( 'all-time' ), banana.i18n( 'all-time' ) ]
].map( ( [ term, description ] ) => `<li>${ term } ${ description }</li>` ).join( '' ) + '</ul>';

// Ported from the legacy URL structure page (views/url_parts/).
const params = [
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-project',
			`${ code( 'en.wikipedia.org' ) } ${ defaultMsg } `,
			sitematrixLink
		)
	},
	{
		name: 'pages',
		html: `${ banana.i18n( 'url-structure-pages' ) }<br>` +
			banana.i18n( 'url-structure-onwiki-link', fullpagenamee )
	},
	{
		name: 'range',
		html: banana.i18n( 'url-structure-special-range', code( 'start' ), code( 'end' ) ) +
			rangesList
	},
	{
		name: 'start',
		html: [
			banana.i18n( 'url-structure-start-date', code( 'YYYY-MM-DD' ), code( 'end' ) ),
			banana.i18n( 'url-structure-start-month', code( 'YYYY-MM' ) ),
			banana.i18n( 'url-structure-start-date-earliest', code( 'earliest' ) )
		].join( '<br>' )
	},
	{
		name: 'end',
		html: [
			banana.i18n( 'url-structure-end-date', code( 'YYYY-MM-DD' ) ),
			banana.i18n( 'url-structure-end-month', code( 'YYYY-MM' ) ),
			banana.i18n( 'url-structure-end-date-latest', code( 'latest' ) )
		].join( '<br>' )
	},
	{
		name: 'platform',
		html: ( () => {
			const values = [
				`${ code( 'all-access' ) } ${ defaultMsg }`,
				code( 'desktop' ),
				code( 'mobile-app' ),
				code( 'mobile-web' )
			];
			return banana.i18n(
				'list-values',
				values.join( `${ banana.i18n( 'comma-character' ) } ` ),
				values.length
			);
		} )()
	},
	{
		name: 'agent',
		html: banana.i18n(
			'url-structure-agent',
			code( 'user' ), code( 'spider' ), code( 'automated' ), code( 'all-agents' )
		)
	},
	{
		name: 'redirects',
		html: banana.i18n( 'url-structure-redirects', code( '1' ), code( '0' ) )
	},
	{
		name: 'autolog',
		html: banana.i18n(
			'url-structure-autolog',
			code( 'false' ),
			`"${ banana.i18n( 'logarithmic-scale' ) }"`
		)
	},
	{
		name: 'mutevalidations',
		html: banana.i18n( 'url-structure-mute-validations', code( 'true' ) )
	}
];
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-url-structure {
	&__example {
		background: @background-color-neutral-subtle;
		overflow-x: auto;
		padding: @spacing-50;
	}

	&__params {
		dt {
			font-weight: @font-weight-bold;
			margin-top: @spacing-75;
		}

		dd {
			margin: @spacing-25 0 0;
		}
	}
}
</style>
