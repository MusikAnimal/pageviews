import { watch } from "vue";
import { useRouter } from "vue-router";
import { useSettingsStore } from "../stores/settings.js";

export function useQuerySync( store ) {
	const router = useRouter();
	const settings = useSettingsStore();
	watch( [ () => store.query, () => settings.query ], () => {
		router.replace( { query: { ...settings.query, ...store.query } } );
	} );
}
