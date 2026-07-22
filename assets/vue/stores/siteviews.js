import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { fetchSiteviews } from '../lib/metricsApi.js';
import { getSiteStatistics } from '../lib/mwApi.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const SOURCES = [ 'pageviews', 'unique-devices', 'pagecounts' ];
// Per-source AQS platform vocabularies, used verbatim in URLs
// (legacy-compatible).
const PLATFORMS = {
	pageviews: [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ],
	'unique-devices': [ 'all-sites', 'desktop-site', 'mobile-site' ],
	pagecounts: [ 'all-sites', 'desktop-site', 'mobile-site' ]
};
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
// When the source changes, keep the closest equivalent platform.
const PLATFORM_EQUIVALENTS = {
	'all-access': 'all-sites',
	desktop: 'desktop-site',
	'mobile-app': 'mobile-site',
	'mobile-web': 'mobile-site',
	'all-sites': 'all-access',
	'desktop-site': 'desktop',
	'mobile-site': 'mobile-web'
};

export const DEFAULT_SITES = [ 'fr.wikipedia.org', 'de.wikipedia.org' ];
export const MAX_SITES = 10;

export const useSiteviewsStore = defineStore( 'siteviews', () => {
	/**
	 * The site domains to query for, or [ 'all-projects' ] for the
	 * all-of-Wikimedia aggregate (pageviews source only).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const sites = ref( [] );
	/**
	 * @type {import('vue').Ref<'pageviews'|'unique-devices'|'pagecounts'>}
	 */
	const source = ref( 'pageviews' );
	/**
	 * @type {import('vue').Ref<string>} Per-source vocabulary.
	 */
	const platform = ref( 'all-access' );
	/**
	 * Pageviews source only; other metrics have no agent breakdown.
	 *
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
	 * Per-site series: { site, counts, total, average, no_data? }.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const series = ref( [] );
	/**
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );
	/**
	 * All-time siteinfo statistics keyed by site domain, from the
	 * Action API (client-side, non-fatal). Accumulates across loads —
	 * the numbers are all-time, so there is nothing to refresh.
	 *
	 * @type {import('vue').Ref<Object>}
	 */
	const siteStats = ref( {} );

	const isPageviews = computed( () => source.value === 'pageviews' );
	const isAllProjects = computed(
		() => isPageviews.value && sites.value[ 0 ] === 'all-projects'
	);

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;

	// Keep the platform vocabulary in step with the source; sync so the
	// two are never observed mismatched. All-projects only exists for
	// the pageviews source.
	watch( source, ( newSource ) => {
		if ( !PLATFORMS[ newSource ].includes( platform.value ) ) {
			platform.value = PLATFORM_EQUIVALENTS[ platform.value ] ?? PLATFORMS[ newSource ][ 0 ];
		}
		if ( newSource !== 'pageviews' && sites.value[ 0 ] === 'all-projects' ) {
			sites.value = [ ...DEFAULT_SITES ];
		}
	}, { flush: 'sync' } );

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Sites are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		sites: sites.value.join( '|' ) || undefined,
		source: source.value,
		platform: platform.value,
		agent: isPageviews.value ? agent.value : undefined,
		autolog: autolog.value ? undefined : 'false'
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
		if ( PLATFORMS[ source.value ].includes( params.platform ) ) {
			platform.value = params.platform;
		} else if ( params.platform === 'all' ) {
			platform.value = PLATFORMS[ source.value ][ 0 ];
		}
		if ( AGENTS.includes( params.agent ) ) {
			agent.value = params.agent;
		} else if ( params.agent === 'all' ) {
			agent.value = 'all-agents';
		}
		if ( params.sites ) {
			const domains = params.sites.split( '|' )
				.filter( ( site ) => site !== '' )
				.slice( 0, MAX_SITES );
			// Keep the array identity when unchanged (see the
			// pageviews store).
			if ( domains.join( '|' ) !== sites.value.join( '|' ) ) {
				sites.value = domains;
			}
		}
		autolog.value = params.autolog !== 'false';
	}

	/**
	 * All-time statistics per site, from siteinfo. Non-fatal and
	 * cached across loads; skipped in all-projects mode (there is no
	 * such aggregate).
	 *
	 * @param {number} id Load id, to discard superseded responses.
	 */
	async function loadSiteStats( id ) {
		if ( isAllProjects.value ) {
			return;
		}
		const missing = sites.value.filter( ( site ) => !siteStats.value[ site ] );
		const results = await Promise.allSettled(
			missing.map( ( site ) => getSiteStatistics( site ) )
		);
		if ( id !== loadId ) {
			return;
		}
		missing.forEach( ( site, i ) => {
			if ( results[ i ].status === 'fulfilled' ) {
				siteStats.value[ site ] = results[ i ].value;
			}
		} );
	}

	/**
	 * Fetch the aggregate data for the current params.
	 */
	async function load() {
		const settings = useSettingsStore();
		const ui = useUiStore();
		const id = ++loadId;

		if ( !sites.value.length ) {
			status.value = 'initial';
			dates.value = [];
			series.value = [];
			totals.value = null;
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

		// Supplementary and non-fatal (deliberately not awaited).
		loadSiteStats( id );

		try {
			const result = await fetchSiteviews( {
				sites: sites.value,
				source: source.value,
				start: settings.start,
				end: settings.end,
				platform: platform.value,
				agent: agent.value,
				granularity: settings.dateType
			} );

			if ( id !== loadId ) {
				return;
			}

			dates.value = result.dates;
			series.value = result.sites;
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
				onRetry: error.retryable === false ? undefined : load
			} );
		}
	}

	return {
		sites,
		source,
		platform,
		agent,
		autolog,
		status,
		dates,
		series,
		totals,
		siteStats,
		isPageviews,
		isAllProjects,
		query,
		setFromQuery,
		load
	};
} );
