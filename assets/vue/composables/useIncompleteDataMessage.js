import { computed, ref, watch } from 'vue';
import { usePreferencesStore } from '../stores/preferences.js';
import { formatDate } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';

/**
 * The localized "data for <date> is not yet available" warning, shown
 * as an inline message beneath the chart while the current result has
 * a trimmed trailing date (the store's incompleteDate, set by
 * trimIncompleteTail). It clears itself as soon as a new query starts
 * and can be dismissed by the user for the current result.
 *
 * @param {Object} store Any app store exposing `incompleteDate`.
 * @return {{ message: import('vue').ComputedRef<string|null>, dismiss: Function }}
 */
export function useIncompleteDataMessage( store ) {
	const preferences = usePreferencesStore();
	const dismissed = ref( false );

	// A fresh result withdraws the user's dismissal.
	watch( () => store.incompleteDate, () => {
		dismissed.value = false;
	} );

	const message = computed( () => {
		if ( dismissed.value || !store.incompleteDate || store.status !== 'complete' ) {
			return null;
		}
		return banana.i18n(
			'api-incomplete-data',
			formatDate( parseDate( store.incompleteDate ), {
				locale: banana.locale,
				monthly: store.incompleteDate.length === 7,
				localize: preferences.localizeDateFormat
			} )
		);
	} );

	return {
		message,
		dismiss: () => {
			dismissed.value = true;
		}
	};
}
