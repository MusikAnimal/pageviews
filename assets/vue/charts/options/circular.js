import { seriesColor } from '../palette.js';
import { formatNumber } from '../../lib/format.js';

/**
 * Pure option builder for the circular chart types, which plot each
 * page's total views as a slice. The legacy Chart.js types map as:
 * pie -> pie, doughnut -> pie with an inner radius, polarArea -> pie
 * with roseType 'area' (a Nightingale rose has the same semantics).
 */

/**
 * @param {Object} input
 * @param {Array<{label: string, total: number}>} input.series
 * @param {'pie'|'doughnut'|'polarArea'} [input.chartType]
 * @param {string} [input.locale]
 * @param {boolean} [input.localizeFormats]
 * @param {Object} [input.theme] From chartTheme().
 * @return {Object} An ECharts option object.
 */
export function buildCircularOption( {
	series,
	chartType = 'pie',
	locale = 'en',
	localizeFormats = true,
	theme = {}
} ) {
	const number = ( value ) => formatNumber( value, locale, localizeFormats );

	return {
		aria: { enabled: true },
		backgroundColor: 'transparent',
		textStyle: { color: theme.text },
		color: series.map( ( _, index ) => seriesColor( index ) ),
		tooltip: {
			trigger: 'item',
			valueFormatter: number
		},
		series: [ {
			type: 'pie',
			...( chartType === 'doughnut' ? { radius: [ '45%', '70%' ] } : {} ),
			...( chartType === 'polarArea' ?
				{ radius: [ '10%', '70%' ], roseType: 'area' } :
				{}
			),
			data: series.map( ( { label, total } ) => ( { name: label, value: total } ) ),
			label: {
				color: theme.text,
				formatter: ( { name, value } ) => `${ name }: ${ number( value ) }`
			}
		} ]
	};
}
