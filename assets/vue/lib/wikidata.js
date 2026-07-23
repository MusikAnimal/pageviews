/**
 * Wikidata lookups (client-side, per the data-path rules).
 */

/**
 * Wikidata badge item IDs, with their icons and message keys
 * (legacy langviews/config.js).
 */
export const BADGES = {
	Q17437796: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
		name: 'featured-article'
	},
	Q17437798: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
		name: 'good-article'
	},
	Q17559452: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Art%C3%ADculo_bueno-blue.svg',
		name: 'recommended-article'
	},
	Q17506997: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
		name: 'featured-list'
	},
	Q17580674: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
		name: 'featured-portal'
	},
	Q20748092: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Featured_article_star_-_check.svg',
		name: 'proofread-page'
	},
	Q20748093: {
		image: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
		name: 'validated-page'
	}
};

/**
 * The Wikidata site ID (dbname) for a project domain:
 * en.wikipedia.org -> enwiki, fr.wiktionary.org -> frwiktionary.
 *
 * @param {string} project
 * @return {string}
 */
export function projectToSite( project ) {
	const [ lang, family ] = project.replace( /\.org$/, '' ).split( '.' );
	return lang.replace( /-/g, '_' ) + ( family === 'wikipedia' ? 'wiki' : family );
}

/**
 * All language versions of a page within the given project's family,
 * from the page's Wikidata sitelinks.
 *
 * @param {string} project Source project domain, e.g. en.wikipedia.org.
 * @param {string} page
 * @return {Promise<?Array<{lang: string, title: string, badges: string[]}>>}
 *   One entry per language (the source included), or null when the
 *   page has no Wikidata item.
 * @throws {Error} On a Wikidata API error.
 */
export async function getLangLinks( project, page ) {
	const family = project.split( '.' )[ 1 ];
	const query = new URLSearchParams( {
		action: 'wbgetentities',
		sites: projectToSite( project ),
		titles: page.replace( /_/g, ' ' ),
		props: 'sitelinks/urls',
		format: 'json',
		formatversion: '2',
		origin: '*'
	} );
	const response = await fetch( `https://www.wikidata.org/w/api.php?${ query }` );
	const data = await response.json();
	if ( data.error ) {
		throw new Error( data.error.info );
	}
	const entity = Object.values( data.entities || {} )[ 0 ];
	if ( !entity || !entity.sitelinks ) {
		return null;
	}

	// Restrict to the same family (wikipedias, not wikivoyages too).
	const matcher = new RegExp( `^https://([\\w-]+)\\.${ family }\\.org` );
	const links = [];
	for ( const sitelink of Object.values( entity.sitelinks ) ) {
		const match = sitelink.url && matcher.exec( sitelink.url );
		if ( match ) {
			links.push( {
				lang: match[ 1 ],
				title: sitelink.title,
				badges: sitelink.badges || []
			} );
		}
	}
	return links;
}
