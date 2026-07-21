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
 * @param {boolean} [input.localizeFormats] User preference; false = ISO
 *   dates and unformatted numbers.
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
	localizeFormats = true,
	showLegend = false,
	theme = {}
} ) {
	const number = ( value ) => formatNumber( value, locale, localizeFormats );

	const xLabels = dates.map( ( dateStr ) => {
		const date = parseDate( dateStr );
		const label = formatDate( date, { locale, monthly, localize: localizeFormats } );
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
		grid: { containLabel: true, left: 8, right: 8, bottom: 40 },
		// The toolbox dataZoom feature must exist for the always-on
		// drag-to-zoom that useChart() activates via takeGlobalCursor,
		// but ECharts skips feature creation entirely under
		// `show: false` — so it renders off-canvas instead, invisible
		// and unclickable. Zoom is reset from our own toolbar.
		toolbox: {
			show: true,
			top: -9999,
			feature: {
				dataZoom: { yAxisIndex: false }
			}
		},
		dataZoom: [ { type: 'inside' } ],
		xAxis: {
			type: 'category',
			data: xLabels,
			axisLine: { lineStyle: { color: theme.border } },
			axisLabel: { color: theme.subtleText }
		},
		yAxis: {
			type: logScale ? 'log' : 'value',
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
