<template>
	<div class="app-export">
		<CdxMenuButton
			v-model:selected="selection"
			class="app-export__download"
			weight="normal"
			:menu-items="menuItems"
			:aria-label="$i18n( 'download-label' )"
			@update:selected="onSelect"
		>
			<CdxIcon :icon="cdxIconDownload" />
			{{ $i18n( 'download-label' ) }}
		</CdxMenuButton>
		<CdxButton
			class="app-export__permalink"
			:aria-label="$i18n( 'permalink' )"
			@click="copyPermalink"
		>
			<CdxIcon :icon="cdxIconLink" />
			{{ $i18n( 'permalink' ) }}
		</CdxButton>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex';
import { cdxIconDownload, cdxIconLink } from '@wikimedia/codex-icons';
import { useUiStore } from '../stores/ui.js';
import { buildCsv } from '../lib/csv.js';
import { downloadFile } from '../lib/download.js';
import { banana } from '../i18n.js';

const props = defineProps( {
	/**
	 * The date axis (YYYY-MM-DD / YYYY-MM strings).
	 */
	dates: {
		type: Array,
		required: true
	},
	/**
	 * Series as { title, counts, total, average } objects.
	 */
	series: {
		type: Array,
		required: true
	},
	/**
	 * Filename stem, e.g. 'pageviews-2026-07-01-2026-07-20'.
	 */
	filename: {
		type: String,
		required: true
	},
	/**
	 * Returns the chart's PNG data URL (from Chart.vue's exposed
	 * getPngDataUrl); null hides the PNG option.
	 */
	getPng: {
		type: Function,
		default: null
	}
} );

const ui = useUiStore();
const selection = ref( null );

const menuItems = [
	{ value: 'csv', label: banana.i18n( 'csv' ) },
	{ value: 'json', label: banana.i18n( 'json' ) },
	...( props.getPng ? [ { value: 'png', label: banana.i18n( 'png' ) } ] : [] )
];

const actions = {
	csv() {
		const rows = [
			[ 'Date', ...props.series.map( ( s ) => s.title ) ],
			...props.dates.map( ( date, i ) => [
				date,
				...props.series.map( ( s ) => s.counts[ i ] ?? 0 )
			] )
		];
		downloadFile( `${ props.filename }.csv`, buildCsv( rows ), 'text/csv' );
	},
	json() {
		const data = props.series.map( ( s ) => ( {
			title: s.title,
			total: s.total,
			average: s.average,
			views: Object.fromEntries(
				props.dates.map( ( date, i ) => [ date, s.counts[ i ] ?? 0 ] )
			)
		} ) );
		downloadFile( `${ props.filename }.json`, JSON.stringify( data ), 'application/json' );
	},
	png() {
		const dataUrl = props.getPng();
		if ( dataUrl ) {
			const link = document.createElement( 'a' );
			link.href = dataUrl;
			link.download = `${ props.filename }.png`;
			link.click();
		}
	}
};

async function copyPermalink() {
	await navigator.clipboard.writeText( location.href );
	ui.notify( { type: 'success', text: banana.i18n( 'permalink' ) } );
}

function onSelect( value ) {
	if ( value && actions[ value ] ) {
		actions[ value ]();
	}
	// It's a menu of actions, not a persistent selection.
	selection.value = null;
}
</script>
