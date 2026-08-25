import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchPageviews, trimIncompleteTail } from '../lib/metricsApi.js';
import { getRedirects } from '../lib/redirects.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
const SORTS = [ 'title', 'section', 'views' ];

export const useRedirectviewsStore = defineStore( 'redirectviews', () => {
	/**
	 * The page whose redirects to analyze (underscored in the URL,
	 * like the legacy tool).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const page = ref( '' );
	/**
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
	 * Whether automatic log-scale detection is allowed (legacy URL
	 * param, serialized only as autolog=false).
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const autolog = ref( true );
	/**
	 * Table sort state, kept in the URL like the legacy tool.
	 *
	 * @type {import('vue').Ref<'title'|'section'|'views'>}
	 */
	const sort = ref( 'views' );
	/**
	 * 1 = descending (legacy semantics), -1 = ascending.
	 *
	 * @type {import('vue').Ref<'1'|'-1'>}
	 */
	const direction = ref( '1' );
	/**
	 * @type {import('vue').Ref<'list'|'chart'>}
	 */
	const view = ref( 'list' );
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
	 * Per-page rows — the target first, then each redirect:
	 * { title, section, isTarget, counts, sum, average }.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const redirectData = ref( [] );
	/**
	 * The combined counts across the target and all redirects (the
	 * chart series).
	 *
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );
	/**
	 * One-shot signal: the trailing date's data has not been published
	 * by AQS yet (see trimIncompleteTail).
	 *
	 * @type {import('vue').Ref<?string>}
	 */
	const incompleteDate = ref( null );

	/**
	 * How long the last completed query took, in seconds (with
	 * sub-second precision). Shown under the results, legacy-style.
	 *
	 * @type {import('vue').Ref<?number>}
	 */
	const elapsedTime = ref( null );

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
		project: project.value,
		platform: platform.value,
		agent: agent.value,
		page: page.value.replace( / /g, '_' ) || undefined,
		sort: sort.value,
		direction: direction.value,
		view: view.value,
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
		} else if ( params.platform === 'all' ) {
			platform.value = 'all-access';
		}
		if ( AGENTS.includes( params.agent ) ) {
			agent.value = params.agent;
		} else if ( params.agent === 'all' ) {
			agent.value = 'all-agents';
		}
		if ( params.page !== undefined ) {
			const title = params.page.replace( /_/g, ' ' );
			if ( title !== page.value ) {
				page.value = title;
			}
		}
		if ( SORTS.includes( params.sort ) ) {
			sort.value = params.sort;
		}
		if ( [ '1', '-1' ].includes( params.direction ) ) {
			direction.value = params.direction;
		}
		if ( [ 'list', 'chart' ].includes( params.view ) ) {
			view.value = params.view;
		}
		autolog.value = params.autolog !== 'false';
	}

	/**
	 * Resolve the page's redirects via the Action API, then fetch the
	 * pageviews of the target and every redirect through the batched
	 * endpoint, driving the progress bar.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests —
		// including the reset cycle from a cleared form.
		const signal = aborter.next();
		const started = performance.now();
		elapsedTime.value = null;

		if ( !page.value ) {
			status.value = 'initial';
			dates.value = [];
			redirectData.value = [];
			totals.value = null;
			incompleteDate.value = null;
			// A cleared input also clears lingering errors.
			ui.clearMessages();
			return;
		}

		settings.ensureDefaultDates();
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
			const display = page.value.replace( /_/g, ' ' );
			const redirectMap = await getRedirects( project.value, [ display ], signal );
			if ( id !== loadId ) {
				return;
			}
			// The target leads; sections come from the redirects'
			// fragments.
			const entries = [
				{ title: display, section: '', isTarget: true },
				...( redirectMap[ display ] || [] ).map( ( redirect ) => ( {
					title: redirect.title,
					section: redirect.fragment || '',
					isTarget: false
				} ) )
			];

			const result = await fetchPageviews( {
				project: project.value,
				pages: entries.map( ( entry ) => entry.title ),
				start: settings.start,
				end: settings.end,
				platform: platform.value,
				agent: agent.value,
				granularity: settings.dateType,
				onProgress: ui.setProgress,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}

			const axis = result.dates;
			const combined = axis.map( () => 0 );
			// Chunks preserve request order, so rows align by index.
			const rows = result.pages.map( ( series, i ) => {
				series.counts.forEach( ( count, j ) => {
					combined[ j ] += count;
				} );
				return {
					...entries[ i ],
					counts: series.counts,
					sum: series.total,
					average: series.average
				};
			} );
			const total = combined.reduce( ( a, b ) => a + b, 0 );
			const allTotals = {
				counts: combined,
				total,
				average: Math.round( ( total / axis.length ) * 100 ) / 100
			};
			// An all-zero most recent day right after a non-zero one
			// means AQS has not published it yet: drop it (or gap the
			// affected rows) and tell the user via the one-shot signal.
			const trimmed = trimIncompleteTail( {
				dates: axis,
				series: rows,
				totals: allTotals
			} );
			incompleteDate.value = trimmed?.trimmedDate ?? null;
			dates.value = trimmed?.dates ?? axis;
			redirectData.value = trimmed?.series ?? rows;
			totals.value = trimmed?.totals ?? allTotals;
			elapsedTime.value = ( performance.now() - started ) / 1000;
			status.value = 'complete';
		} catch ( error ) {
			if ( id !== loadId ) {
				return;
			}
			// A fatal error acts like the Abort button: the pool has
			// stopped queuing chunks, and this cancels the in-flight
			// ones. (User aborts bump loadId, so they never get here.)
			aborter.abort();
			status.value = 'error';
			ui.notify( {
				type: 'error',
				text: error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message,
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
		page,
		project,
		platform,
		agent,
		autolog,
		sort,
		direction,
		view,
		status,
		dates,
		redirectData,
		totals,
		incompleteDate,
		elapsedTime,
		query,
		setFromQuery,
		load,
		abort
	};
} );
