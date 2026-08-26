import { ref } from 'vue';
import { defineStore } from 'pinia';

const CHART_TYPES = [ 'line', 'bar', 'pie', 'doughnut', 'polarArea', 'radar' ];

/**
 * The chart toolbar's runtime state: the chart-type pick and the
 * scale/overlay toggles. Held outside ChartPanel because the panel
 * unmounts while a new query loads (and on the list apps' view
 * swaps) — the user's picks must survive an Options change. Runtime
 * state only, per the param tiers: never written to the URL or
 * localStorage (the remembered chart type and the moving-average
 * default are preferences, layered in by ChartPanel) — but the
 * Permalink menu can emit one-shot URL params that seed this state
 * on arrival (see setFromQuery).
 */
export const useChartControlsStore = defineStore( 'chartControls', () => {
	/**
	 * null = no explicit pick yet; automatic behavior applies.
	 *
	 * @type {import('vue').Ref<?string>}
	 */
	const userChartType = ref( null );
	/**
	 * @type {import('vue').Ref<?boolean>}
	 */
	const userLogScale = ref( null );
	/**
	 * @type {import('vue').Ref<boolean>}
	 */
	const showValues = ref( false );
	/**
	 * @type {import('vue').Ref<?boolean>}
	 */
	const userMovingAverage = ref( null );

	/**
	 * Seed the toolbar state from the one-shot chart-option URL params
	 * a "Include all chart options" permalink carries. Unlike the app
	 * stores' setFromQuery, there is no query counterpart: the params
	 * are never serialized back, so they vanish from the URL on the
	 * first store-driven update.
	 *
	 * @param {Object} params Parsed query string.
	 */
	function setFromQuery( params ) {
		if ( CHART_TYPES.includes( params.charttype ) ) {
			userChartType.value = params.charttype;
		}
		if ( params.showvalues !== undefined ) {
			showValues.value = params.showvalues !== '0';
		}
		if ( params.logarithmic !== undefined ) {
			userLogScale.value = params.logarithmic !== '0';
		}
		if ( params.movingaverage !== undefined ) {
			userMovingAverage.value = params.movingaverage !== '0';
		}
	}

	return { userChartType, userLogScale, showValues, userMovingAverage, setFromQuery };
} );
