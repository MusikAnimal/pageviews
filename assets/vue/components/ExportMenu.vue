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
import { useAppToast } from '../composables/useAppToast.js';
import { cdxIconDownload, cdxIconLink, cdxIconPrinter } from '@wikimedia/codex-icons';
import { useSettingsStore } from '../stores/settings.js';
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

const toast = useAppToast();
const settings = useSettingsStore();
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
	// Print the chart image from a hidden same-page iframe. A
	// throwaway tab (the legacy approach) is unreliable in Chrome,
	// which doesn't consistently honor scripted print() in about:blank
	// popups; an iframe avoids popup blockers entirely.
	print() {
		const dataUrl = props.getPng();
		if ( !dataUrl ) {
			return;
		}
		// One print frame at a time.
		document.querySelector( '.app-export__print-frame' )?.remove();

		const iframe = document.createElement( 'iframe' );
		iframe.className = 'app-export__print-frame';
		iframe.style.position = 'fixed';
		iframe.style.right = '100%';
		document.body.appendChild( iframe );

		const img = iframe.contentDocument.createElement( 'img' );
		img.style.maxWidth = '100%';
		img.onload = () => {
			iframe.contentWindow.focus();
			iframe.contentWindow.print();
		};
		iframe.contentWindow.addEventListener(
			'afterprint', () => iframe.remove()
		);
		iframe.contentDocument.body.appendChild( img );
		img.src = dataUrl;
	}
};

async function copyPermalink() {
	const url = new URL( location.href );
	// Permalinks pin the exact resolved dates: a relative range like
	// latest-30 would show different data later (legacy behavior).
	if ( url.searchParams.has( 'range' ) ) {
		url.searchParams.delete( 'range' );
		url.searchParams.set( 'start', settings.start );
		url.searchParams.set( 'end', settings.end );
	}
	await navigator.clipboard.writeText( url.toString() );
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
