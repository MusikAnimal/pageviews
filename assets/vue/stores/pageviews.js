import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchEditData, fetchPageviews } from '../lib/metricsApi.js';
import { getPageInfo } from '../lib/mwApi.js';
import { consolidateSeries, getRedirects } from '../lib/redirects.js';
import { banana } from '../i18n.js';
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
		redirects: redirects.value ? '1' : undefined
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( params.pages ) {
			pages.value = params.pages.split( '|' ).filter( ( page ) => page !== '' );
		}
		redirects.value = params.redirects === '1';
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
		} catch {
			// Non-fatal; the affected fields simply don't render.
		}
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
			return;
		}

		settings.ensureDefaultDates();
		status.value = 'loading';
		ui.clearMessages();

		// Supplementary and non-fatal: without these the stats table
		// and totals panel just omit the affected fields (e.g. replicas
		// unreachable locally). Deliberately not awaited, so they run
		// concurrently with the metrics fetch.
		loadEditData( settings, id );
		loadPageInfo( settings, id );

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
			series.value = redirectMap ?
				consolidateSeries( pages.value, redirectMap, result.pages ) :
				result.pages;
			totals.value = result.totals;
			status.value = 'complete';
		} catch ( error ) {
			if ( id !== loadId ) {
				return;
			}
			status.value = 'error';
			ui.notify( {
				type: 'error',
				text: error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message
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
		status,
		dates,
		series,
		totals,
		editData,
		pageInfo,
		query,
		setFromQuery,
		load
	};
} );
