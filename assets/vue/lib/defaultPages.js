import { mwApiGet } from './mwApi.js';
import { getProjects } from '../projects.js';

/**
 * Default pages for a bare visit (no pages in the URL), matching the
 * legacy tool: Cat and Dog on English Wikipedia, their Wikidata
 * sitelink equivalents elsewhere, or the project's main page when
 * those articles don't exist there.
 */

const CAT = 'Q146';
const DOG = 'Q144';

/**
 * @param {string} project e.g. 'de.wikipedia.org'.
 * @return {Promise<string[]>} Default page titles; empty on failure.
 */
export async function getDefaultPages( project ) {
	const domain = project.replace( /\.org$/, '' );
	if ( domain === 'en.wikipedia' ) {
		return [ 'Cat', 'Dog' ];
	}

	try {
		const dbname = ( await getProjects() )[ domain ];
		if ( dbname ) {
			const response = await mwApiGet( 'www.wikidata.org', {
				action: 'wbgetentities',
				ids: `${ CAT }|${ DOG }`,
				props: 'sitelinks',
				sitefilter: dbname
			} );
			const titles = [ CAT, DOG ]
				.map( ( id ) => response.entities?.[ id ]?.sitelinks?.[ dbname ]?.title )
				.filter( Boolean );
			if ( titles.length ) {
				return titles;
			}
		}

		// No Cat/Dog articles on this wiki: fall back to its main page.
		const siteinfo = await ( await fetch(
			`/siteinfo/${ encodeURIComponent( domain ) }`
		) ).json();
		if ( siteinfo?.general?.mainpage ) {
			return [ siteinfo.general.mainpage ];
		}
	} catch {
		// Defaults are cosmetic; a bare app is an acceptable fallback.
	}
	return [];
}
