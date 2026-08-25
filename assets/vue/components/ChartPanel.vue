<template>
	<div class="app-chart__toolbar">
		<ChartTypeSelect v-model="selectedChartType" />
		<ExportMenu
			:dates="dates"
			:series="exportSeries"
			:filename="filename"
			:get-png="() => chartRef?.getPngDataUrl()"
		/>
		<!-- Inline: block checkboxes carry a bottom margin that throws
			off the toolbar's vertical centering. -->
		<CdxCheckbox
			v-if="linearType"
			v-model="showValues"
			class="app-chart__show-values"
			:inline="true"
		>
			{{ $i18n( 'show-values' ) }}
		</CdxCheckbox>
		<CdxCheckbox
			v-if="linearType"
			v-model="logScale"
			:inline="true"
		>
			{{ $i18n( 'logarithmic-scale' ) }}
		</CdxCheckbox>
		<CdxCheckbox
			v-if="linearType"
			v-model="movingAverage"
			:inline="true"
		>
			{{ $i18n( 'moving-average' ) }}
		</CdxCheckbox>
	</div>
	<Chart
		ref="chartRef"
		:option="chartOption"
		:aria-label="ariaLabel"
		:no-range-select="noRangeSelect"
		@range-select="onRangeSelect"
	/>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CdxCheckbox } from '@wikimedia/codex';
import { usePreferencesStore } from '../stores/preferences.js';
import { storeToRefs } from 'pinia';
import { useChartControlsStore } from '../stores/chartControls.js';
import { useSettingsStore } from '../stores/settings.js';
import { usePrefersDark } from '../composables/useChart.js';
import { buildTimeseriesOption } from '../charts/options/timeseries.js';
import { buildCircularOption } from '../charts/options/circular.js';
import { buildRadarOption } from '../charts/options/radar.js';
import { chartTheme } from '../charts/theme.js';
import { shouldUseLogScale } from '../charts/logScale.js';
import { persistentRef } from '../lib/storage.js';
import { banana } from '../i18n.js';
import Chart from './Chart.vue';
import ChartTypeSelect from './ChartTypeSelect.vue';
import ExportMenu from './ExportMenu.vue';

/**
 * The full chart area every chart app shares: type selector, exports,
 * zoom reset, show-values and log-scale toggles, and the chart itself.
 */
const props = defineProps( {
	/**
	 * The date axis (YYYY-MM-DD / YYYY-MM strings).
	 */
	dates: {
		type: Array,
		required: true
	},
	/**
	 * Series as { label, counts, total, average } objects.
	 */
	series: {
		type: Array,
		required: true
	},
	monthly: {
		type: Boolean,
		default: false
	},
	/**
	 * Filename stem for downloads.
	 */
	filename: {
		type: String,
		required: true
	},
	/**
	 * Set when the app store's autolog URL param disallows automatic
	 * log-scale detection.
	 */
	noAutolog: {
		type: Boolean,
		default: false
	},
	ariaLabel: {
		type: String,
		default: ''
	},
	/**
	 * Disables drag-select-to-requery (list apps: their fan-out is
	 * expensive and only re-fires on explicit submission).
	 */
	noRangeSelect: {
		type: Boolean,
		default: false
	}
} );

const preferences = usePreferencesStore();
const settings = useSettingsStore();
const dark = usePrefersDark();

/**
 * Drag-selecting a range narrows the shared date params instead of
 * zooming client-side: the load watchers then re-query everything for
 * the new range — pageviews and the revision data alike.
 *
 * @param {number} startIndex
 * @param {number} endIndex
 */
function onRangeSelect( startIndex, endIndex ) {
	const start = props.dates[ startIndex ];
	const end = props.dates[ endIndex ];
	if ( start && end && start <= end ) {
		settings.start = start;
		settings.end = end;
	}
}
const chartRef = ref( null );

// Reading dark.value makes the theme (CSS custom properties change with
// the mode) and thus the chart option rebuild when the mode flips.
const theme = computed( () => ( { dark: dark.value, ...chartTheme() } ) );

// The toolbar picks live in the chartControls store, surviving this
// panel's unmount while a new query loads. null = no explicit pick
// (the default is a line chart). With the remember-chart preference
// on, the pick also persists across sessions under the legacy
// tool's storage key, shared by all apps.
const controls = useChartControlsStore();
const { showValues } = storeToRefs( controls );
const rememberedChartType = persistentRef( 'pageviews-chart-preference', null );

const selectedChartType = computed( {
	get: () => controls.userChartType ??
		( preferences.rememberChart ? rememberedChartType.value : null ) ??
		'line',
	set: ( value ) => {
		controls.userChartType = value;
		if ( preferences.rememberChart ) {
			rememberedChartType.value = value;
		}
	}
} );

// Only the linear chart types can plot on a log axis or be zoomed.
const linearType = computed( () => [ 'line', 'bar' ].includes( selectedChartType.value ) );

// Auto-enabled on spiky data (the legacy Theil-index heuristic) when
// the preference allows and the URL doesn't carry autolog=false; a
// manual pick — kept across reloads — always wins.
const autoLog = computed( () => preferences.autoLogDetection && !props.noAutolog &&
	shouldUseLogScale( props.series.map( ( entry ) => entry.counts ) )
);
const logScale = computed( {
	get: () => controls.userLogScale ?? autoLog.value,
	set: ( value ) => {
		controls.userLogScale = value;
	}
} );

// The preference provides the default; the toolbar checkbox
// overrides until the next page load.
const movingAverage = computed( {
	get: () => controls.userMovingAverage ?? preferences.movingAverage,
	set: ( value ) => {
		controls.userMovingAverage = value;
	}
} );

const exportSeries = computed( () => props.series.map( ( entry ) => ( {
	title: entry.label,
	counts: entry.counts,
	total: entry.total,
	average: entry.average
} ) ) );

const chartOption = computed( () => {
	const type = selectedChartType.value;
	const common = {
		locale: banana.locale,
		localizeDates: preferences.localizeDateFormat,
		localizeNumbers: preferences.numericalFormatting,
		theme: theme.value
	};
	const timeseries = props.series.map(
		( entry ) => ( { label: entry.label, data: entry.counts } )
	);

	if ( [ 'pie', 'doughnut', 'polarArea' ].includes( type ) ) {
		return buildCircularOption( {
			series: props.series.map( ( entry ) => ( { label: entry.label, total: entry.total } ) ),
			chartType: type,
			...common
		} );
	}
	if ( type === 'radar' ) {
		return buildRadarOption( {
			dates: props.dates,
			series: timeseries,
			monthly: props.monthly,
			...common
		} );
	}
	return buildTimeseriesOption( {
		dates: props.dates,
		series: timeseries,
		chartType: type,
		logScale: logScale.value,
		showValues: showValues.value,
		movingAverage: movingAverage.value,
		movingAverageSuffix: banana.i18n( 'moving-average' ).toLowerCase(),
		beginAtZero: preferences.beginAtZero,
		smooth: preferences.bezierCurve,
		monthly: props.monthly,
		...common
	} );
} );
</script>
