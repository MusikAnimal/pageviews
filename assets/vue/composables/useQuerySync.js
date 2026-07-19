import { watch } from 'vue';
import {useRoute, useRouter} from 'vue-router';
import { useSettingsStore } from '../stores/settings.js';

/**
 * Keep an individual app's store and shared settings in sync with the URL query string.
 *
 * @param {Object} store Must implement `setFromQuery( query )` and a `query` getter
 *   with the serialized, canonical form of relevant params.
 */
export function useQuerySync( store ) {
	const route = useRoute();
	const router = useRouter();
	const settings = useSettingsStore();

	// Sync URL with the stores.
	watch(
		() => route.query,
		( query ) => {
			settings.setFromQuery( query );
			store.setFromQuery( query );
		},
		{ immediate: true }
	);

	// Sync the stores with the URL.
	watch(
		[ () => store.query, () => settings.query ],
		() => {
			router.replace( { query: { ...settings.query, ...store.query } } );
		}
	);
}
