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
	chartOptionParams,
	code,
	dateRangeParams,
	defaultMsg,
	listValues,
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

const params = [
	{
		name: 'source',
		html: listValues( [
			`${ code( 'category' ) } ${ defaultMsg() }`,
			code( 'wikilinks' ),
			code( 'subpages' ),
			code( 'transclusions' ),
			code( 'quarry' ),
			code( 'hashtag' ),
			code( 'external-link' ),
			code( 'search' ),
			code( 'wikiproject' )
		] )
	},
	{
		name: 'target',
		html: banana.i18n( 'url-structure-massviews-target' )
	},
	{
		name: 'project',
		html: banana.i18n(
			'url-structure-massviews-project',
			sitematrixLink( banana.i18n( 'project' ).toLowerCase() )
		)
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
	{
		name: 'redirects',
		html: banana.i18n( 'url-structure-redirects', code( '1' ), code( '0' ) )
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
		name: 'namespace',
		html: banana.i18n(
			'url-structure-userviews-namespace',
			code( 'all' ), code( 'all' ),
			namespaceManualLink( banana.i18n( 'namespace-id' ) )
		)
	},
	{
		name: 'sort',
		html: `${ banana.i18n( 'url-structure-sort' ) } ` + listValues( [
			code( 'title' ), code( 'views' ), code( 'assessment' ), code( 'importance' )
		] )
	},
	{
		name: 'direction',
		html: banana.i18n( 'url-structure-sort-direction', code( '1' ), code( '-1' ) )
	},
	...chartOptionParams()
];
</script>
