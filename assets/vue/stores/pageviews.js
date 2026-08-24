import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchEditData, fetchPageviews, fetchTopviews, trimIncompleteTail } from '../lib/metricsApi.js';
import { getPageInfo } from '../lib/mwApi.js';
import { consolidateSeries, getRedirects } from '../lib/redirects.js';
import { findNonMainspace } from '../lib/mainspace.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../lib/dates.js';
import { banana } from '../i18n.js';
import { usePreferencesStore } from './preferences.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

// AQS vocabulary, used verbatim in URLs (legacy-compatible).
const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];

export const usePageviewsStore = defineStore( 'pageviews', () => {
	/**
	 * The Wikimedia project to query for data.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( 'en.wikipedia.org' );
	/**
	 * @type {import('vue').Ref<'all-access'|'desktop'|'mobile-app'|'mobile-web'>}
	 */
	const platform = ref( 'all-access' );
	/**
	 * @type {import('vue').Ref<'all-agents'|'user'|'spider'|'automated'>}
	 */
	const agent = ref( 'user' );
	/**
	 * The pages to query for.
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const pages = ref( [] );
	/**
	 * Whether pageviews of redirects to the given pages should be included.
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const redirects = ref( false );
	/**
	 * Whether automatic log-scale detection is allowed. Legacy URL
	 * param: only ever serialized as autolog=false (true is the
	 * default, subject to the user's autoLogDetection preference).
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const autolog = ref( true );
	/**
	 * @type {import('vue').Ref<'initial'|'loading'|'complete'|'error'>}
	 */
	const status = ref( 'initial' );
	/**
	 * The date axis, YYYY-MM-DD or YYYY-MM (monthly).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const dates = ref( [] );
	/**
	 * Per-page series: { title, counts, total, average,
	 * consolidatedFrom?, no_data? }.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const series = ref( [] );
	/**
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );
	/**
	 * Edit stats from the replica-backed endpoint: { pages: { title:
	 * { num_edits, num_users, assessment } }, totals: ?{ num_edits,
	 * num_users }, failed: boolean } — totals is the exact combined row
	 * for multipage queries. null while pending; failed is set when
	 * the endpoint errors (e.g. replicas unreachable) so the UI can
	 * show "data unavailable" rather than nothing.
	 *
	 * @type {import('vue').Ref<?Object>}
	 */
	const editData = ref( null );
	/**
	 * Basic page info (length, watchers) keyed by title, from the
	 * Action API. null until the non-fatal fetch succeeds.
	 *
	 * @type {import('vue').Ref<?Object>}
	 */
	const pageInfo = ref( null );
	/**
	 * Single-page queries only: the page's rank among the most-viewed
	 * pages of the month ({ rank, date: YYYY-MM }), or null when it
	 * isn't in the (excludes-filtered) top list.
	 *
	 * @type {import('vue').Ref<?{rank: number, date: string}>}
	 */
	const topRank = ref( null );
	/**
	 * One-shot signal: the trailing date dropped because its data
	 * hasn't been published yet (see trimIncompleteTail). The
	 * controller shows a toast and clears it.
	 *
	 * @type {import('vue').Ref<?string>}
	 */
	const incompleteDate = ref( null );

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;
	// Cancels the previous cycle's requests whenever a new one starts.
	const aborter = createLoadAborter();
	// What abort() returns the app to.
	let statusBeforeLoad = 'initial';

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Pages are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		project: project.value,
		platform: platform.value,
		agent: agent.value,
		pages: pages.value.map( ( page ) => page.replace( / /g, '_' ) ).join( '|' ) ||
			undefined,
		redirects: redirects.value ? '1' : undefined,
		autolog: autolog.value ? undefined : 'false'
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( params.project ) {
			project.value = params.project;
		}
		if ( PLATFORMS.includes( params.platform ) ) {
			platform.value = params.platform;
		}
		if ( AGENTS.includes( params.agent ) ) {
			agent.value = params.agent;
		}
		// Alias from early rewrite URLs.
		if ( params.platform === 'all' ) {
			platform.value = 'all-access';
		}
		if ( params.agent === 'all' ) {
			agent.value = 'all-agents';
		}
		if ( params.pages ) {
			const titles = params.pages.split( '|' )
				.filter( ( page ) => page !== '' )
				.map( ( page ) => page.replace( /_/g, ' ' ) );
			// Keep the array identity when unchanged: replacing it
			// retriggers the load watcher (e.g. when the FAQ dialog
			// route reuses the same query), flickering the chart.
			if ( titles.join( '|' ) !== pages.value.join( '|' ) ) {
				pages.value = titles;
			}
		}
		// When the URL doesn't say, the always-redirects preference
		// provides the default.
		redirects.value = params.redirects !== undefined ?
			params.redirects === '1' :
			usePreferencesStore().alwaysRedirects;
		autolog.value = params.autolog !== 'false';
	}

	async function loadEditData( settings, id, signal ) {
		editData.value = null;
		try {
			const result = await fetchEditData( {
				project: project.value,
				pages: pages.value,
				start: settings.start,
				end: settings.end,
				signal
			} );
			if ( id === loadId ) {
				editData.value = {
					pages: result.pages,
					totals: result.totals ?? null,
					failed: false
				};
			}
		} catch {
			// Non-fatal, but flagged: the totals sidebar shows a muted
			// "data unavailable" note instead of hiding the section.
			if ( id === loadId ) {
				editData.value = { pages: {}, totals: null, failed: true };
			}
		}
	}

	async function loadPageInfo( settings, id, signal ) {
		pageInfo.value = null;
		try {
			const result = await getPageInfo( project.value, pages.value, signal );
			if ( id === loadId ) {
				pageInfo.value = result;
			}
			return result;
		} catch {
			// Non-fatal; the affected fields simply don't render.
			return null;
		}
	}

	/**
	 * Single-page queries: look up the page in the excludes-filtered
	 * most-viewed list for the month of the end date (clamped to the
	 * last complete month, since recent data lags).
	 *
	 * @param {Object} settings The settings store.
	 * @param {number} id Load id, to discard superseded responses.
	 * @param {AbortSignal} signal
	 */
	async function loadTopviewsRank( settings, id, signal ) {
		topRank.value = null;
		if ( pages.value.length !== 1 ) {
			return;
		}
		try {
			const endMonth = startOfMonth( parseDate( settings.end ) );
			const max = lastCompleteMonthUtc();
			const date = formatYm( endMonth > max ? max : endMonth );
			const result = await fetchTopviews( {
				project: project.value,
				date,
				platform: platform.value,
				signal
			} );
			// Mirror the rank the Topviews app itself would show under
			// its defaults: the mainspace filter applied, then reranked
			// sequentially. Cheap: siteinfo is client-cached and the
			// top list is at most a thousand entries.
			const nonMainspace = await findNonMainspace(
				project.value,
				result.articles.map( ( article ) => article.article ),
				signal
			);
			if ( id !== loadId ) {
				return;
			}
			const title = pages.value[ 0 ].replace( /_/g, ' ' );
			let rank = 0;
			topRank.value = null;
			for ( const article of result.articles ) {
				if ( nonMainspace.has( article.article ) ) {
					continue;
				}
				rank++;
				if ( article.article === title ) {
					topRank.value = { rank, date };
					break;
				}
			}
		} catch {
			// Non-fatal; the rank line simply doesn't render.
		}
	}

	/**
	 * Drop series for pages that don't exist, with an error message per
	 * page. An AQS 404 alone can simply mean no pageviews (zeros are
	 * legitimate); only the Action API knows whether the page exists.
	 *
	 * @param {Array} seriesData
	 * @param {?Object} info From getPageInfo(); keyed by normalized title.
	 * @param {Object} ui
	 * @return {Array}
	 */
	function dropMissingPages( seriesData, info, ui ) {
		if ( !info ) {
			return seriesData;
		}
		const missing = new Set(
			Object.values( info )
				.filter( ( page ) => page.missing && !page.known )
				.map( ( page ) => page.title )
		);
		if ( !missing.size ) {
			return seriesData;
		}
		return seriesData.filter( ( page ) => {
			const title = page.title.replace( /_/g, ' ' );
			// Consolidated redirect counts mean there is real data even
			// if the target itself 404'd on AQS.
			if ( page.no_data && page.total === 0 && missing.has( title ) ) {
				ui.notify( {
					type: 'error',
					text: `${ title }: ${ banana.i18n( 'api-error-no-data' ) }`
				} );
				return false;
			}
			return true;
		} );
	}

	/**
	 * Fetch the pageview data for the current params: expands redirects
	 * when enabled, fetches through the batch metrics endpoint, and
	 * consolidates redirect series into their targets.
	 */
	async function load() {
		const settings = useSettingsStore();
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests —
		// including the reset cycle from a cleared form.
		const signal = aborter.next();

		if ( !pages.value.length ) {
			status.value = 'initial';
			dates.value = [];
			series.value = [];
			totals.value = null;
			editData.value = null;
			pageInfo.value = null;
			topRank.value = null;
			return;
		}

		settings.ensureDefaultDates();
		statusBeforeLoad = status.value === 'loading' ? statusBeforeLoad : status.value;
		status.value = 'loading';
		ui.clearMessages();

		// Dev aid: freeze the app in its loading state (progress bar
		// mid-way, nothing fetched) so the CSS can be styled without it
		// disappearing. Set VITE_SIMULATE_LOADING=1 in .env.local.
		// Vitest loads the same env files, hence the mode guard.
		if (
			import.meta.env.MODE !== 'test' &&
			import.meta.env.VITE_SIMULATE_LOADING === '1'
		) {
			ui.setProgress( 2, 5 );
			return;
		}

		// Supplementary and non-fatal: without these the stats table
		// and totals panel just omit the affected fields (e.g. replicas
		// unreachable locally). Deliberately not awaited here, so they
		// run concurrently with the metrics fetch. Page info is awaited
		// later to tell missing pages apart from zero-pageview ones.
		loadEditData( settings, id, signal );
		loadTopviewsRank( settings, id, signal );
		const pageInfoPromise = loadPageInfo( settings, id, signal );

		try {
			let redirectMap = null;
			let titles = pages.value;
			if ( redirects.value ) {
				redirectMap = await getRedirects( project.value, pages.value, signal );
				titles = [ ...new Set( [
					...pages.value,
					...Object.values( redirectMap ).flat().map( ( r ) => r.title )
				] ) ];
			}

			const result = await fetchPageviews( {
				project: project.value,
				pages: titles,
				start: settings.start,
				end: settings.end,
				platform: platform.value,
				agent: agent.value,
				granularity: settings.dateType,
				onProgress: ui.setProgress,
				signal
			} );

			if ( id !== loadId ) {
				// A newer load superseded this one.
				return;
			}

			// Consolidation does not change the grand totals: redirect
			// counts are moved into their targets, not duplicated.
			const consolidated = redirectMap ?
				consolidateSeries( pages.value, redirectMap, result.pages ) :
				result.pages;
			// An all-zero most recent day right after a non-zero one
			// means AQS hasn't published it yet: drop it and tell the
			// user via the one-shot signal. The detection probes the
			// queried pages' own series — AQS publishes per article,
			// so a redirect whose day landed early would otherwise
			// mask its target's empty day in the consolidated sums.
			const trimmed = trimIncompleteTail( {
				dates: result.dates,
				series: consolidated,
				totals: result.totals,
				probe: redirectMap ?
					result.pages.filter( ( entry ) => pages.value.includes( entry.title ) ) :
					consolidated
			} );
			incompleteDate.value = trimmed?.trimmedDate ?? null;
			dates.value = trimmed?.dates ?? result.dates;
			series.value = dropMissingPages(
				trimmed?.series ?? consolidated, await pageInfoPromise, ui
			);
			totals.value = trimmed?.totals ?? result.totals;
			status.value = 'complete';
		} catch ( error ) {
			if ( id !== loadId ) {
				return;
			}
			status.value = 'error';
			ui.notify( {
				type: 'error',
				text: error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message,
				// Offer "try again" unless the envelope says retrying is
				// pointless (e.g. invalid params). Errors without the
				// flag (network failures) count as retryable.
				onRetry: error.retryable === false ? undefined : load
			} );
		} finally {
			if ( id === loadId ) {
				ui.clearProgress();
			}
		}
	}

	/**
	 * Cancel the in-flight load (the overlay's Abort button): kills the
	 * requests and returns to the pre-submission state; the bumped
	 * loadId drops anything that already settled.
	 */
	function abort() {
		loadId++;
		aborter.abort();
		status.value = statusBeforeLoad;
		useUiStore().clearProgress();
	}

	return {
		project,
		platform,
		agent,
		pages,
		redirects,
		autolog,
		status,
		dates,
		series,
		totals,
		editData,
		pageInfo,
		topRank,
		incompleteDate,
		query,
		setFromQuery,
		load,
		abort
	};
} );
