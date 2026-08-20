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
 * Exchange the (typically just-expired) token for a fresh one.
 * Single-flight: concurrent 401s from a chunked fan-out share one
 * renewal request.
 *
 * @return {Promise<string>}
 */
export function refreshToken() {
	refreshPromise ??= ( async () => {
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
			return token;
		} finally {
			refreshPromise = null;
		}
	} )();
	return refreshPromise;
}
