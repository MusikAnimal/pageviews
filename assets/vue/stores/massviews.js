import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchCategoryMembers, fetchPageviews } from '../lib/metricsApi.js';
import { getSiteinfo } from '../projects.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

// The remaining legacy sources (wikilinks, subpages, transclusions,
// quarry, hashtag, external links, search) land here as they are
// ported.
const SOURCES = [ 'category' ];
const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
const SORTS = [ 'title', 'views' ];
const TOGGLES = [ '0', '1' ];

export const useMassviewsStore = defineStore( 'massviews', () => {
	/**
	 * The list source.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const source = ref( 'category' );
	/**
	 * The source's input — for the category source, the full URL of
	 * the category page (legacy target param).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const target = ref( '' );
	/**
	 * @type {import('vue').Ref<'all-access'|'desktop'|'mobile-app'|'mobile-web'>}
	 */
	const platform = ref( 'all-access' );
	/**
	 * @type {import('vue').Ref<'all-agents'|'user'|'spider'|'automated'>}
	 */
	const agent = ref( 'user' );
	/**
	 * '1' converts talk pages to their subject pages (legacy
	 * category-subject toggle).
	 *
	 * @type {import('vue').Ref<'0'|'1'>}
	 */
	const subjectpage = ref( '0' );
	/**
	 * '1' includes all subcategories' members, recursively.
	 *
	 * @type {import('vue').Ref<'0'|'1'>}
	 */
	const subcategories = ref( '0' );
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
	 * @type {import('vue').Ref<'title'|'views'>}
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
	 * The project the queried category lives on, parsed from the
	 * target URL during load (runtime state, not a URL param).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( '' );
	/**
	 * The category name (underscored, no prefix), parsed from the
	 * target URL during load.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const category = ref( '' );
	/**
	 * The date axis, YYYY-MM-DD or YYYY-MM (monthly).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const dates = ref( [] );
	/**
	 * Per-page rows: { title, counts, sum, average }. Titles carry
	 * their localized namespace prefix, with spaces.
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
		target: target.value || undefined,
		platform: platform.value,
		agent: agent.value,
		subjectpage: subjectpage.value,
		subcategories: subcategories.value,
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
		if ( SOURCES.includes( params.source ) ) {
			source.value = params.source;
		}
		if ( params.target !== undefined && params.target !== target.value ) {
			target.value = params.target;
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
		if ( TOGGLES.includes( params.subjectpage ) ) {
			subjectpage.value = params.subjectpage;
		}
		if ( TOGGLES.includes( params.subcategories ) ) {
			subcategories.value = params.subcategories;
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
	 * Parse a full category URL (/wiki/ or index.php?title= form) into
	 * its project and prefix-less category name. The prefix is dropped
	 * at the first colon, whatever the wiki's language calls the
	 * namespace (legacy behavior).
	 *
	 * @param {string} value
	 * @return {?{project: string, category: string}} null when the
	 *   value isn't a category URL.
	 */
	function parseCategoryUrl( value ) {
		let url;
		try {
			url = new URL( value.trim() );
		} catch {
			return null;
		}
		let title = null;
		if ( url.pathname.startsWith( '/wiki/' ) ) {
			title = decodeURIComponent( url.pathname.slice( '/wiki/'.length ) );
		} else {
			title = url.searchParams.get( 'title' );
		}
		if ( !title || !title.includes( ':' ) ) {
			return null;
		}
		return {
			project: url.hostname,
			category: title.slice( title.indexOf( ':' ) + 1 ).replace( / /g, '_' )
		};
	}

	/**
	 * Resolve the category members from the replicas, localize their
	 * namespace prefixes, then fan the titles out over the batched
	 * pageviews endpoint, driving the progress bar.
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
			pagesData.value = [];
			totals.value = null;
			// A cleared input also clears lingering errors.
			ui.clearMessages();
			return;
		}

		const parsed = parseCategoryUrl( target.value );
		if ( !parsed ) {
			status.value = 'initial';
			ui.clearMessages();
			ui.notify( { type: 'error', text: banana.i18n( 'invalid-category-url' ) } );
			return;
		}
		project.value = parsed.project;
		category.value = parsed.category;

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
			const members = await fetchCategoryMembers( {
				project: parsed.project,
				category: parsed.category,
				subcategories: subcategories.value,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}
			if ( !members.pages.length ) {
				status.value = 'initial';
				ui.notify( {
					type: 'warning',
					text: `${ parsed.category.replace( /_/g, ' ' ) }: ${
						banana.i18n( 'api-error-no-data' ) }`
				} );
				return;
			}
			if ( members.pages.length >= members.limit ) {
				ui.notify( {
					type: 'warning',
					text: banana.i18n(
						'massviews-oversized-set-unknown',
						parsed.category.replace( /_/g, ' ' ),
						members.limit
					)
				} );
			}

			// The replicas store titles without their namespace prefix;
			// siteinfo supplies the localized names.
			const siteinfo = await getSiteinfo( parsed.project );
			if ( id !== loadId ) {
				return;
			}
			if ( !siteinfo?.namespaces ) {
				throw new Error( banana.i18n( 'api-error', 'siteinfo API' ) );
			}
			const useSubjectPage = subjectpage.value === '1';
			const prefixed = members.pages.map( ( page ) => {
				// Talk namespaces are odd-numbered; the subject page
				// lives one namespace below (legacy toggle).
				const ns = useSubjectPage && page.namespace % 2 === 1 ?
					page.namespace - 1 :
					page.namespace;
				const nsName = siteinfo.namespaces[ ns ]?.[ '*' ] ?? '';
				return nsName ?
					`${ nsName.replace( / /g, '_' ) }:${ page.title }` :
					page.title;
			} );

			const result = await fetchPageviews( {
				project: parsed.project,
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
		source,
		target,
		platform,
		agent,
		subjectpage,
		subcategories,
		autolog,
		sort,
		direction,
		view,
		status,
		project,
		category,
		dates,
		pagesData,
		totals,
		query,
		setFromQuery,
		load,
		abort
	};
} );
