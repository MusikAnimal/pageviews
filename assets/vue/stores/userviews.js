import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchPagesCreated, fetchPageviews } from '../lib/metricsApi.js';
import { getSiteinfo } from '../projects.js';
import { mwApiGet } from '../lib/mwApi.js';
import { banana } from '../i18n.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
const SORTS = [ 'title', 'datestamp', 'size', 'views' ];
const REDIRECTS = [ '0', '1', '2' ];
// Above this many edits, fetching the created pages can take a while:
// the user gets a heads-up (legacy behavior).
const EDIT_COUNT_WARNING = 50000;

export const useUserviewsStore = defineStore( 'userviews', () => {
	/**
	 * The user whose created pages to analyze (underscored in the URL,
	 * like the legacy tool).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const user = ref( '' );
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
	 * Namespace ID as a string, or 'all'.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const namespace = ref( '0' );
	/**
	 * '0' excludes redirects, '1' returns only redirects, '2' both
	 * (legacy vocabulary).
	 *
	 * @type {import('vue').Ref<'0'|'1'|'2'>}
	 */
	const redirects = ref( '0' );
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
	 * @type {import('vue').Ref<'title'|'datestamp'|'size'|'views'>}
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
	 * Per-page rows: { title, created, size, redirect, counts, sum,
	 * average }. Titles carry their localized namespace prefix, with
	 * spaces.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const pagesData = ref( [] );
	/**
	 * The combined counts across all pages (the chart series).
	 *
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );
	/**
	 * One-shot signal for the controller to toast: the user has a huge
	 * edit count, so the replica query may take a while.
	 *
	 * @type {import('vue').Ref<?{user: string, count: number}>}
	 */
	const editCountWarning = ref( null );

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
		namespace: namespace.value,
		redirects: redirects.value,
		user: user.value.replace( / /g, '_' ) || undefined,
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
		if ( params.namespace === 'all' || /^\d+$/.test( params.namespace ?? '' ) ) {
			namespace.value = params.namespace;
		}
		if ( REDIRECTS.includes( params.redirects ) ) {
			redirects.value = params.redirects;
		}
		if ( params.user !== undefined && params.user !== user.value ) {
			user.value = params.user;
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
	 * Advisory only, so it must not delay the replica query: sets the
	 * one-shot editCountWarning signal the controller toasts.
	 *
	 * @param {number} id The loadId this check belongs to.
	 * @param {AbortSignal} signal
	 */
	async function checkEditCount( id, signal ) {
		try {
			const response = await mwApiGet( project.value, {
				action: 'query',
				list: 'users',
				ususers: user.value.replace( /_/g, ' ' ),
				usprop: 'editcount'
			}, signal );
			const count = response.query?.users?.[ 0 ]?.editcount ?? 0;
			if ( id === loadId && status.value === 'loading' && count > EDIT_COUNT_WARNING ) {
				editCountWarning.value = {
					user: user.value.replace( /_/g, ' ' ),
					count
				};
			}
		} catch {
			// Purely a nicety; ignore failures.
		}
	}

	/**
	 * Fetch the pages the user created from the replicas, then fan
	 * their titles out over the batched pageviews endpoint, driving the
	 * progress bar.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests —
		// including the reset cycle from a cleared form.
		const signal = aborter.next();

		if ( !user.value ) {
			status.value = 'initial';
			dates.value = [];
			pagesData.value = [];
			totals.value = null;
			// A cleared input also clears lingering errors.
			ui.clearMessages();
			return;
		}

		settings.ensureDefaultDates();
		statusBeforeLoad = status.value === 'loading' ? statusBeforeLoad : status.value;
		status.value = 'loading';
		editCountWarning.value = null;
		ui.clearMessages();

		// Dev aid; see the pageviews store.
		if (
			import.meta.env.MODE !== 'test' &&
			import.meta.env.VITE_SIMULATE_LOADING === '1'
		) {
			ui.setProgress( 2, 5 );
			return;
		}

		// Fire-and-forget by design (see the function docs).
		checkEditCount( id, signal );

		try {
			const created = await fetchPagesCreated( {
				project: project.value,
				user: user.value,
				namespace: namespace.value,
				redirects: redirects.value,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}
			if ( !created.pages.length ) {
				status.value = 'initial';
				ui.notify( {
					type: 'warning',
					text: `${ user.value.replace( /_/g, ' ' ) }: ${ banana.i18n( 'select2-no-results' ) }`
				} );
				return;
			}
			if ( created.pages.length >= created.limit ) {
				ui.notify( {
					type: 'warning',
					text: banana.i18n(
						'userviews-oversized-set',
						created.user,
						created.limit,
						created.limit
					)
				} );
			}

			// The replicas store titles without their namespace prefix;
			// siteinfo supplies the localized names.
			const siteinfo = await getSiteinfo( project.value );
			if ( id !== loadId ) {
				return;
			}
			if ( !siteinfo?.namespaces ) {
				throw new Error( banana.i18n( 'api-error', 'siteinfo API' ) );
			}
			const prefixed = created.pages.map( ( page ) => {
				const nsName = siteinfo.namespaces[ page.namespace ]?.[ '*' ] ?? '';
				return nsName ?
					`${ nsName.replace( / /g, '_' ) }:${ page.title }` :
					page.title;
			} );

			const result = await fetchPageviews( {
				project: project.value,
				pages: prefixed,
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
			pagesData.value = result.pages.map( ( series, i ) => {
				series.counts.forEach( ( count, j ) => {
					combined[ j ] += count;
				} );
				return {
					title: prefixed[ i ].replace( /_/g, ' ' ),
					created: created.pages[ i ].created,
					size: created.pages[ i ].length,
					redirect: created.pages[ i ].redirect,
					counts: series.counts,
					sum: series.total,
					average: series.average
				};
			} );
			dates.value = axis;
			const total = combined.reduce( ( a, b ) => a + b, 0 );
			totals.value = {
				counts: combined,
				total,
				average: Math.round( ( total / axis.length ) * 100 ) / 100
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
		user,
		project,
		platform,
		agent,
		namespace,
		redirects,
		autolog,
		sort,
		direction,
		view,
		status,
		dates,
		pagesData,
		totals,
		editCountWarning,
		query,
		setFromQuery,
		load,
		abort
	};
} );
