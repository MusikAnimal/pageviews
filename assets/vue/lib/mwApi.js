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
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>} The parsed response.
 * @throws {ApiError} On HTTP failure or an Action API error response.
 */
export async function mwApiGet( project, params, signal = undefined ) {
	const query = new URLSearchParams( {
		format: 'json',
		formatversion: '2',
		origin: '*'
	} );
	for ( const [ key, value ] of Object.entries( params ) ) {
		query.set( key, Array.isArray( value ) ? value.join( '|' ) : String( value ) );
	}

	const response = await fetch( `${ apiUrl( project ) }?${ query }`, { signal } );
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
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>}
 */
export async function getFileInfo( project, names, signal = undefined ) {
	const response = await mwApiGet( project, {
		action: 'query',
		prop: 'imageinfo',
		iiprop: [ 'mediatype', 'size', 'timestamp', 'url' ],
		titles: names.map( ( name ) => `File:${ name.replace( /_/g, ' ' ) }` )
	}, signal );
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
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>} Info objects keyed by (normalized) title.
 */
export async function getPageInfo( project, titles, signal = undefined ) {
	const response = await mwApiGet( project, {
		action: 'query',
		prop: 'info',
		inprop: [ 'watchers', 'protection' ],
		titles
	}, signal );
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
 * All pages linked from the given page (the Massviews wikilinks
 * source), across all namespaces.
 *
 * @param {string} project
 * @param {string} title
 * @param {AbortSignal} [signal]
 * @return {Promise<?Array<{project: string, title: string}>>} Linked
 *   pages — including interwiki links, whose project differs — or
 *   null when
 *   the page itself doesn't exist.
 */
export async function getWikilinks( project, title, signal = undefined ) {
	let missing = false;
	const links = await mwApiQueryAll( project, {
		action: 'query',
		prop: 'links|iwlinks',
		pllimit: 'max',
		// The URL of each interwiki link, so no prefix map is needed
		// to tell which wiki it points to.
		iwprop: 'url',
		iwlimit: 'max',
		titles: title
	}, ( response ) => {
		const page = response.query?.pages?.[ 0 ];
		if ( !page || page.missing ) {
			missing = true;
			return [];
		}
		return [
			...( page.links || [] ).map( ( link ) => ( { project, title: link.title } ) ),
			...( page.iwlinks || [] ).map( parseInterwikiLink ).filter( Boolean )
		];
	}, undefined, signal );
	return missing ? null : links;
}

/**
 * Derive the target wiki and title from an interwiki link's URL
 * (iwprop=url).
 *
 * @param {Object} iwlink { prefix, url, title } from prop=iwlinks.
 * @return {?{project: string, title: string}} null for bare-prefix
 *   links and URLs that don't lead to a wiki page.
 */
function parseInterwikiLink( iwlink ) {
	if ( !iwlink.url || !iwlink.title ) {
		return null;
	}
	try {
		const url = new URL( iwlink.url );
		const title = url.pathname.startsWith( '/wiki/' ) ?
			decodeURIComponent( url.pathname.slice( '/wiki/'.length ) ) :
			url.searchParams.get( 'title' );
		return title ? { project: url.hostname, title: title.replace( /_/g, ' ' ) } : null;
	} catch {
		return null;
	}
}

/**
 * All pages transcluding the given page (the Massviews transclusions
 * source).
 *
 * @param {string} project
 * @param {string} title
 * @param {AbortSignal} [signal]
 * @return {Promise<?string[]>} Transcluding titles (prefixed), or
 *   null when the page itself doesn't exist.
 */
export async function getTranscludedIn( project, title, signal = undefined ) {
	let missing = false;
	const pages = await mwApiQueryAll( project, {
		action: 'query',
		prop: 'transcludedin',
		tilimit: 'max',
		titles: title
	}, ( response ) => {
		const page = response.query?.pages?.[ 0 ];
		if ( !page || page.missing ) {
			missing = true;
			return [];
		}
		return page.transcludedin || [];
	}, undefined, signal );
	return missing ? null : pages.map( ( page ) => page.title );
}

/**
 * All subpages of the given page (the Massviews subpages source): the
 * page's own namespace plus its talk/subject counterpart, like the
 * legacy tool.
 *
 * @param {string} project
 * @param {string} title Prefixed title, with spaces.
 * @param {Object} namespaces The wiki's namespaces from siteinfo.
 * @param {AbortSignal} [signal]
 * @return {Promise<string[]>} Subpage titles (prefixed).
 */
export async function getSubpages( project, title, namespaces, signal = undefined ) {
	// Determine the page's namespace by prefix, and strip it —
	// allpages wants the bare prefix.
	let namespace = 0;
	let base = title;
	for ( const ns of Object.keys( namespaces ) ) {
		const nsName = namespaces[ ns ][ '*' ];
		if ( ns !== '0' && nsName && title.startsWith( `${ nsName }:` ) ) {
			namespace = Number( ns );
			base = title.slice( nsName.length + 1 );
			break;
		}
	}
	const inverse = namespace % 2 === 0 ? namespace + 1 : namespace - 1;

	const results = await Promise.all( [ namespace, inverse ].map(
		( apnamespace ) => mwApiQueryAll( project, {
			action: 'query',
			list: 'allpages',
			aplimit: 'max',
			apnamespace,
			apprefix: `${ base }/`
		}, ( response ) => response.query?.allpages || [], undefined, signal )
	) );
	return results.flat().map( ( page ) => page.title );
}

/**
 * The mainspace pages containing an external link matching the given
 * pattern, via list=exturlusage (the Massviews external-link source).
 *
 * @param {string} project
 * @param {string} pattern e.g. '*.nycgo.com', optionally with a
 *   protocol prefix (default http, like the legacy tool).
 * @param {AbortSignal} [signal]
 * @return {Promise<string[]>} Deduplicated titles.
 */
export async function getExternalLinkUsage( project, pattern, signal = undefined ) {
	// Supported values: https://www.mediawiki.org/wiki/Manual:$wgUrlProtocols
	const protocolRegex = /^(?:\/\/|(ftps?|git|gopher|https?|ircs?|mms|nntp|redis|sftp|ssh|svn|telnet|worldwind):\/\/|(bitcoin|geo|magnet|mailto|news|sips?|sms|tel|urn|xmpp):)/;
	const protocol = protocolRegex.exec( pattern )?.[ 1 ] || 'http';
	const pages = await mwApiQueryAll( project, {
		action: 'query',
		list: 'exturlusage',
		eulimit: 'max',
		eunamespace: 0,
		euprotocol: protocol,
		euquery: pattern.replace( protocolRegex, '' )
	}, ( response ) => response.query?.exturlusage || [], undefined, signal );
	return [ ...new Set( pages.map( ( page ) => page.title ) ) ];
}

/**
 * Mainspace search results via list=search (the Massviews search
 * source; supports CirrusSearch syntax like insource:).
 *
 * @param {string} project
 * @param {string} query
 * @param {AbortSignal} [signal]
 * @return {Promise<string[]>} Deduplicated titles.
 */
export async function getSearchResults( project, query, signal = undefined ) {
	const pages = await mwApiQueryAll( project, {
		action: 'query',
		list: 'search',
		srlimit: 'max',
		srnamespace: 0,
		srinfo: '',
		srprop: '',
		srsearch: query
	}, ( response ) => response.query?.search || [], undefined, signal );
	return [ ...new Set( pages.map( ( page ) => page.title ) ) ];
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
 * @param {AbortSignal} [signal]
 * @return {Promise<Array>} The concatenated extracted items.
 */
export async function mwApiQueryAll( project, params, extract, limit = 20000, signal = undefined ) {
	const items = [];
	let continueParams = {};

	do {
		const response = await mwApiGet( project, { ...params, ...continueParams }, signal );
		items.push( ...extract( response ) );
		continueParams = response.continue || null;
	} while ( continueParams && items.length < limit );

	return items.slice( 0, limit );
}
