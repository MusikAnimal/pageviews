import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchPageviews } from '../lib/metricsApi.js';
import { getLangLinks } from '../lib/wikidata.js';
import { promisePool } from '../lib/queue.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
const SORTS = [ 'lang', 'title', 'badges', 'views' ];
// One page per language project; modest concurrency keeps the AQS
// fan-out (potentially 300+ languages) under the per-IP limits.
const CONCURRENCY = 4;

export const useLangviewsStore = defineStore( 'langviews', () => {
	/**
	 * The page whose language versions to analyze (underscored in the
	 * URL, like the legacy tool).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const page = ref( '' );
	/**
	 * The source project the page name belongs to; its family
	 * determines which sister sites are included.
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
	 * Whether automatic log-scale detection is allowed (legacy URL
	 * param, serialized only as autolog=false).
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const autolog = ref( true );
	/**
	 * Table sort state, kept in the URL like the legacy tool.
	 *
	 * @type {import('vue').Ref<'lang'|'title'|'badges'|'views'>}
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
	 * Per-language rows: { lang, title, badges, counts, sum, average }.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const langData = ref( [] );
	/**
	 * The combined counts across all languages (the chart series).
	 *
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );

	const settings = useSettingsStore();

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;

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
		if ( params.page !== undefined && params.page !== page.value ) {
			page.value = params.page;
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
	 * Resolve the page's language versions via Wikidata, then fan out
	 * one pageviews query per language project, driving the progress
	 * bar.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;

		if ( !page.value ) {
			status.value = 'initial';
			dates.value = [];
			langData.value = [];
			totals.value = null;
			// A cleared input also clears lingering errors (e.g.
			// "No data found" for the previous page).
			ui.clearMessages();
			return;
		}

		settings.ensureDefaultDates();
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
			const links = await getLangLinks( project.value, page.value );
			if ( id !== loadId ) {
				return;
			}
			if ( !links || !links.length ) {
				status.value = 'initial';
				ui.notify( {
					type: 'error',
					text: `${ page.value.replace( /_/g, ' ' ) }: ${ banana.i18n( 'api-error-no-data' ) }`
				} );
				return;
			}

			const family = project.value.split( '.' )[ 1 ];
			const results = await promisePool(
				links,
				( link ) => fetchPageviews( {
					project: `${ link.lang }.${ family }.org`,
					pages: [ link.title ],
					start: settings.start,
					end: settings.end,
					platform: platform.value,
					agent: agent.value,
					granularity: settings.dateType
				} ).then(
					( result ) => ( { link, result } ),
					// Non-fatal: a failed language is simply omitted.
					() => null
				),
				{ concurrency: CONCURRENCY, onProgress: ui.setProgress }
			);
			if ( id !== loadId ) {
				return;
			}

			const successes = results.filter( Boolean );
			if ( !successes.length ) {
				throw new Error( banana.i18n( 'api-error', 'Pageviews API' ) );
			}

			const axis = successes[ 0 ].result.dates;
			const combined = axis.map( () => 0 );
			langData.value = successes.map( ( { link, result } ) => {
				const [ series ] = result.pages;
				series.counts.forEach( ( count, i ) => {
					combined[ i ] += count;
				} );
				return {
					lang: link.lang,
					title: link.title,
					badges: link.badges,
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
		langData,
		totals,
		query,
		setFromQuery,
		load
	};
} );
