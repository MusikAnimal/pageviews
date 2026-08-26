import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore } from '../stores/settings.js';
import { useChartControlsStore } from '../stores/chartControls.js';

/**
 * Keep an individual app's store and shared settings in sync with the URL query string.
 *
 * @param {Object} store Must implement `setFromQuery( query )` and a `query` getter
 *   with the serialized, canonical form of relevant params.
 * @param {Object} [options]
 * @param {boolean} [options.syncSettings] Set false for apps that
 *   don't use the shared date range (Topviews has its own single
 *   date), keeping range/start/end out of their URLs.
 */
export function useQuerySync( store, { syncSettings = true } = {} ) {
	const route = useRoute();
	const router = useRouter();
	const settings = useSettingsStore();
	const chartControls = useChartControlsStore();

	// Sync URL with the stores.
	watch(
		() => route.query,
		( query ) => {
			if ( syncSettings ) {
				settings.setFromQuery( query );
			}
			store.setFromQuery( query );
			// One-shot chart-option params (from "Include all chart
			// options" permalinks): applied here, never written back,
			// so the writeback below drops them from the URL.
			chartControls.setFromQuery( query );
		},
		{ immediate: true }
	);

	// Sync the stores with the URL.
	watch(
		syncSettings ? [ () => store.query, () => settings.query ] : [ () => store.query ],
		() => {
			router.replace( { query: {
				...( syncSettings ? settings.query : {} ),
				...store.query
			} } );
		}
	);
}
