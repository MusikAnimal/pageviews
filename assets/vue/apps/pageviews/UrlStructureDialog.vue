<template>
	<BaseUrlStructureDialog
		:open="open"
		:intro="intro"
		:params="params"
		@update:open="( value ) => emit( 'update:open', value )"
	/>
</template>

<script setup>
import BaseUrlStructureDialog from '../../components/UrlStructureDialog.vue';
import {
	agentParam,
	chartOptionParams,
	code,
	dateRangeParams,
	defaultMsg,
	listValues,
	sitematrixLink
} from '../../lib/urlStructure.js';
import { banana } from '../../i18n.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const projectLink = sitematrixLink( banana.i18n( 'project' ).toLowerCase() );
const fullpagenamee = code( '{{FULLPAGENAMEE}}' );

const intro = banana.i18n(
	'url-structure-example',
	'<pre dir="ltr" class="app-url-structure__example">' +
		'https://pageviews.wmcloud.org/?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>',
	code( 'en.wikipedia.org' ),
	projectLink,
	fullpagenamee
);

// Ported from the legacy URL structure page (views/url_parts/).
const params = [
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-project',
			`${ code( 'en.wikipedia.org' ) } ${ defaultMsg() } `,
			projectLink
		)
	},
	{
		name: 'pages',
		html: `${ banana.i18n( 'url-structure-pages' ) }<br>` +
			banana.i18n( 'url-structure-onwiki-link', fullpagenamee )
	},
	...dateRangeParams(),
	{
		name: 'platform',
		html: listValues( [
			`${ code( 'all-access' ) } ${ defaultMsg() }`,
			code( 'desktop' ),
			code( 'mobile-app' ),
			code( 'mobile-web' )
		] )
	},
	agentParam(),
	{
		name: 'redirects',
		html: banana.i18n( 'url-structure-redirects', code( '1' ), code( '0' ) )
	},
	...chartOptionParams()
];
</script>
