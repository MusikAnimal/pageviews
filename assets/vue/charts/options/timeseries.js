import { seriesColor } from '../palette.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';

/**
 * Pure option builder for line and bar timeseries charts. Components pass
 * the result to Chart.vue; nothing here touches echarts or the DOM.
 */

/**
 * @param {Object} input
 * @param {string[]} input.dates YYYY-MM-DD (daily) or YYYY-MM (monthly).
 * @param {Array<{label: string, data: Array<?number>}>} input.series
 * @param {'line'|'bar'} [input.chartType]
 * @param {boolean} [input.logScale] Zeros are plotted as gaps (nulls):
 *   a log axis cannot represent 0.
 * @param {boolean} [input.beginAtZero]
 * @param {boolean} [input.showValues] Data labels above points/bars.
 * @param {boolean} [input.smooth] Bezier curves (line only).
 * @param {boolean} [input.monthly]
 * @param {string} [input.locale]
 * @param {boolean} [input.localizeDates] User preference; false = ISO dates.
 * @param {boolean} [input.localizeNumbers] User preference; false =
 *   unformatted numbers.
 * @param {boolean} [input.showLegend] Off by default: the colored page
 *   chips above the chart act as the legend.
 * @param {Object} [input.theme] From chartTheme().
 * @return {Object} An ECharts option object.
 */
export function buildTimeseriesOption( {
	dates,
	series,
	chartType = 'line',
	logScale = false,
	beginAtZero = false,
	showValues = false,
	smooth = false,
	monthly = false,
	locale = 'en',
	localizeDates = true,
	localizeNumbers = true,
	showLegend = false,
	theme = {}
} ) {
	const number = ( value ) => formatNumber( value, locale, localizeNumbers );

	const xLabels = dates.map( ( dateStr ) => {
		const date = parseDate( dateStr );
		const label = formatDate( date, { locale, monthly, localize: localizeDates } );
		// Match the legacy tool: mark Mondays in daily mode for orientation.
		return !monthly && date.getUTCDay() === 1 ? `• ${ label }` : label;
	} );

	return {
		aria: { enabled: true },
		backgroundColor: 'transparent',
		textStyle: { color: theme.text },
		tooltip: {
			trigger: 'axis',
			valueFormatter: number
		},
		legend: {
			show: showLegend && series.length > 1,
			top: 0,
			textStyle: { color: theme.text }
		},
		// ECharts defaults grid.top to 60px for a title/legend we
		// don't render; a small margin still leaves headroom for the
		// topmost value label. containLabel already reserves the room
		// the rotated date labels need, so the margins stay minimal.
		grid: { containLabel: true, top: 12, left: 8, right: 8, bottom: 8 },
		// The toolbox dataZoom feature must exist for the always-on
		// drag-select that useChart() activates via takeGlobalCursor,
		// but ECharts skips feature creation entirely under
		// `show: false` — so it renders off-canvas instead, invisible
		// and unclickable. The selection is not kept as a client-side
		// zoom: it narrows the date params and re-queries.
		toolbox: {
			show: true,
			top: -9999,
			feature: {
				dataZoom: { yAxisIndex: false }
			}
		},
		xAxis: {
			type: 'category',
			data: xLabels,
			// Line points sit on the ticks (and thus the vertical grid
			// lines); bars keep the banded layout they need.
			boundaryGap: chartType === 'bar',
			axisLine: { lineStyle: { color: theme.border } },
			// Rotated like the legacy tool, so more dates fit before
			// ECharts starts dropping labels.
			axisLabel: { color: theme.subtleText, rotate: 45 },
			// Vertical grid lines (off by default on category axes).
			splitLine: { show: true, lineStyle: { color: theme.grid } }
		},
		yAxis: {
			type: logScale ? 'log' : 'value',
			// Pageviews are integers; never show fractional ticks
			// (minInterval only applies to value axes).
			...( logScale ? {} : { minInterval: 1 } ),
			...( beginAtZero && !logScale ? { min: 0 } : {} ),
			axisLabel: {
				color: theme.subtleText,
				formatter: number
			},
			splitLine: { lineStyle: { color: theme.grid } }
		},
		series: series.map( ( { label, data }, index ) => ( {
			name: label,
			type: chartType,
			data: logScale ? data.map( ( value ) => value || null ) : data,
			connectNulls: false,
			...( chartType === 'line' ?
				{
					smooth,
					itemStyle: { color: seriesColor( index ) }
				} :
				{
					itemStyle: {
						color: seriesColor( index, 0.6 ),
						borderColor: seriesColor( index )
					}
				}
			),
			label: {
				show: showValues,
				position: 'top',
				color: theme.text,
				formatter: ( { value } ) => value === null ? '' : number( value )
			}
		} ) )
	};
}
