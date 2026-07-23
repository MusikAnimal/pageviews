import { useToast } from '@wikimedia/codex';

/**
 * Toasts currently on screen, keyed by type + message. Module-level:
 * the constraint is per page, not per component.
 *
 * @type {Set<string>}
 */
const active = new Set();

/**
 * Codex's useToast with dedup: at most one visible toast with the
 * same type and message. Use this instead of useToast() everywhere.
 *
 * @return {Object} { success, error, info, warning }, same signatures
 *   as Codex's.
 */
export function useAppToast() {
	const toast = useToast();

	function show( type, message, options = {} ) {
		const key = `${ type }\n${ message }`;
		if ( active.has( key ) ) {
			return;
		}
		active.add( key );
		const wrap = ( callback ) => () => {
			active.delete( key );
			callback?.();
		};
		toast[ type ]( message, {
			...options,
			onUserDismissed: wrap( options.onUserDismissed ),
			onAutoDismissed: wrap( options.onAutoDismissed )
		} );
	}

	return Object.fromEntries( [ 'success', 'error', 'info', 'warning' ].map(
		( type ) => [ type, ( message, options ) => show( type, message, options ) ]
	) );
}
