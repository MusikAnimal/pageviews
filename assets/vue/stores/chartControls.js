import { ref } from 'vue';
import { defineStore } from 'pinia';

/**
 * The chart toolbar's runtime state: the chart-type pick and the
 * scale/overlay toggles. Held outside ChartPanel because the panel
 * unmounts while a new query loads (and on the list apps' view
 * swaps) — the user's picks must survive an Options change. Runtime
 * state only, per the param tiers: never the URL, never localStorage
 * (the remembered chart type and the moving-average default are
 * preferences, layered in by ChartPanel).
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

	return { userChartType, userLogScale, showValues, userMovingAverage };
} );
