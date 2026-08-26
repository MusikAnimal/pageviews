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
	agentParam,
	autologParam,
	code,
	dateRangeParams,
	defaultMsg,
	listValues,
	muteValidationsParam,
	namespaceManualLink,
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

const rootpagenamee = code( '{{ROOTPAGENAMEE}}' );

// Ported from the legacy Userviews URL structure page
// (views/userviews/url_structure.haml).
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
		name: 'user',
		html: `${ banana.i18n( 'url-structure-user' ) }<br>` +
			banana.i18n( 'url-structure-userviews-onwiki-link', rootpagenamee )
	},
	{
		name: 'namespace',
		html: banana.i18n(
			'url-structure-userviews-namespace',
			code( '0' ), code( 'all' ),
			namespaceManualLink( banana.i18n( 'namespace-id' ) )
		)
	},
	{
		name: 'redirects',
		html: banana.i18n(
			'url-structure-userviews-redirects',
			code( '0' ), code( '1' ), code( '2' )
		)
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
			code( 'title' ), code( 'datestamp' ), code( 'size' ), code( 'views' )
		] )
	},
	{
		name: 'direction',
		html: banana.i18n( 'url-structure-sort-direction', code( '1' ), code( '-1' ) )
	},
	autologParam(),
	muteValidationsParam()
];
</script>
