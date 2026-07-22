<template>
	<div class="app-chart__toolbar">
		<ChartTypeSelect v-model="selectedChartType" />
		<ExportMenu
			:dates="dates"
			:series="exportSeries"
			:filename="filename"
			:get-png="() => chartRef?.getPngDataUrl()"
		/>
		<CdxButton
			v-if="linearType"
			@click="chartRef?.resetZoom()"
		>
			{{ $i18n( 'reset-zoom' ) }}
		</CdxButton>
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
	</div>
	<Chart
		ref="chartRef"
		:option="chartOption"
		:aria-label="ariaLabel"
	/>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { CdxButton, CdxCheckbox } from '@wikimedia/codex';
import { usePreferencesStore } from '../stores/preferences.js';
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
	 * Whether automatic log-scale detection is allowed (the app
	 * store's autolog URL param).
	 */
	autolog: {
		type: Boolean,
		default: true
	},
	ariaLabel: {
		type: String,
		default: ''
	}
} );

const preferences = usePreferencesStore();
const dark = usePrefersDark();
const chartRef = ref( null );

// Reading dark.value makes the theme (CSS custom properties change with
// the mode) and thus the chart option rebuild when the mode flips.
const theme = computed( () => ( { dark: dark.value, ...chartTheme() } ) );

// null = automatic (the legacy default: bar for a single series, line
// for comparisons); set once the user picks a type explicitly. With
// the remember-chart preference on, the pick persists across sessions
// under the legacy tool's storage key, shared by all apps.
const userChartType = ref( null );
const rememberedChartType = persistentRef( 'pageviews-chart-preference', null );

const selectedChartType = computed( {
	get: () => userChartType.value ??
		( preferences.rememberChart ? rememberedChartType.value : null ) ??
		( props.series.length > 1 ? 'line' : 'bar' ),
	set: ( value ) => {
		userChartType.value = value;
		if ( preferences.rememberChart ) {
			rememberedChartType.value = value;
		}
	}
} );

// Only the linear chart types can plot on a log axis or be zoomed.
const linearType = computed( () => [ 'line', 'bar' ].includes( selectedChartType.value ) );

const logScale = ref( false );
const showValues = ref( false );

// Auto-enable on spiky data (the legacy Theil-index heuristic), when
// the preference allows and the URL doesn't carry autolog=false; the
// user can always override via the checkbox.
watch( () => props.series, ( series ) => {
	if ( preferences.autoLogDetection && props.autolog ) {
		logScale.value = shouldUseLogScale( series.map( ( entry ) => entry.counts ) );
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
		beginAtZero: preferences.beginAtZero,
		smooth: preferences.bezierCurve,
		monthly: props.monthly,
		...common
	} );
} );
</script>
