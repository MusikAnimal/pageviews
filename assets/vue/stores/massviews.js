import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchCategoryMembers, fetchPageviews } from '../lib/metricsApi.js';
import {
	getExternalLinkUsage,
	getSearchResults,
	getSubpages,
	getTranscludedIn,
	getWikilinks
} from '../lib/mwApi.js';
import { getQuarryTitles } from '../lib/quarry.js';
import { getSiteinfo } from '../projects.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

// The hashtag source remains to be ported.
const SOURCES = [
	'category', 'wikilinks', 'subpages', 'transclusions',
	'quarry', 'external-link', 'search'
];
// Sources whose target is a full page URL (the project comes from it)…
const URL_SOURCES = [ 'category', 'wikilinks', 'subpages', 'transclusions' ];
// …versus sources needing an explicit project alongside the target.
const PROJECT_SOURCES = [ 'quarry', 'external-link', 'search' ];
const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];
const SORTS = [ 'title', 'views' ];
const TOGGLES = [ '0', '1' ];
// Matches the legacy apiLimit and the server-side caps.
const MAX_PAGES = 20000;

export const useMassviewsStore = defineStore( 'massviews', () => {
	/**
	 * The list source.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const source = ref( 'category' );
	/**
	 * The source's input — the full URL of the page or category
	 * (legacy target param).
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
	 * The project the pages live on: derived from the target URL for
	 * the URL sources, a user-set URL param for the others (quarry,
	 * external links, search).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( 'en.wikipedia.org' );
	/**
	 * The full title of the queried page/category as it appeared in
	 * the target URL — namespace prefix included, in the wiki's own
	 * language (e.g. Kategorie:… on dewiki). For display; underscored.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const targetTitle = ref( '' );
	/**
	 * Where the results heading links: the target URL itself for URL
	 * sources; the Quarry query, Special:LinkSearch or Special:Search
	 * for the others. Set during load.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const targetUrl = ref( '' );
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
		project: PROJECT_SOURCES.includes( source.value ) ? project.value : undefined,
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
	 * Parse a full page URL (/wiki/ or index.php?title= form) into its
	 * project and title. For the category source, the title must carry
	 * a namespace prefix — dropped at the first colon to get the bare
	 * category name, whatever the wiki's language calls the namespace
	 * (legacy behavior).
	 *
	 * @param {string} value
	 * @return {?{project: string, title: string, category: ?string}}
	 *   null when the value isn't a usable page URL; title keeps the
	 *   URL's own namespace prefix.
	 */
	function parseTargetUrl( value ) {
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
		if ( !title ) {
			return null;
		}
		return {
			project: url.hostname,
			title: title.replace( / /g, '_' ),
			category: title.includes( ':' ) ?
				title.slice( title.indexOf( ':' ) + 1 ).replace( / /g, '_' ) :
				null
		};
	}

	/**
	 * Resolve a Quarry query ID to its page_title column.
	 *
	 * @param {Object} parsed Unused (no URL to parse).
	 * @param {AbortSignal} signal
	 * @return {Promise<?string[]>} Titles, or null to bail (a message
	 *   has been shown).
	 */
	async function resolveQuarry( parsed, signal ) {
		const ui = useUiStore();
		const titles = await getQuarryTitles( target.value.trim(), signal );
		if ( titles === null ) {
			// The message embeds <code> markup, but messages render as
			// plain text.
			ui.notify( {
				type: 'error',
				text: banana.i18n( 'invalid-quarry-dataset', 'page_title' )
					.replace( /<\/?code>/g, '' )
			} );
			return null;
		}
		if ( !titles.length ) {
			ui.notify( {
				type: 'warning',
				text: `${ targetTitle.value }: ${ banana.i18n( 'api-error-no-data' ) }`
			} );
			return null;
		}
		if ( titles.length > MAX_PAGES ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n(
					'massviews-oversized-set',
					targetTitle.value,
					String( titles.length ),
					MAX_PAGES,
					titles.length
				)
			} );
			return titles.slice( 0, MAX_PAGES );
		}
		return titles;
	}

	/**
	 * Resolve the target to the mainspace pages containing a matching
	 * external link, or to mainspace search results.
	 *
	 * @param {Object} parsed Unused (no URL to parse).
	 * @param {AbortSignal} signal
	 * @return {Promise<?string[]>} Titles, or null to bail (a message
	 *   has been shown).
	 */
	async function resolveProjectQuery( parsed, signal ) {
		const ui = useUiStore();
		const resolver = source.value === 'search' ? getSearchResults : getExternalLinkUsage;
		const titles = await resolver( project.value, target.value.trim(), signal );
		if ( !titles.length ) {
			ui.notify( {
				type: 'warning',
				text: `${ targetTitle.value }: ${ banana.i18n( 'api-error-no-data' ) }`
			} );
			return null;
		}
		if ( titles.length >= MAX_PAGES ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-oversized-set-unknown', targetTitle.value, MAX_PAGES )
			} );
		}
		return titles;
	}

	/**
	 * Resolve the target to the category's member titles: the replicas
	 * list them without namespace prefixes, which siteinfo localizes
	 * (with the subject-page toggle applied).
	 *
	 * @param {Object} parsed From parseTargetUrl().
	 * @param {AbortSignal} signal
	 * @return {Promise<?string[]>} Prefixed titles, or null to bail
	 *   (a message has been shown).
	 */
	async function resolveCategory( parsed, signal ) {
		const ui = useUiStore();
		const display = parsed.category.replace( /_/g, ' ' );
		const members = await fetchCategoryMembers( {
			project: parsed.project,
			category: parsed.category,
			subcategories: subcategories.value,
			signal
		} );
		if ( !members.pages.length ) {
			ui.notify( {
				type: 'warning',
				text: `${ display }: ${ banana.i18n( 'api-error-no-data' ) }`
			} );
			return null;
		}
		if ( members.pages.length >= members.limit ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-oversized-set-unknown', display, members.limit )
			} );
		}

		const siteinfo = await getSiteinfo( parsed.project );
		if ( !siteinfo?.namespaces ) {
			throw new Error( banana.i18n( 'api-error', 'siteinfo API' ) );
		}
		const useSubjectPage = subjectpage.value === '1';
		return members.pages.map( ( page ) => {
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
	}

	/**
	 * Resolve the target to the titles it links to (wikilinks) or the
	 * titles transcluding it (transclusions), via the Action API.
	 *
	 * @param {Object} parsed From parseTargetUrl().
	 * @param {AbortSignal} signal
	 * @return {Promise<?string[]>} Prefixed titles, or null to bail
	 *   (a message has been shown).
	 */
	async function resolveLinks( parsed, signal ) {
		const ui = useUiStore();
		const display = parsed.title.replace( /_/g, ' ' );
		const resolver = source.value === 'wikilinks' ? getWikilinks : getTranscludedIn;
		const titles = await resolver( parsed.project, display, signal );
		if ( titles === null ) {
			// The page itself doesn't exist.
			ui.notify( {
				type: 'warning',
				text: `${ display }: ${ banana.i18n( 'api-error-no-data' ) }`
			} );
			return null;
		}
		if ( !titles.length ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-empty-set', display )
			} );
			return null;
		}
		if ( titles.length >= MAX_PAGES ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-oversized-set-unknown', display, MAX_PAGES )
			} );
		}
		return titles;
	}

	/**
	 * Resolve the target to itself plus all its subpages (own and
	 * talk/subject namespaces, like the legacy tool).
	 *
	 * @param {Object} parsed From parseTargetUrl().
	 * @param {AbortSignal} signal
	 * @return {Promise<string[]>} Prefixed titles.
	 */
	async function resolveSubpages( parsed, signal ) {
		const ui = useUiStore();
		const display = parsed.title.replace( /_/g, ' ' );
		const siteinfo = await getSiteinfo( parsed.project );
		if ( !siteinfo?.namespaces ) {
			throw new Error( banana.i18n( 'api-error', 'siteinfo API' ) );
		}
		let subpages = await getSubpages(
			parsed.project, display, siteinfo.namespaces, signal
		);
		if ( subpages.length > MAX_PAGES ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n(
					'massviews-oversized-set',
					display,
					String( subpages.length ),
					MAX_PAGES,
					subpages.length
				)
			} );
			subpages = subpages.slice( 0, MAX_PAGES );
		}
		// The page itself counts too (legacy behavior).
		return [ display, ...subpages ];
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

		const isCategory = source.value === 'category';
		let parsed = null;
		if ( URL_SOURCES.includes( source.value ) ) {
			parsed = parseTargetUrl( target.value );
			if ( !parsed || ( isCategory && !parsed.category ) ) {
				status.value = 'initial';
				ui.clearMessages();
				ui.notify( {
					type: 'error',
					text: banana.i18n( isCategory ? 'invalid-category-url' : 'invalid-page-url' )
				} );
				return;
			}
			project.value = parsed.project;
			targetTitle.value = parsed.title;
			targetUrl.value = target.value;
		} else {
			const raw = target.value.trim();
			if ( source.value === 'quarry' ) {
				targetTitle.value = `Quarry ${ raw }`;
				targetUrl.value = `https://quarry.wmcloud.org/query/${ encodeURIComponent( raw ) }`;
			} else if ( source.value === 'external-link' ) {
				targetTitle.value = raw;
				targetUrl.value = `https://${ project.value }/w/index.php?title=Special:LinkSearch` +
					`&target=${ encodeURIComponent( raw ) }`;
			} else {
				// Long search queries truncate in the heading (legacy).
				targetTitle.value = raw.length > 50 ? `${ raw.slice( 0, 35 ) }…` : raw;
				targetUrl.value = `https://${ project.value }/w/index.php?title=Special:Search` +
					`&search=${ encodeURIComponent( raw ) }`;
			}
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
			const resolvers = {
				category: resolveCategory,
				wikilinks: resolveLinks,
				transclusions: resolveLinks,
				subpages: resolveSubpages,
				quarry: resolveQuarry,
				'external-link': resolveProjectQuery,
				search: resolveProjectQuery
			};
			const prefixed = await resolvers[ source.value ]( parsed, signal );
			if ( id !== loadId ) {
				return;
			}
			if ( prefixed === null ) {
				// The resolver already explained why.
				status.value = 'initial';
				return;
			}

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
		targetTitle,
		targetUrl,
		dates,
		pagesData,
		totals,
		query,
		setFromQuery,
		load,
		abort
	};
} );
