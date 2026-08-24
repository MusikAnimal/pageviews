import { getSiteinfo } from '../projects.js';

/**
 * Titles the Topviews mainspace filter drops: anything with a known
 * namespace prefix (plus legacy quirks the AQS data exhibits) and the
 * wiki's main page. Shared by the Topviews app and the Pageviews
 * summary's rank line, which mirrors Topviews' default
 * (mainspace-only) ranking.
 *
 * @param {string} project
 * @param {string[]} titles
 * @param {AbortSignal} [signal]
 * @return {Promise<Set<string>>}
 */
export async function findNonMainspace( project, titles, signal = undefined ) {
	const siteinfo = await getSiteinfo( project );
	if ( signal?.aborted || !siteinfo?.namespaces ) {
		return new Set();
	}
	const prefixes = new Set(
		Object.values( siteinfo.namespaces )
			.map( ( ns ) => ns[ '*' ] )
			.filter( Boolean )
	);
	// The AQS data mixes in localized/misencoded variants
	// (see legacy FIXME re phab:T145043).
	[ 'Wikipedia', 'Special', 'Sp?cial' ].forEach( ( extra ) => prefixes.add( extra ) );
	const mainPage = siteinfo.general?.mainpage ?? '';

	return new Set( titles.filter( ( title ) => {
		if ( title === mainPage || title === mainPage.split( ':' )[ 1 ] ) {
			return true;
		}
		return title.includes( ':' ) && prefixes.has( title.split( ':' )[ 0 ] );
	} ) );
}
