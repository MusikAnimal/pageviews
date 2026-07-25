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
	agentParam,
	code,
	dateRangeParams,
	defaultMsg,
	listValues,
	muteValidationsParam
} from '../../lib/urlStructure.js';
import { banana } from '../../i18n.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

// Grows as the remaining page-list sources are ported.
const params = [
	{
		name: 'source',
		html: listValues( [ `${ code( 'category' ) } ${ defaultMsg() }` ] )
	},
	{
		name: 'target',
		html: banana.i18n( 'url-structure-massviews-target' )
	},
	{
		name: 'subjectpage',
		html: `${ banana.i18n( 'category-subject-toggle' ) } ` +
			listValues( [ `${ code( '0' ) } ${ defaultMsg() }`, code( '1' ) ] )
	},
	{
		name: 'subcategories',
		html: `${ banana.i18n( 'include-subcategories' ) } ` +
			listValues( [ `${ code( '0' ) } ${ defaultMsg() }`, code( '1' ) ] )
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
			code( 'title' ), code( 'views' )
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
