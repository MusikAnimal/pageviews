import { ApiError } from './errors.js';
import { promisePool } from './queue.js';

/**
 * Client for our /api/metrics endpoints. Lists larger than the server's
 * per-request page cap are chunked and fetched through a small promise
 * pool, which is also what drives the progress bar in list apps.
 */

const CHUNK_SIZE = 50;
const CONCURRENCY = 3;

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
	platform = 'all',
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

async function fetchChunk( { project, pages, ...rest } ) {
	const query = new URLSearchParams( { ...rest, pages: pages.join( '|' ) } );
	const response = await fetch(
		`/api/metrics/pageviews/${ encodeURIComponent( project ) }?${ query }`
	);

	if ( !response.ok ) {
		let envelope = null;
		try {
			envelope = ( await response.json() ).error;
		} catch {
			// Non-JSON error (e.g. a proxy page); fall through.
		}
		throw new ApiError( envelope || {
			code: 'upstream_error',
			message: `Metrics API returned ${ response.status }`,
			i18n: [ 'api-error', 'Pageviews API' ],
			retryable: response.status >= 500
		} );
	}
	return response.json();
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
