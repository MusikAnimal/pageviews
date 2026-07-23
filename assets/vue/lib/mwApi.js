import { ApiError } from './errors.js';

/**
 * Minimal MediaWiki Action API client. These requests are made directly
 * from the browser (anonymous CORS via origin=*) — only replica-DB and
 * AQS-metrics data goes through our own Symfony API.
 */

/**
 * @param {string} project With or without the .org suffix.
 * @return {string} The project's api.php endpoint.
 */
export function apiUrl( project ) {
	return `https://${ project.replace( /\.org$/, '' ) }.org/w/api.php`;
}

/**
 * One GET request to a project's Action API.
 *
 * @param {string} project
 * @param {Object} params Query params; format/formatversion/origin are set
 *   for you. Arrays are pipe-joined.
 * @return {Promise<Object>} The parsed response.
 * @throws {ApiError} On HTTP failure or an Action API error response.
 */
export async function mwApiGet( project, params ) {
	const query = new URLSearchParams( {
		format: 'json',
		formatversion: '2',
		origin: '*'
	} );
	for ( const [ key, value ] of Object.entries( params ) ) {
		query.set( key, Array.isArray( value ) ? value.join( '|' ) : String( value ) );
	}

	const response = await fetch( `${ apiUrl( project ) }?${ query }` );
	if ( !response.ok ) {
		throw new ApiError( {
			code: 'upstream_error',
			message: `${ project } API returned ${ response.status }`,
			i18n: [ 'api-error', project ],
			upstream: 'mediawiki',
			retryable: response.status >= 500
		} );
	}

	const data = await response.json();
	if ( data.error ) {
		throw new ApiError( {
			code: data.error.code || 'upstream_error',
			message: data.error.info,
			i18n: [ 'api-error', project ],
			upstream: 'mediawiki'
		} );
	}
	return data;
}

/**
 * File metadata from prop=imageinfo, keyed by the file name without
 * the File: prefix (spaces, not underscores): { title, path,
 * mediatype, size, width, height, duration?, timestamp, missing? }.
 * `path` is the upload.wikimedia path the mediarequests API wants.
 *
 * @param {string} project e.g. 'commons.wikimedia.org'.
 * @param {string[]} names File names without the File: prefix.
 * @return {Promise<Object>}
 */
export async function getFileInfo( project, names ) {
	const response = await mwApiGet( project, {
		action: 'query',
		prop: 'imageinfo',
		iiprop: [ 'mediatype', 'size', 'timestamp', 'url' ],
		titles: names.map( ( name ) => `File:${ name.replace( /_/g, ' ' ) }` )
	} );
	const info = {};
	for ( const page of response.query?.pages || [] ) {
		const name = page.title.replace( /^[^:]+:/, '' );
		if ( page.missing ) {
			info[ name ] = { title: page.title, missing: true };
			continue;
		}
		const imageinfo = page.imageinfo?.[ 0 ] ?? {};
		info[ name ] = {
			title: page.title,
			path: imageinfo.url ?
				decodeURIComponent( new URL( imageinfo.url ).pathname ) :
				null,
			...imageinfo
		};
	}
	return info;
}

/**
 * Basic page information (length, watcher count, protection) for the
 * given titles. The watchers field is only present when the wiki
 * exposes it (above the unwatched-pages threshold, as on Wikimedia
 * wikis).
 *
 * @param {string} project
 * @param {string[]} titles
 * @return {Promise<Object>} Info objects keyed by (normalized) title.
 */
export async function getPageInfo( project, titles ) {
	const response = await mwApiGet( project, {
		action: 'query',
		prop: 'info',
		inprop: [ 'watchers', 'protection' ],
		titles
	} );
	return Object.fromEntries(
		( response.query?.pages || [] ).map( ( page ) => [ page.title, page ] )
	);
}

/**
 * The edit-protection level of a page, from getPageInfo() data.
 *
 * @param {Object} info A single page's info object.
 * @return {?string} e.g. 'autoconfirmed', 'sysop'; null when the page
 *   is not edit-protected (or no info is available).
 */
export function editProtectionLevel( info ) {
	return info?.protection?.find( ( entry ) => entry.type === 'edit' )?.level ?? null;
}

/**
 * A GET request following API continuation until exhausted — the
 * equivalent of the legacy massApi() helper.
 *
 * @param {string} project
 * @param {Object} params
 * @param {Function} extract ( response ) => Array — pulls the items of
 *   interest out of each response page.
 * @param {number} [limit] Stop once this many items are collected
 *   (matches the legacy apiLimit of 20000).
 * @return {Promise<Array>} The concatenated extracted items.
 */
export async function mwApiQueryAll( project, params, extract, limit = 20000 ) {
	const items = [];
	let continueParams = {};

	do {
		const response = await mwApiGet( project, { ...params, ...continueParams } );
		items.push( ...extract( response ) );
		continueParams = response.continue || null;
	} while ( continueParams && items.length < limit );

	return items.slice( 0, limit );
}
