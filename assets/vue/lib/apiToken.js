/**
 * The frontend's access token for our own /api/* endpoints:
 * bootstrapped from the Twig shell's data-app-config, renewed via
 * POST /auth/token when it expires under a long-lived tab. This is
 * bar-raising against API scraping, not authentication — see
 * ApiTokenIssuer server-side.
 */

let token = null;
let refreshPromise = null;

function readBootstrapToken() {
	try {
		return JSON.parse( document.body.dataset.appConfig ).apiToken ?? null;
	} catch {
		return null;
	}
}

/**
 * @return {?string} The current token.
 */
export function getToken() {
	token ??= readBootstrapToken();
	return token;
}

/**
 * Last resort when renewal is rejected (a tab older than the renewal
 * window, or a rotated APP_SECRET): the served shell always embeds a
 * fresh token, so re-read it from the current page's HTML.
 *
 * @return {Promise<string>}
 */
async function bootstrapFromShell() {
	const response = await fetch( location.href, { headers: { Accept: 'text/html' } } );
	if ( !response.ok ) {
		throw new Error( `Shell refetch returned ${ response.status }` );
	}
	const doc = new DOMParser().parseFromString( await response.text(), 'text/html' );
	const fresh = JSON.parse( doc.body?.dataset.appConfig ?? '{}' ).apiToken;
	if ( !fresh ) {
		throw new Error( 'No token in the served shell' );
	}
	return fresh;
}

/**
 * Exchange the (typically just-expired) token for a fresh one.
 * Single-flight: concurrent 401s from a chunked fan-out share one
 * renewal request.
 *
 * @return {Promise<string>}
 */
export function refreshToken() {
	refreshPromise ??= ( async () => {
		try {
			try {
				const response = await fetch( '/auth/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify( { token: getToken() } )
				} );
				if ( !response.ok ) {
					throw new Error( `Token renewal returned ${ response.status }` );
				}
				token = ( await response.json() ).token;
			} catch {
				// Renewal failed — transiently, or unrenewably (too
				// old, rotated secret). The shell can always mint.
				token = await bootstrapFromShell();
			}
			return token;
		} finally {
			refreshPromise = null;
		}
	} )();
	return refreshPromise;
}
