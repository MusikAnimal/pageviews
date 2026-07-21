import { seriesColor } from '../palette.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';

/**
 * Pure option builder for the radar chart type: one axis (indicator)
 * per date, one polygon per page.
 */

/**
 * @param {Object} input
 * @param {string[]} input.dates YYYY-MM-DD (daily) or YYYY-MM (monthly).
 * @param {Array<{label: string, data: Array<?number>}>} input.series
 * @param {boolean} [input.monthly]
 * @param {string} [input.locale]
 * @param {boolean} [input.localizeDates]
 * @param {boolean} [input.localizeNumbers]
 * @param {Object} [input.theme] From chartTheme().
 * @return {Object} An ECharts option object.
 */
export function buildRadarOption( {
	dates,
	series,
	monthly = false,
	locale = 'en',
	localizeDates = true,
	localizeNumbers = true,
	theme = {}
} ) {
	const number = ( value ) => formatNumber( value, locale, localizeNumbers );
	const max = Math.max( 1, ...series.flatMap( ( { data } ) => data.map( ( v ) => v || 0 ) ) );

	return {
		aria: { enabled: true },
		backgroundColor: 'transparent',
		textStyle: { color: theme.text },
		color: series.map( ( _, index ) => seriesColor( index ) ),
		tooltip: {
			trigger: 'item',
			valueFormatter: number
		},
		radar: {
			indicator: dates.map( ( dateStr ) => ( {
				name: formatDate( parseDate( dateStr ), {
					locale,
					monthly,
					localize: localizeDates
				} ),
				max
			} ) ),
			axisName: { color: theme.subtleText },
			splitLine: { lineStyle: { color: theme.grid } }
		},
		series: [ {
			type: 'radar',
			data: series.map( ( { label, data }, index ) => ( {
				name: label,
				value: data.map( ( v ) => v || 0 ),
				itemStyle: { color: seriesColor( index ) },
				areaStyle: { opacity: 0.1 }
			} ) )
		} ]
	};
}
