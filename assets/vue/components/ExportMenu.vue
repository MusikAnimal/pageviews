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
		<div class="app-export__permalink-group" role="group">
			<CdxButton
				class="app-export__permalink"
				:aria-label="$i18n( 'permalink' )"
				@click="copyPermalink"
			>
				<CdxIcon :icon="cdxIconLink" />
				{{ $i18n( 'permalink' ) }}
			</CdxButton>
			<!-- Chart contexts only: a connected menu with permalink
				variants (currently one). -->
			<CdxMenuButton
				v-if="getChartOptions"
				v-model:selected="permalinkSelection"
				class="app-export__permalink-more"
				weight="normal"
				:menu-items="permalinkItems"
				:aria-label="$i18n( 'permalink-more-label' )"
				@update:selected="onPermalinkSelect"
			>
				<CdxIcon :icon="cdxIconExpand" />
			</CdxMenuButton>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex';
import { useAppToast } from '../composables/useAppToast.js';
import { cdxIconDownload, cdxIconExpand, cdxIconLink, cdxIconPrinter } from '@wikimedia/codex-icons';
import { useSettingsStore } from '../stores/settings.js';
import { buildCsv } from '../lib/csv.js';
import { downloadFile } from '../lib/download.js';
import { banana } from '../i18n.js';

const props = defineProps( {
	/**
	 * The date axis (YYYY-MM-DD / YYYY-MM strings). Unused when the
	 * host supplies its own getCsvRows/getJson builders.
	 */
	dates: {
		type: Array,
		default: () => []
	},
	/**
	 * Series as { title, counts, total, average } objects. Unused when
	 * the host supplies its own getCsvRows/getJson builders.
	 */
	series: {
		type: Array,
		default: () => []
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
	},
	/**
	 * Returns the chart's effective toolbar options ({ charttype,
	 * showvalues, logarithmic, movingaverage, linear }), enabling the
	 * "Include all chart options" permalink variant. Chart contexts
	 * only (ChartPanel passes it); null hides the variants menu.
	 */
	getChartOptions: {
		type: Function,
		default: null
	},
	/**
	 * Returns CSV rows (arrays, header first), replacing the default
	 * dates × series shape — for list views, whose exports are one row
	 * per page.
	 */
	getCsvRows: {
		type: Function,
		default: null
	},
	/**
	 * Returns the JSON-serializable export data, replacing the default
	 * per-series timeseries objects.
	 */
	getJson: {
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
		const rows = props.getCsvRows ? props.getCsvRows() : [
			[ 'Date', ...props.series.map( ( s ) => s.title ) ],
			...props.dates.map( ( date, i ) => [
				date,
				...props.series.map( ( s ) => s.counts[ i ] ?? 0 )
			] )
		];
		downloadFile( `${ props.filename }.csv`, buildCsv( rows ), 'text/csv' );
	},
	json() {
		const data = props.getJson ? props.getJson() : props.series.map( ( s ) => ( {
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

/**
 * @param {boolean} [withChartOptions] Append the one-shot chart-option
 *   params, so the link reproduces the chart's exact look. Strictly
 *   compared: as a bare click handler the argument is the event.
 */
async function copyPermalink( withChartOptions = false ) {
	withChartOptions = withChartOptions === true;
	const url = new URL( location.href );
	// Permalinks pin the exact resolved dates: a relative range like
	// latest-30 would show different data later (legacy behavior).
	if ( url.searchParams.has( 'range' ) ) {
		url.searchParams.delete( 'range' );
		url.searchParams.set( 'start', settings.start );
		url.searchParams.set( 'end', settings.end );
	}
	if ( withChartOptions && props.getChartOptions ) {
		const options = props.getChartOptions();
		url.searchParams.set( 'charttype', options.charttype );
		if ( options.linear ) {
			// The scale/label/overlay toggles only exist on the
			// linear (line/bar) types.
			url.searchParams.set( 'showvalues', options.showvalues ? '1' : '0' );
			url.searchParams.set( 'logarithmic', options.logarithmic ? '1' : '0' );
			url.searchParams.set( 'movingaverage', options.movingaverage ? '1' : '0' );
		}
	}
	await navigator.clipboard.writeText( url.toString() );
	toast.success( banana.i18n( 'permalink-copied' ), { autoDismiss: true } );
}

const permalinkSelection = ref( null );
const permalinkItems = [
	{ value: 'chart-options', label: banana.i18n( 'permalink-chart-options' ) }
];

function onPermalinkSelect( value ) {
	if ( value === 'chart-options' ) {
		copyPermalink( true );
	}
	// A menu of actions, not a persistent selection.
	permalinkSelection.value = null;
}

function onSelect( value ) {
	if ( value && actions[ value ] ) {
		actions[ value ]();
	}
	// It's a menu of actions, not a persistent selection.
	selection.value = null;
}
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-export {
	display: flex;
	gap: @spacing-50;
}

// The Permalink button and its variants menu read as one control:
// flush edges, the shared border collapsed. Unscoped (BEM-prefixed)
// because the toggle element belongs to Codex.
.app-export__permalink-group {
	display: flex;

	.app-export__permalink {
		border-start-end-radius: 0;
		border-end-end-radius: 0;
	}

	.app-export__permalink-more {
		margin-inline-start: -@border-width-base;

		.cdx-button {
			border-start-start-radius: 0;
			border-end-start-radius: 0;
		}
	}
}
</style>
