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

// Covers the sources ported so far; grows with the sources.
const params = [
	{
		name: 'source',
		html: listValues( [ `${ code( 'commons-category' ) } ${ defaultMsg() }` ] )
	},
	{
		name: 'target',
		html: banana.i18n( 'url-structure-massviews-commons-target', code( 'UNESCO' ) )
	},
	{
		name: 'scope',
		html: banana.i18n(
			'url-structure-massviews-scope',
			`${ code( 'deep' ) } ${ defaultMsg() }`,
			code( 'shallow' )
		)
	},
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-project',
			`${ code( 'all-wikis' ) } ${ defaultMsg() } `,
			sitematrixLink( banana.i18n( 'project' ).toLowerCase() )
		)
	},
	...dateRangeParams()
];
</script>
