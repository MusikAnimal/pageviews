import { mwApiQueryAll } from './mwApi.js';
import { promisePool } from './queue.js';

/**
 * Redirect handling for the "include redirects" option: fetch the
 * redirect titles pointing at the requested pages (client-side, per the
 * data-path rules), so they can be included in the metrics batch and
 * summed into their targets.
 */

// The Action API accepts at most this many titles per request; the
// big Massviews sets go out as concurrent chunks.
const CHUNK_SIZE = 50;

/**
 * Fetch all redirects to the given pages.
 *
 * @param {string} project
 * @param {string[]} titles Target page titles, in display form
 *   (spaces) — the API echoes normalized titles, which the result map
 *   is keyed by.
 * @param {AbortSignal} [signal]
 * @return {Promise<Object>} Map of target title => array of
 *   { title, fragment } redirect entries.
 */
export async function getRedirects( project, titles, signal = undefined ) {
	const chunks = [];
	for ( let i = 0; i < titles.length; i += CHUNK_SIZE ) {
		chunks.push( titles.slice( i, i + CHUNK_SIZE ) );
	}
	const responses = await promisePool( chunks, ( chunk ) => mwApiQueryAll(
		project,
		{
			action: 'query',
			prop: 'redirects',
			rdprop: 'title|fragment',
			rdlimit: 'max',
			titles: chunk
		},
		( response ) => response.query?.pages || [],
		20000,
		signal
	) );

	const map = Object.fromEntries( titles.map( ( title ) => [ title, [] ] ) );
	for ( const page of responses.flat() ) {
		if ( page.redirects && map[ page.title ] ) {
			map[ page.title ].push( ...page.redirects.map( ( { title, fragment } ) => ( {
				title,
				fragment: fragment ?? null
			} ) ) );
		}
	}
	return map;
}

/**
 * Sum redirect series into their targets, mirroring the legacy
 * consolidateRedirectData(). Pure: operates on the pages array from the
 * metrics API response (which must include both targets and redirects).
 *
 * @param {string[]} targets The page titles the user actually asked for.
 * @param {Object} redirectMap From getRedirects().
 * @param {Array<{title: string, counts: number[], total: number}>} pages
 *   Series from the metrics endpoint.
 * @return {Array} One entry per target, with redirect counts folded in
 *   and `consolidatedFrom` listing the summed redirect titles.
 */
export function consolidateSeries( targets, redirectMap, pages ) {
	const byTitle = Object.fromEntries( pages.map( ( page ) => [ page.title, page ] ) );

	return targets.map( ( target ) => {
		const base = byTitle[ target ] || { title: target, counts: [], total: 0 };
		const counts = [ ...base.counts ];
		const consolidatedFrom = [];

		for ( const { title } of redirectMap[ target ] || [] ) {
			const redirect = byTitle[ title ];
			// A redirect with no pageview data contributes nothing.
			if ( !redirect || redirect.no_data ) {
				continue;
			}
			redirect.counts.forEach( ( count, i ) => {
				counts[ i ] = ( counts[ i ] || 0 ) + count;
			} );
			consolidatedFrom.push( title );
		}

		const total = counts.reduce( ( a, b ) => a + b, 0 );
		return {
			...base,
			counts,
			total,
			average: counts.length ? Math.round( ( total / counts.length ) * 100 ) / 100 : 0,
			consolidatedFrom
		};
	} );
}
