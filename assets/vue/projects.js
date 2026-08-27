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

let assessmentWikisPromise = null;

/**
 * The projects running the PageAssessments extension (without the
 * .org suffix, like projects.json keys): the wikis the Massviews
 * WikiProject source is offered on.
 *
 * @return {Promise<string[]>}
 */
export function getAssessmentWikis() {
	assessmentWikisPromise ??= ( async () => {
		try {
			const response = await fetch( '/assessments.json' );
			return response.ok ? await response.json() : [];
		} catch {
			return [];
		}
	} )();
	return assessmentWikisPromise;
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
	// A cleared project input passes null; there is nothing to fetch.
	if ( !domain ) {
		return Promise.resolve( null );
	}
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
