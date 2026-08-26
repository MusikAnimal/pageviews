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

const intro = banana.i18n(
	'url-structure-example-siteviews',
	'<pre dir="ltr" class="app-url-structure__example">' +
		'https://pageviews.wmcloud.org/siteviews?sites={{SERVERNAME}}</pre>'
);

// Ported from the legacy Siteviews URL structure page
// (views/siteviews/url_structure.haml).
const params = [
	{
		name: 'sites',
		html: banana.i18n(
			'url-structure-projects',
			sitematrixLink( banana.i18n( 'projects' ).toLowerCase() ),
			code( 'de.wikipedia.org|fr.wikipedia.org' )
		)
	},
	...dateRangeParams(),
	{
		name: 'source',
		html: banana.i18n(
			'url-structure-source',
			code( 'pageviews' ),
			code( 'unique-devices' )
		)
	},
	{
		name: 'platform',
		html: [
			`<i>${ banana.i18n( 'url-structure-siteviews-platform', 'source', code( 'pageviews' ) ) }:</i><br>` +
				listValues( [
					`${ code( 'all-access' ) } ${ defaultMsg() }`,
					code( 'desktop' ),
					code( 'mobile-app' ),
					code( 'mobile-web' )
				] ),
			`<i>${ banana.i18n( 'url-structure-siteviews-platform-no-pageviews', 'source', code( 'unique-devices' ), code( 'pagecounts' ) ) }:</i><br>` +
				listValues( [
					`${ code( 'all-sites' ) } ${ defaultMsg() }`,
					code( 'desktop-site' ),
					code( 'mobile-site' )
				] )
		].map( ( paragraph ) => `<p>${ paragraph }</p>` ).join( '' )
	},
	agentParam(),
	...chartOptionParams()
];
</script>
