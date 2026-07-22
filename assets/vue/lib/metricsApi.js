import { ApiError } from './errors.js';
import { promisePool } from './queue.js';

/**
 * Client for our /api/metrics endpoints. Lists larger than the server's
 * per-request page cap are chunked and fetched through a small promise
 * pool, which is also what drives the progress bar in list apps.
 */

const CHUNK_SIZE = 50;
// Kept low: the server already fans each chunk out to AQS in waves,
// and AQS rate-limits aggressive bursts per IP.
const CONCURRENCY = 2;

/**
 * Fetch per-article pageview timeseries for any number of pages.
 *
 * @param {Object} params
 * @param {string} params.project
 * @param {string[]} params.pages
 * @param {string} params.start YYYY-MM-DD or YYYY-MM.
 * @param {string} params.end
 * @param {string} [params.platform]
 * @param {string} [params.agent]
 * @param {string} [params.granularity]
 * @param {Function} [params.onProgress] ( done, total ) in chunks.
 * @return {Promise<Object>} The batch-endpoint contract shape, merged
 *   across chunks (dates, pages, totals).
 * @throws {ApiError}
 */
export async function fetchPageviews( {
	project,
	pages,
	start,
	end,
	platform = 'all-access',
	agent = 'user',
	granularity = 'daily',
	onProgress
} ) {
	const chunks = [];
	for ( let i = 0; i < pages.length; i += CHUNK_SIZE ) {
		chunks.push( pages.slice( i, i + CHUNK_SIZE ) );
	}

	const results = await promisePool(
		chunks,
		( chunk ) => fetchChunk(
			{ project, pages: chunk, start, end, platform, agent, granularity }
		),
		{ concurrency: CONCURRENCY, onProgress }
	);

	return mergeResults( results );
}

/**
 * GET one of our /api/* endpoints, surfacing the error envelope as
 * ApiError.
 *
 * @param {string} path
 * @param {Object} params
 * @return {Promise<Object>}
 */
async function apiGet( path, params ) {
	const response = await fetch( `${ path }?${ new URLSearchParams( params ) }` );

	if ( !response.ok ) {
		let envelope = null;
		try {
			envelope = ( await response.json() ).error;
		} catch {
			// Non-JSON error (e.g. a proxy page); fall through.
		}
		throw new ApiError( envelope || {
			code: 'upstream_error',
			message: `API returned ${ response.status }`,
			i18n: [ 'api-error', 'Pageviews API' ],
			retryable: response.status >= 500
		} );
	}
	return response.json();
}

function fetchChunk( { project, pages, ...rest } ) {
	return apiGet(
		`/api/metrics/pageviews/${ encodeURIComponent( project ) }`,
		{ ...rest, pages: pages.join( '|' ) }
	);
}

/**
 * Edit statistics (edit/editor counts, assessment class) from the
 * replica-backed endpoint.
 *
 * @param {Object} params
 * @param {string} params.project
 * @param {string[]} params.pages
 * @param {string} params.start
 * @param {string} params.end
 * @return {Promise<Object>} { pages: { title: { num_edits, num_users,
 *   assessment } }, totals? }
 */
export function fetchEditData( { project, pages, start, end } ) {
	return apiGet( `/api/pages/${ encodeURIComponent( project ) }/edits`, {
		pages: pages.join( '|' ),
		start,
		end,
		totals: '1'
	} );
}

/**
 * Per-site aggregate timeseries for Siteviews (max 10 sites, so no
 * chunking): pageviews, unique devices or legacy pagecounts.
 *
 * @param {Object} params
 * @param {string[]} params.sites Site domains, or [ 'all-projects' ].
 * @param {string} params.source pageviews | unique-devices | pagecounts.
 * @param {string} params.start YYYY-MM-DD or YYYY-MM.
 * @param {string} params.end
 * @param {string} [params.platform] Per-source vocabulary.
 * @param {string} [params.agent] Pageviews source only.
 * @param {string} [params.granularity]
 * @return {Promise<Object>} { source, platform, agent?, granularity,
 *   start, end, dates, sites: [ { site, counts, total, average,
 *   no_data? } ], totals }
 * @throws {ApiError}
 */
export function fetchSiteviews( {
	sites,
	source,
	start,
	end,
	platform,
	agent = 'user',
	granularity = 'daily'
} ) {
	return apiGet( '/api/metrics/siteviews', {
		sites: sites.join( '|' ),
		source,
		start,
		end,
		platform,
		agent,
		granularity
	} );
}

/**
 * The most-viewed pages of a month (YYYY-MM) or day (YYYY-MM-DD), with
 * the curated false positives already removed and ranks recomputed
 * server-side.
 *
 * @param {Object} params
 * @param {string} params.project
 * @param {string} params.date
 * @param {string} [params.platform]
 * @return {Promise<Object>} { project, platform, date, articles:
 *   [ { article, views, rank } ] }
 */
export function fetchTopviews( { project, date, platform = 'all-access' } ) {
	return apiGet(
		`/api/metrics/top/${ encodeURIComponent( project ) }`,
		{ date, platform }
	);
}

function mergeResults( results ) {
	if ( results.length === 1 ) {
		return results[ 0 ];
	}

	const [ first ] = results;
	const pages = results.flatMap( ( result ) => result.pages );
	const totals = { counts: first.dates.map( () => 0 ), total: 0 };
	for ( const page of pages ) {
		page.counts.forEach( ( count, i ) => {
			totals.counts[ i ] += count;
		} );
		totals.total += page.total;
	}
	totals.average = Math.round( ( totals.total / first.dates.length ) * 100 ) / 100;

	return { ...first, pages, totals };
}
