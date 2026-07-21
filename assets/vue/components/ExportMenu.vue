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
import { CdxButton, CdxIcon, CdxMenuButton, useToast } from '@wikimedia/codex';
import { cdxIconDownload, cdxIconLink, cdxIconPrinter } from '@wikimedia/codex-icons';
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

const toast = useToast();
const selection = ref( null );

const menuItems = [
	{ value: 'csv', label: banana.i18n( 'csv' ) },
	{ value: 'json', label: banana.i18n( 'json' ) },
	...( props.getPng ? [
		{ value: 'png', label: banana.i18n( 'png' ) },
		{ value: 'print', label: banana.i18n( 'print' ), icon: cdxIconPrinter }
	] : [] )
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
	},
	// Like the legacy tool: print the chart image from a throwaway tab.
	print() {
		const dataUrl = props.getPng();
		if ( !dataUrl ) {
			return;
		}
		const tab = window.open( '' );
		tab.document.write( `<img src="${ dataUrl }" style="max-width: 100%;">` );
		tab.document.close();
		tab.print();
		tab.close();
	}
};

async function copyPermalink() {
	await navigator.clipboard.writeText( location.href );
	toast.success( banana.i18n( 'permalink-copied' ), { autoDismiss: true } );
}

function onSelect( value ) {
	if ( value && actions[ value ] ) {
		actions[ value ]();
	}
	// It's a menu of actions, not a persistent selection.
	selection.value = null;
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-export {
	display: flex;
	gap: @spacing-50;
}
</style>
