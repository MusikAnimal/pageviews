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
	code,
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

// Ported from the legacy Topviews URL structure page
// (views/topviews/url_structure.haml), plus the yearly form.
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
		name: 'excludes',
		html: banana.i18n( 'url-structure-excludes' )
	},
	{
		name: 'date',
		html: `${ banana.i18n( 'url-structure-topviews-date' ) } ` + listValues( [
			`${ code( 'last-month' ) } ${ defaultMsg() }`,
			code( 'yesterday' ),
			banana.i18n( 'url-structure-topviews-date-month', code( 'YYYY-MM' ) ),
			banana.i18n( 'url-structure-topviews-date-day', code( 'YYYY-MM-DD' ) ),
			code( 'YYYY' )
		] )
	},
	{
		name: 'platform',
		html: listValues( [
			`${ code( 'all-access' ) } ${ defaultMsg() }`,
			code( 'desktop' ),
			code( 'mobile-app' ),
			code( 'mobile-web' )
		] )
	},
	{
		name: 'mobileviews',
		html: banana.i18n(
			'url-structure-topviews-mobileviews',
			banana.i18n( 'show-mobile-percentages' ),
			code( 'platform' ),
			code( 'all-access' )
		)
	},
	{
		name: 'mainspace',
		html: banana.i18n( 'url-structure-topviews-mainspace' )
	}
];
</script>
