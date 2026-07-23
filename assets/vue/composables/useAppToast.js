import { useToast } from '@wikimedia/codex';

/**
 * Toasts currently on screen, keyed by type + message. Module-level:
 * the constraint is per page, not per component.
 *
 * @type {Set<string>}
 */
const active = new Set();
/**
 * Dedup key per shown toast id, so programmatic dismissal (which
 * fires no Codex callbacks) can free the key too.
 *
 * @type {Map<string, string>}
 */
const keysById = new Map();

/**
 * Codex's useToast with dedup: at most one visible toast with the
 * same type and message. Use this instead of useToast() everywhere.
 *
 * @return {Object} { success, error, info, warning, dismiss }. The
 *   show methods match Codex's signatures and return the toast id
 *   (null when deduped); dismiss( id ) removes a toast early.
 */
export function useAppToast() {
	const toast = useToast();

	function show( type, message, options = {} ) {
		const key = `${ type }\n${ message }`;
		if ( active.has( key ) ) {
			return null;
		}
		active.add( key );
		const wrap = ( callback ) => () => {
			active.delete( key );
			callback?.();
		};
		const id = toast[ type ]( message, {
			...options,
			onUserDismissed: wrap( options.onUserDismissed ),
			onAutoDismissed: wrap( options.onAutoDismissed )
		} );
		keysById.set( id, key );
		return id;
	}

	function dismiss( id ) {
		toast.dismiss( id );
		const key = keysById.get( id );
		if ( key ) {
			active.delete( key );
			keysById.delete( id );
		}
	}

	return {
		dismiss,
		...Object.fromEntries( [ 'success', 'error', 'info', 'warning' ].map(
			( type ) => [ type, ( message, options ) => show( type, message, options ) ]
		) )
	};
}
