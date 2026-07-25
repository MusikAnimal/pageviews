import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchCommonsCategory } from '../lib/metricsApi.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { formatYm, lastCompleteMonthUtc } from '../lib/dates.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

// More legacy sources (category, wikilinks, subpages, …) join here as
// they are ported.
const SOURCES = [ 'commons-category' ];
const SCOPES = [ 'deep', 'shallow' ];
// The Commons Impact Metrics dataset begins here.
export const COMMONS_METRICS_MIN_MONTH = '2023-01';
// Default span for a bare visit: the last complete year of months.
const DEFAULT_MONTH_SPAN = 12;

export const useMassviewsStore = defineStore( 'massviews', () => {
	/**
	 * The list source. Only the Commons Impact Metrics-backed
	 * 'commons-category' source exists so far.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const source = ref( 'commons-category' );
	/**
	 * The source's input — for commons-category, the Commons category
	 * name without the namespace prefix (underscored in the URL, like
	 * the legacy tool's target param).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const target = ref( '' );
	/**
	 * 'deep' includes all subcategories; 'shallow' the category alone.
	 *
	 * @type {import('vue').Ref<'deep'|'shallow'>}
	 */
	const scope = ref( 'deep' );
	/**
	 * The wiki whose pageviews to count: a project domain, or
	 * 'all-wikis' (the default; Commons media is used everywhere).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( 'all-wikis' );
	/**
	 * The aggregate has no page list, so the chart is the main view.
	 *
	 * @type {import('vue').Ref<'list'|'chart'>}
	 */
	const view = ref( 'chart' );
	/**
	 * @type {import('vue').Ref<'initial'|'loading'|'complete'|'error'>}
	 */
	const status = ref( 'initial' );
	/**
	 * The month axis, YYYY-MM.
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const dates = ref( [] );
	/**
	 * Views per month, aligned with `dates`.
	 *
	 * @type {import('vue').Ref<number[]>}
	 */
	const counts = ref( [] );
	/**
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );

	const settings = useSettingsStore();

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;
	// Cancels the previous cycle's requests whenever a new one starts.
	const aborter = createLoadAborter();
	// What abort() returns the app to.
	let statusBeforeLoad = 'initial';

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		source: source.value,
		target: target.value.replace( / /g, '_' ) || undefined,
		scope: scope.value,
		project: project.value,
		view: view.value
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( SOURCES.includes( params.source ) ) {
			source.value = params.source;
		}
		if ( params.target !== undefined && params.target !== target.value ) {
			target.value = params.target;
		}
		if ( SCOPES.includes( params.scope ) ) {
			scope.value = params.scope;
		}
		if ( params.project ) {
			project.value = params.project;
		}
		if ( [ 'list', 'chart' ].includes( params.view ) ) {
			view.value = params.view;
		}
	}

	/**
	 * The commons-category source only has monthly data: force the
	 * shared date params into month form and default to the last
	 * complete year. Called by the Settings component and load().
	 */
	function ensureMonthlyDefaults() {
		settings.dateType = 'monthly';
		// Day-precision values (e.g. carried over from another app)
		// truncate to their month.
		settings.start = ( settings.start || '' ).slice( 0, 7 );
		settings.end = ( settings.end || '' ).slice( 0, 7 );
		if ( !settings.start || !settings.end ) {
			const endMonth = lastCompleteMonthUtc();
			const startMonth = new Date( Date.UTC(
				endMonth.getUTCFullYear(),
				endMonth.getUTCMonth() - ( DEFAULT_MONTH_SPAN - 1 ),
				1
			) );
			settings.start = formatYm( startMonth );
			settings.end = formatYm( endMonth );
		}
		if ( settings.start < COMMONS_METRICS_MIN_MONTH ) {
			settings.start = COMMONS_METRICS_MIN_MONTH;
		}
	}

	/**
	 * Fetch the monthly aggregate for the current params.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests —
		// including the reset cycle from a cleared form.
		const signal = aborter.next();

		if ( !target.value ) {
			status.value = 'initial';
			dates.value = [];
			counts.value = [];
			totals.value = null;
			// A cleared input also clears lingering errors.
			ui.clearMessages();
			return;
		}

		ensureMonthlyDefaults();
		statusBeforeLoad = status.value === 'loading' ? statusBeforeLoad : status.value;
		status.value = 'loading';
		ui.clearMessages();

		// Dev aid; see the pageviews store.
		if (
			import.meta.env.MODE !== 'test' &&
			import.meta.env.VITE_SIMULATE_LOADING === '1'
		) {
			ui.setProgress( 2, 5 );
			return;
		}

		try {
			const result = await fetchCommonsCategory( {
				category: target.value,
				scope: scope.value,
				wiki: project.value,
				start: settings.start,
				end: settings.end,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}

			dates.value = result.dates;
			counts.value = result.counts;
			totals.value = {
				counts: result.counts,
				total: result.total,
				average: result.average
			};
			status.value = 'complete';
		} catch ( error ) {
			if ( id !== loadId ) {
				return;
			}
			status.value = 'error';
			ui.notify( {
				type: 'error',
				text: error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message,
				onRetry: error.retryable === false ? undefined : load
			} );
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
		source,
		target,
		scope,
		project,
		view,
		status,
		dates,
		counts,
		totals,
		query,
		setFromQuery,
		ensureMonthlyDefaults,
		load,
		abort
	};
} );
