import { watch } from 'vue';
import { useAppToast } from './useAppToast.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { formatDate } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';

/**
 * Toast the one-shot incompleteDate signal set when a store's load
 * dropped a not-yet-published trailing date (trimIncompleteTail).
 * Immediate: the first load may resolve before the watcher registers.
 *
 * @param {Object} store Any app store exposing `incompleteDate`.
 */
export function useIncompleteDataToast( store ) {
	const toast = useAppToast();
	const preferences = usePreferencesStore();
	let toastId = null;
	const clear = () => {
		toastId = null;
	};

	watch( () => store.incompleteDate, ( date ) => {
		if ( !date ) {
			return;
		}
		toastId = toast.warning(
			banana.i18n(
				'api-incomplete-data',
				formatDate( parseDate( date ), {
					locale: banana.locale,
					monthly: date.length === 7,
					localize: preferences.localizeDateFormat
				} )
			),
			{ autoDismiss: true, onAutoDismissed: clear, onUserDismissed: clear }
		);
		store.incompleteDate = null;
	}, { immediate: true } );

	// The warning describes the current result: as soon as a new query
	// starts (settings changed) or the inputs empty out (status back to
	// initial), it no longer applies.
	watch( () => store.status, ( status ) => {
		if ( toastId !== null && status !== 'complete' ) {
			toast.dismiss( toastId );
			toastId = null;
		}
	} );
}
