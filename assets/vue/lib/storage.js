import { ref, watch } from 'vue';

/**
 * localStorage-backed persistence: user preferences (persistentRef) and a
 * short-lived response cache (cacheGet/cacheSet), replacing the legacy
 * tool's simpleStorage usage. All access is failure-tolerant so private
 * browsing modes and full quotas degrade to in-memory behavior.
 */

const CACHE_PREFIX = 'pv-cache-';

function read( key ) {
	try {
		const raw = localStorage.getItem( key );
		return raw === null ? null : JSON.parse( raw );
	} catch {
		return null;
	}
}

function write( key, value ) {
	try {
		localStorage.setItem( key, JSON.stringify( value ) );
	} catch {
		// Ignore: quota exceeded or storage unavailable.
	}
}

/**
 * A ref persisted to localStorage. Reads once at creation; writes on
 * every change.
 *
 * @param {string} key Use the legacy-compatible `pageviews-settings-*`
 *   namespace for user preferences so existing users keep theirs.
 * @param {*} defaultValue Used when nothing (valid) is stored.
 * @return {import('vue').Ref<*>}
 */
export function persistentRef( key, defaultValue ) {
	const stored = read( key );
	const value = ref( stored === null ? defaultValue : stored );
	watch( value, ( newValue ) => write( key, newValue ), { deep: true } );
	return value;
}

/**
 * Read a cached value, if present and fresh.
 *
 * @param {string} key
 * @return {*} null when missing or expired.
 */
export function cacheGet( key ) {
	const entry = read( CACHE_PREFIX + key );
	if ( !entry ) {
		return null;
	}
	if ( entry.expires < Date.now() ) {
		try {
			localStorage.removeItem( CACHE_PREFIX + key );
		} catch {
			// Ignore.
		}
		return null;
	}
	return entry.value;
}

/**
 * Cache a value with a TTL. Matches the legacy tool's 10-minute default
 * for API response caching.
 *
 * @param {string} key
 * @param {*} value Must be JSON-serializable.
 * @param {number} [ttlMinutes]
 */
export function cacheSet( key, value, ttlMinutes = 10 ) {
	write( CACHE_PREFIX + key, {
		expires: Date.now() + ( ttlMinutes * 60 * 1000 ),
		value
	} );
}
