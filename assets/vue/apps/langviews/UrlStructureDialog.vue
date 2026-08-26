<template>
	<BaseUrlStructureDialog
		:open="open"
		:params="params"
		@update:open="( value ) => emit( 'update:open', value )"
	/>
</template>

<script setup>
import BaseUrlStructureDialog from '../../components/UrlStructureDialog.vue';
import {
	chartOptionParams,
	agentParam,
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

const fullpagenamee = code( '{{FULLPAGENAMEE}}' );

// Ported from the legacy Langviews URL structure page
// (views/langviews/url_structure.haml).
const params = [
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-project',
			`${ code( 'en.wikipedia.org' ) } ${ defaultMsg() } `,
			sitematrixLink( banana.i18n( 'project' ).toLowerCase() )
		)
	},
	{
		name: 'page',
		html: `${ banana.i18n( 'url-structure-page' ) }<br>` +
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
		name: 'sort',
		html: `${ banana.i18n( 'url-structure-sort' ) } ` + listValues( [
			code( 'lang' ), code( 'title' ), code( 'badges' ), code( 'views' )
		] )
	},
	{
		name: 'direction',
		html: banana.i18n( 'url-structure-sort-direction', code( '1' ), code( '-1' ) )
	},
	...chartOptionParams()
];
</script>
