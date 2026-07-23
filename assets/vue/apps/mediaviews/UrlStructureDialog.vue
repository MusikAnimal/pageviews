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
	autologParam,
	code,
	dateRangeParams,
	defaultMsg,
	listValues,
	muteValidationsParam,
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

// Ported from the legacy Mediaviews URL structure page
// (views/mediaviews/url_structure.haml).
const params = [
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-project',
			`${ code( 'commons.wikimedia.org' ) } ${ defaultMsg() } `,
			sitematrixLink( banana.i18n( 'project' ).toLowerCase() )
		)
	},
	{
		name: 'files',
		html: banana.i18n(
			'url-structure-files',
			code( 'Example.jpg|Example.ogg' )
		)
	},
	...dateRangeParams(),
	{
		name: 'referer',
		html: listValues( [
			`${ code( 'all-referers' ) } ${ defaultMsg() }`,
			code( 'internal' ),
			code( 'external' ),
			code( 'search-engine' ),
			code( 'unknown' ),
			code( 'none' )
		] )
	},
	{
		name: 'agent',
		// No 'automated' agent for mediarequests.
		html: listValues( [
			`${ code( 'user' ) } ${ defaultMsg() }`,
			code( 'spider' ),
			code( 'all-agents' )
		] )
	},
	autologParam(),
	muteValidationsParam()
];
</script>
