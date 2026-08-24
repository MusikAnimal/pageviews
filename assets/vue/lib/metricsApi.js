import { ApiError } from './errors.js';
import { getToken, refreshToken } from './apiToken.js';
import { promisePool } from './queue.js';

/**
 * Client for our /api/metrics endpoints. Lists larger than the server's
 * per-request page cap are chunked and fetched through a small promise
 * pool, which is also what drives the progress bar in list apps.
 */

// The server accepts at most this many pages per request.
const MAX_CHUNK_SIZE = 50;
// Kept low: the server already fans each chunk out to AQS in waves,
// and AQS rate-limits aggressive bursts per IP.
const CONCURRENCY = 2;
// Chunks are sized so the fan-out yields at least about this many
// progress ticks: a small set gets small chunks (and a lively bar)
// while large sets keep full chunks, where progress is smooth anyway
// and the per-request overhead matters more.
const TARGET_PROGRESS_TICKS = 12;
const MIN_CHUNK_SIZE = 5;

/**
 * @param {number} total Number of pages being fetched.
 * @return {number} Pages per request.
 */
function chunkSize( total ) {
	return Math.min(
		MAX_CHUNK_SIZE,
		Math.max( MIN_CHUNK_SIZE, Math.ceil( total / TARGET_PROGRESS_TICKS ) )
	);
}

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
 * @param {AbortSignal} [params.signal]
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
	onProgress,
	signal
} ) {
	const size = chunkSize( pages.length );
	const chunks = [];
	for ( let i = 0; i < pages.length; i += size ) {
		chunks.push( pages.slice( i, i + size ) );
	}

	const results = await promisePool(
		chunks,
		( chunk ) => fetchChunk(
			{ project, pages: chunk, start, end, platform, agent, granularity, signal }
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
 * @param {AbortSignal} [signal]
 * @param {boolean} isRetry
 * @return {Promise<Object>}
 */
async function apiGet( path, params, signal = undefined, isRetry = false ) {
	const response = await fetch( `${ path }?${ new URLSearchParams( params ) }`, {
		signal,
		headers: { Authorization: `Bearer ${ getToken() }` }
	} );

	if ( response.status === 401 && !isRetry ) {
		// The token likely expired under a long-lived tab: renew once
		// and replay. Renewal is single-flight across concurrent
		// chunks; if it fails, fall through to the 401 envelope.
		let renewed = false;
		try {
			await refreshToken();
			renewed = true;
		} catch {
			// Surface the original 401 below.
		}
		if ( renewed ) {
			return apiGet( path, params, signal, true );
		}
	}
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

function fetchChunk( { project, pages, signal, ...rest } ) {
	return apiGet(
		`/api/metrics/pageviews/${ encodeURIComponent( project ) }`,
		{ ...rest, pages: pages.join( '|' ) },
		signal
	);
}

/**
 * The pages a user created, from the replica-backed endpoint
 * (Userviews).
 *
 * @param {Object} params
 * @param {string} params.project
 * @param {string} params.user
 * @param {string} [params.namespace] Namespace ID or 'all'.
 * @param {string} [params.redirects] '0' exclude, '1' only, '2' both.
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { project, user, namespace, redirects,
 *   limit, pages: [ { title, namespace, created, redirect, length } ] }
 * @throws {ApiError}
 */
export function fetchPagesCreated( { project, user, namespace = 'all', redirects = '0', signal } ) {
	return apiGet( `/api/users/${ encodeURIComponent( project ) }/pages-created`, {
		user,
		namespace,
		redirects
	}, signal );
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
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { pages: { title: { num_edits, num_users,
 *   assessment } }, totals? }
 */
export function fetchEditData( { project, pages, start, end, signal } ) {
	return apiGet( `/api/pages/${ encodeURIComponent( project ) }/edits`, {
		pages: pages.join( '|' ),
		start,
		end,
		totals: '1'
	}, signal );
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
 * @param {AbortSignal} [params.signal]
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
	granularity = 'daily',
	signal
} ) {
	return apiGet( '/api/metrics/siteviews', {
		sites: sites.join( '|' ),
		source,
		start,
		end,
		platform,
		agent,
		granularity
	}, signal );
}

/**
 * Per-file mediarequest counts for Mediaviews (max 10 files, so no
 * chunking).
 *
 * @param {Object} params
 * @param {string[]} params.files upload.wikimedia file paths.
 * @param {string} params.start YYYY-MM-DD or YYYY-MM.
 * @param {string} params.end
 * @param {string} [params.referer]
 * @param {string} [params.agent]
 * @param {string} [params.granularity]
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { referer, agent, granularity, start, end,
 *   dates, files: [ { path, counts, total, average, no_data? } ],
 *   totals }
 * @throws {ApiError}
 */
export function fetchMediarequests( {
	files,
	start,
	end,
	referer = 'all-referers',
	agent = 'user',
	granularity = 'daily',
	signal
} ) {
	return apiGet( '/api/metrics/mediarequests', {
		files: files.join( '|' ),
		start,
		end,
		referer,
		agent,
		granularity
	}, signal );
}

/**
 * Per-site edit counts from the AQS edits data (max 10 sites, so no
 * chunking). Edit data is only loaded into AQS monthly: `dataThrough`
 * reports the last covered date (null when the range has none) so
 * the UI can hint at partial coverage.
 *
 * @param {Object} params
 * @param {string[]} params.sites Site domains, or [ 'all-projects' ].
 * @param {string} params.start YYYY-MM-DD or YYYY-MM.
 * @param {string} params.end
 * @param {string} [params.editorType]
 * @param {string} [params.pageType]
 * @param {string} [params.granularity]
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { editorType, pageType, granularity,
 *   start, end, dataThrough, dates, sites: [ { site, counts, total,
 *   average, no_data? } ], totals }
 * @throws {ApiError}
 */
export function fetchSiteEdits( {
	sites,
	start,
	end,
	editorType = 'user',
	pageType = 'content',
	granularity = 'daily',
	signal
} ) {
	return apiGet( '/api/metrics/edits', {
		sites: sites.join( '|' ),
		start,
		end,
		'editor-type': editorType,
		'page-type': pageType,
		granularity
	}, signal );
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
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { project, platform, date, articles:
 *   [ { article, views, rank } ] }
 */
export function fetchTopviews( { project, date, platform = 'all-access', signal } ) {
	return apiGet(
		`/api/metrics/top/${ encodeURIComponent( project ) }`,
		{ date, platform },
		signal
	);
}

/**
 * The page and file members of a category, from the replica-backed
 * endpoint (the Massviews category source).
 *
 * @param {Object} params
 * @param {string} params.project
 * @param {string} params.category Without the namespace prefix.
 * @param {string} [params.subcategories] '1' recurses through
 *   subcategories.
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { project, category, recursive, limit,
 *   pages: [ { title, namespace } ] }
 * @throws {ApiError}
 */
export function fetchCategoryMembers( { project, category, subcategories = '0', signal } ) {
	return apiGet( `/api/lists/${ encodeURIComponent( project ) }/category`, {
		category,
		subcategories
	}, signal );
}

/**
 * Monthly pageviews of the pages using media from a Commons category,
 * from the Commons Impact Metrics dataset (the Massviews "Commons
 * category" source). Only allowlisted categories are loaded.
 *
 * @param {Object} params
 * @param {string} params.category Without the Category: prefix.
 * @param {string} [params.scope] 'deep' includes subcategories.
 * @param {string} [params.wiki] A project domain, or 'all-wikis'.
 * @param {string} params.start YYYY-MM.
 * @param {string} params.end
 * @param {AbortSignal} [params.signal]
 * @return {Promise<Object>} { category, scope, wiki, granularity,
 *   start, end, dates, counts, total, average }
 * @throws {ApiError}
 */
export function fetchCommonsCategory( {
	category,
	scope = 'deep',
	wiki = 'all-wikis',
	start,
	end,
	signal
} ) {
	return apiGet( '/api/metrics/commons-category', {
		category,
		scope,
		wiki,
		start,
		end
	}, signal );
}

/**
 * Detect a not-yet-populated trailing data point: AQS can take a day
 * or more to backfill (and lags differently per wiki), so a zero on
 * the most recent date right after a non-zero one almost certainly
 * means "no data yet", not "zero views".
 *
 * When every series is missing the date, it is dropped from the axis
 * (averages recomputed over the shorter span). When only some are —
 * e.g. en.wikipedia is populated but de/fr aren't yet — the data is
 * left untouched (the date is real for the others) and only the
 * dropped-date signal is returned, so the UI can still warn.
 *
 * @param {Object} data
 * @param {string[]} data.dates
 * @param {Array<{counts: number[], total: number, average: number}>} data.series
 * @param {{counts: number[], total: number, average: number}} data.totals
 * @param {Array} [data.probe] Series to run the detection against
 *   when it should differ from the displayed ones — e.g. the queried
 *   pages' own raw series, since consolidated redirect sums can mask
 *   a target's not-yet-published day with an early-published
 *   redirect's counts.
 * @return {?{dates?: string[], series?: Array, totals?: Object, trimmedDate: string}}
 *   The dropped date, with the trimmed data when every series was
 *   missing it — or, when only some were, the series with the
 *   affected trailing zeros nulled (a chart gap); null when no
 *   series looks incomplete.
 */
export function trimIncompleteTail( { dates, series, totals, probe = series } ) {
	const last = dates.length - 1;
	const incompleteTail = ( counts ) => counts[ last ] === 0 && counts[ last - 1 ] > 0;
	if (
		last < 1 ||
		!totals?.counts ||
		!probe.some( ( entry ) => incompleteTail( entry.counts ) )
	) {
		return null;
	}
	// From the counts (dropped/nulled trailing zeros contribute 0), so
	// chart series ({ total }) and list rows ({ sum }) both work.
	const average = ( counts ) => Math.round(
		( counts.reduce( ( a, b ) => a + ( b || 0 ), 0 ) / last ) * 100
	) / 100;
	if ( !incompleteTail( totals.counts ) ) {
		// Some series do have data for the date: keep it, but null the
		// affected series' trailing zeros so their lines/bars end on
		// the last published day instead of dipping to a false zero.
		// Their averages exclude the unpublished day. (With detection
		// via the probe alone, the displayed series stay untouched.)
		if ( !series.some( ( entry ) => incompleteTail( entry.counts ) ) ) {
			return { trimmedDate: dates[ last ] };
		}
		return {
			series: series.map( ( entry ) => incompleteTail( entry.counts ) ?
				{
					...entry,
					counts: [ ...entry.counts.slice( 0, -1 ), null ],
					average: average( entry.counts )
				} :
				entry ),
			trimmedDate: dates[ last ]
		};
	}
	return {
		dates: dates.slice( 0, -1 ),
		series: series.map( ( entry ) => ( {
			...entry,
			counts: entry.counts.slice( 0, -1 ),
			average: average( entry.counts )
		} ) ),
		totals: {
			...totals,
			counts: totals.counts.slice( 0, -1 ),
			average: average( totals.counts )
		},
		trimmedDate: dates[ last ]
	};
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
