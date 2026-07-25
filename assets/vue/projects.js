let promise = null;

async function fetchProjects() {
	try {
		const response = await fetch( '/projects.json' );
		return response.ok ? await response.json() : [];
	} catch {
		return [];
	}
}

export function getProjects() {
	// Assigned before any await runs, so concurrent callers share one fetch.
	promise ??= fetchProjects();
	return promise;
}

let commonsCategoriesPromise = null;

/**
 * The Commons Impact Metrics category allow-list (underscored names,
 * no namespace prefix): the categories the Massviews Commons category
 * source can query.
 *
 * @return {Promise<string[]>}
 */
export function getCommonsCategories() {
	commonsCategoriesPromise ??= ( async () => {
		try {
			const response = await fetch( '/commons_categories.json' );
			return response.ok ? await response.json() : [];
		} catch {
			return [];
		}
	} )();
	return commonsCategoriesPromise;
}

const siteinfoPromises = new Map();

/**
 * Cached siteinfo (general + namespaces) for a project, via our
 * server's long-cached /siteinfo endpoint.
 *
 * @param {string} domain With or without the .org suffix.
 * @return {Promise<?Object>} { general, namespaces }, or null on failure.
 */
export function getSiteinfo( domain ) {
	domain = domain.replace( /\.org$/, '' );
	if ( !siteinfoPromises.has( domain ) ) {
		siteinfoPromises.set( domain, ( async () => {
			try {
				const response = await fetch( `/siteinfo/${ encodeURIComponent( domain ) }` );
				return response.ok ? await response.json() : null;
			} catch {
				return null;
			}
		} )() );
	}
	return siteinfoPromises.get( domain );
}
