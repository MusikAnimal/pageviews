<template>
	<div class="app-workspace">
		<PageviewsSettings />
		<figure class="app-chart">
			<PageInput />
			<CdxMessage
				v-for="message in ui.messages"
				:key="message.id"
				:type="message.type"
				allow-user-dismiss
				@user-dismissed="ui.dismiss( message.id )"
			>
				{{ message.text }}
			</CdxMessage>
			<CdxProgressBar
				v-if="store.status === 'loading'"
				:aria-label="$i18n( 'loading' )"
			/>
			<template v-if="chartReady">
				<div class="app-chart__toolbar">
					<ChartTypeSelect v-model="selectedChartType" />
					<ExportMenu
						:dates="store.dates"
						:series="store.series"
						:filename="exportFilename"
						:get-png="() => chartRef?.getPngDataUrl()"
					/>
				</div>
				<Chart
					ref="chartRef"
					:option="chartOption"
					:aria-label="$i18n( 'pageviews' )"
				/>
			</template>
		</figure>
		<Totals />
	</div>
	<section class="app-breakdown">
		<StatsTable v-if="chartReady" />
	</section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex';
import { usePageviewsStore } from '../stores/pageviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { usePrefersDark } from '../composables/useChart.js';
import { buildTimeseriesOption } from '../charts/options/timeseries.js';
import { buildCircularOption } from '../charts/options/circular.js';
import { buildRadarOption } from '../charts/options/radar.js';
import { chartTheme } from '../charts/theme.js';
import { shouldUseLogScale } from '../charts/logScale.js';
import { banana } from '../i18n.js';
import PageviewsSettings from '../apps/pageviews/Settings.vue';
import PageInput from '../components/PageInput.vue';
import Chart from '../components/Chart.vue';
import ChartTypeSelect from '../components/ChartTypeSelect.vue';
import ExportMenu from '../components/ExportMenu.vue';
import Totals from '../apps/pageviews/Totals.vue';
import StatsTable from '../apps/pageviews/StatsTable.vue';

const store = usePageviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
useQuerySync( store );

const dark = usePrefersDark();

const chartRef = ref( null );

const chartReady = computed(
	() => store.status === 'complete' && store.dates.length > 0
);

const exportFilename = computed(
	() => `pageviews-${ settings.start }-${ settings.end }`
);

// Reading dark.value makes the theme (CSS custom properties change with
// the mode) and thus the chart option rebuild when the mode flips.
const theme = computed( () => ( { dark: dark.value, ...chartTheme() } ) );

// null = automatic (the legacy default: bar for a single page, line
// for comparisons); set once the user picks a type explicitly.
const userChartType = ref( null );

const selectedChartType = computed( {
	get: () => userChartType.value ?? ( store.series.length > 1 ? 'line' : 'bar' ),
	set: ( value ) => {
		userChartType.value = value;
	}
} );

const chartOption = computed( () => {
	const type = selectedChartType.value;
	const common = { locale: banana.locale, theme: theme.value };
	const timeseries = store.series.map(
		( page ) => ( { label: page.title, data: page.counts } )
	);

	if ( [ 'pie', 'doughnut', 'polarArea' ].includes( type ) ) {
		return buildCircularOption( {
			series: store.series.map( ( page ) => ( { label: page.title, total: page.total } ) ),
			chartType: type,
			...common
		} );
	}
	if ( type === 'radar' ) {
		return buildRadarOption( {
			dates: store.dates,
			series: timeseries,
			monthly: settings.dateType === 'monthly',
			...common
		} );
	}
	return buildTimeseriesOption( {
		dates: store.dates,
		series: timeseries,
		chartType: type,
		logScale: shouldUseLogScale( store.series.map( ( page ) => page.counts ) ),
		monthly: settings.dateType === 'monthly',
		...common
	} );
} );

watch(
	() => [
		settings.project,
		settings.start,
		settings.end,
		settings.platform,
		settings.agent,
		settings.dateType,
		store.pages,
		store.redirects
	],
	() => store.load(),
	{ immediate: true, deep: true }
);
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

@form-basis: @size-1600;
@viz-basis: @size-3200;
@totals-basis: @size-1600;
@layout-gap: @size-100;

.app-workspace {
	align-items: flex-start;
	container-type: inline-size;
	display: flex;
	flex-wrap: wrap;
	gap: @layout-gap;

	&__heading {
		text-align: center;
	}
}

.app-settings {
	flex: 1 1 @size-1600;
	padding: @spacing-50;
}

// The column separators live on the chart itself: its left edge when
// sharing a row with the settings form, and its right edge when the
// totals sidebar also fits.
.app-chart {
	flex: 999 1 @size-3200;
	margin: 0;
	min-height: 100px;
	min-width: 0;
	padding: @spacing-50;

	&__toolbar {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-50;
		margin-bottom: @spacing-50;
	}

	@container ( min-width: calc( @form-basis + @viz-basis + @layout-gap ) ) {
		& {
			border-left: @border-width-base solid @border-color-base;
		}
	}

	@container ( min-width: calc( @form-basis + @viz-basis + @totals-basis + 2 * @layout-gap ) ) {
		& {
			border-right: @border-width-base solid @border-color-base;
		}
	}
}

.app-totals {
	flex: 1 1 @size-1600;
	padding: @spacing-50;
}
</style>
