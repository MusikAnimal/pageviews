import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchEditData, fetchPageviews, fetchTopviews } from '../lib/metricsApi.js';
import { getPageInfo } from '../lib/mwApi.js';
import { consolidateSeries, getRedirects } from '../lib/redirects.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../lib/dates.js';
import { banana } from '../i18n.js';
import { usePreferencesStore } from './preferences.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

export const usePageviewsStore = defineStore( 'pageviews', () => {
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
	 * for multi-page queries. null while pending; failed is set when
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

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Pages are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		pages: pages.value.join( '|' ) || undefined,
		redirects: redirects.value ? '1' : undefined,
		autolog: autolog.value ? undefined : 'false'
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( params.pages ) {
			const titles = params.pages.split( '|' ).filter( ( page ) => page !== '' );
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

	async function loadEditData( settings, id ) {
		editData.value = null;
		try {
			const result = await fetchEditData( {
				project: settings.project,
				pages: pages.value,
				start: settings.start,
				end: settings.end
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

	async function loadPageInfo( settings, id ) {
		pageInfo.value = null;
		try {
			const result = await getPageInfo( settings.project, pages.value );
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
	 */
	async function loadTopviewsRank( settings, id ) {
		topRank.value = null;
		if ( pages.value.length !== 1 ) {
			return;
		}
		try {
			const endMonth = startOfMonth( parseDate( settings.end ) );
			const max = lastCompleteMonthUtc();
			const date = formatYm( endMonth > max ? max : endMonth );
			const result = await fetchTopviews( {
				project: settings.project,
				date,
				platform: settings.platform
			} );
			if ( id !== loadId ) {
				return;
			}
			const title = pages.value[ 0 ].replace( /_/g, ' ' );
			const entry = result.articles.find( ( article ) => article.article === title );
			topRank.value = entry ? { rank: entry.rank, date } : null;
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
		loadEditData( settings, id );
		loadTopviewsRank( settings, id );
		const pageInfoPromise = loadPageInfo( settings, id );

		try {
			let redirectMap = null;
			let titles = pages.value;
			if ( redirects.value ) {
				redirectMap = await getRedirects( settings.project, pages.value );
				titles = [ ...new Set( [
					...pages.value,
					...Object.values( redirectMap ).flat().map( ( r ) => r.title )
				] ) ];
			}

			const result = await fetchPageviews( {
				project: settings.project,
				pages: titles,
				start: settings.start,
				end: settings.end,
				platform: settings.platform,
				agent: settings.agent,
				granularity: settings.dateType,
				onProgress: ui.setProgress
			} );

			if ( id !== loadId ) {
				// A newer load superseded this one.
				return;
			}

			dates.value = result.dates;
			// Consolidation does not change the grand totals: redirect
			// counts are moved into their targets, not duplicated.
			const consolidated = redirectMap ?
				consolidateSeries( pages.value, redirectMap, result.pages ) :
				result.pages;
			series.value = dropMissingPages( consolidated, await pageInfoPromise, ui );
			totals.value = result.totals;
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

	return {
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
		query,
		setFromQuery,
		load
	};
} );
