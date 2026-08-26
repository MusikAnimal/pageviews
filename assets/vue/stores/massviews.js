import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchCategoryMembers, fetchHashtagPages, fetchPageviews, trimIncompleteTail } from '../lib/metricsApi.js';
import {
	getExternalLinkUsage,
	getSearchResults,
	getSubpages,
	getTranscludedIn,
	getWikilinks
} from '../lib/mwApi.js';
import { getQuarryTitles } from '../lib/quarry.js';
import { getProjects, getSiteinfo } from '../projects.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const SOURCES = [
	'category', 'wikilinks', 'subpages', 'transclusions',
	'quarry', 'hashtag', 'external-link', 'search'
];
// Sources whose target is a full page URL (the project comes from it)…
const URL_SOURCES = [ 'category', 'wikilinks', 'subpages', 'transclusions' ];
// …versus sources needing an explicit project alongside the target.
// (Hashtag is neither: its results carry their own wiki per page.)
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
	 * Filter the results to one namespace: 'all', or a namespace ID
	 * as a string. Matched by title prefix, per wiki.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const namespace = ref( 'all' );
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
	 * Per-page rows: { title, project, counts, sum, average }. Titles
	 * carry their localized namespace prefix, with spaces. The project
	 * matters for the hashtag source, whose pages span wikis.
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
		source: source.value,
		target: target.value || undefined,
		project: PROJECT_SOURCES.includes( source.value ) ? project.value : undefined,
		platform: platform.value,
		agent: agent.value,
		subjectpage: subjectpage.value,
		subcategories: subcategories.value,
		namespace: namespace.value === 'all' ? undefined : namespace.value,
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
		if ( params.namespace !== undefined && /^(all|\d+)$/.test( params.namespace ) ) {
			namespace.value = params.namespace;
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
	 * Resolve the hashtag to the pages carrying it in an edit summary,
	 * across all wikis.
	 *
	 * @param {Object} parsed Unused (no URL to parse).
	 * @param {AbortSignal} signal
	 * @return {Promise<?Array<{project: string, title: string}>>}
	 *   Pages, or null to bail (a message has been shown).
	 */
	async function resolveHashtag( parsed, signal ) {
		const ui = useUiStore();
		const { pages } = await fetchHashtagPages( {
			tag: target.value.trim().replace( /^#/, '' ),
			signal
		} );
		if ( !pages.length ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-empty-set', targetTitle.value )
			} );
			return null;
		}
		if ( pages.length > MAX_PAGES ) {
			ui.notify( {
				type: 'warning',
				text: banana.i18n(
					'massviews-oversized-set',
					targetTitle.value,
					String( pages.length ),
					MAX_PAGES,
					pages.length
				)
			} );
			return pages.slice( 0, MAX_PAGES );
		}
		return pages;
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
	 * @return {Promise<?Array>} Prefixed titles (transclusions), or
	 *   { project, title } pages (wikilinks, which include interwiki
	 *   links to other wikis); null to bail (a message has been shown).
	 */
	async function resolveLinks( parsed, signal ) {
		const ui = useUiStore();
		const display = parsed.title.replace( /_/g, ' ' );
		const resolver = source.value === 'wikilinks' ? getWikilinks : getTranscludedIn;
		let titles = await resolver( parsed.project, display, signal );
		if ( titles !== null && source.value === 'wikilinks' ) {
			// Interwiki links can point anywhere (including wikis the
			// pageviews API has no data for) and can duplicate local
			// links: keep the supported wikis, once each.
			const projects = await getProjects();
			const seen = new Set();
			titles = titles.filter( ( page ) => {
				const key = `${ page.project }|${ page.title }`;
				if ( seen.has( key ) || !projects[ page.project.replace( /\.org$/, '' ) ] ) {
					return false;
				}
				seen.add( key );
				return true;
			} );
		}
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
		const started = performance.now();
		elapsedTime.value = null;

		if ( !target.value ) {
			status.value = 'initial';
			dates.value = [];
			pagesData.value = [];
			totals.value = null;
			incompleteDate.value = null;
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
			} else if ( source.value === 'hashtag' ) {
				const tag = raw.replace( /^#/, '' );
				targetTitle.value = `#${ tag }`;
				targetUrl.value = `https://hashtags.wmcloud.org/?query=${ encodeURIComponent( tag ) }`;
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
				hashtag: resolveHashtag,
				'external-link': resolveProjectQuery,
				search: resolveProjectQuery
			};
			const resolved = await resolvers[ source.value ]( parsed, signal );
			if ( id !== loadId ) {
				return;
			}
			if ( resolved === null ) {
				// The resolver already explained why.
				status.value = 'initial';
				return;
			}

			// Hashtag pages carry their own wiki; every other source's
			// titles all live on the target's project. Group by project
			// and query each group, sequentially so the progress bar
			// (in pages, approximated within a group's chunks) stays
			// monotonic.
			let pages = [ 'hashtag', 'wikilinks' ].includes( source.value ) ?
				resolved :
				resolved.map( ( title ) => ( { project: project.value, title } ) );
			if ( namespace.value !== 'all' ) {
				pages = await filterByNamespace( pages, Number( namespace.value ) );
				if ( id !== loadId ) {
					return;
				}
				if ( !pages.length ) {
					status.value = 'initial';
					ui.notify( {
						type: 'warning',
						text: banana.i18n(
							'massviews-empty-set', targetTitle.value.replace( /_/g, ' ' )
						)
					} );
					return;
				}
			}
			const groups = new Map();
			for ( const page of pages ) {
				if ( !groups.has( page.project ) ) {
					groups.set( page.project, [] );
				}
				groups.get( page.project ).push( page.title );
			}

			let axis = null;
			let combined = null;
			const rows = [];
			let done = 0;
			for ( const [ pagesProject, titles ] of groups ) {
				const doneBefore = done;
				const result = await fetchPageviews( {
					project: pagesProject,
					pages: titles,
					start: settings.start,
					end: settings.end,
					platform: platform.value,
					agent: agent.value,
					granularity: settings.dateType,
					onProgress: ( chunksDone, chunksTotal ) => ui.setProgress(
						doneBefore + Math.round( ( titles.length * chunksDone ) / chunksTotal ),
						pages.length
					),
					signal
				} );
				if ( id !== loadId ) {
					return;
				}
				axis ??= result.dates;
				combined ??= axis.map( () => 0 );
				// Chunks preserve request order, so rows align by index.
				for ( const [ i, series ] of result.pages.entries() ) {
					for ( const [ j, count ] of series.counts.entries() ) {
						combined[ j ] += count;
					}
					rows.push( {
						title: titles[ i ].replace( /_/g, ' ' ),
						project: pagesProject,
						counts: series.counts,
						sum: series.total,
						average: series.average
					} );
				}
				done += titles.length;
			}
			pagesData.value = rows;
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
			pagesData.value = trimmed?.series ?? rows;
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
	 * The namespace a title's prefix denotes on the given wiki, from
	 * its localized or canonical name. No colon, or an unknown
	 * prefix, means mainspace.
	 *
	 * @param {string} title
	 * @param {Object} namespaces From siteinfo.
	 * @return {number}
	 */
	function titleNamespace( title, namespaces ) {
		const colon = title.indexOf( ':' );
		if ( colon > 0 ) {
			const prefix = title.slice( 0, colon ).replace( /_/g, ' ' ).toLowerCase();
			for ( const [ id, ns ] of Object.entries( namespaces ) ) {
				if ( [ ns[ '*' ], ns.canonical ].some(
					( name ) => name && name.toLowerCase() === prefix
				) ) {
					return Number( id );
				}
			}
		}
		return 0;
	}

	/**
	 * Keep only the pages in the wanted namespace, judged by title
	 * prefix against each page's own wiki (hashtag and wikilink
	 * results span projects). A wiki whose siteinfo cannot be fetched
	 * keeps its pages rather than silently dropping them.
	 *
	 * @param {Array<{project: string, title: string}>} pages
	 * @param {number} wanted
	 * @return {Promise<Array<{project: string, title: string}>>}
	 */
	async function filterByNamespace( pages, wanted ) {
		const projects = [ ...new Set( pages.map( ( page ) => page.project ) ) ];
		const infos = new Map( await Promise.all( projects.map(
			async ( domain ) => [ domain, await getSiteinfo( domain ) ]
		) ) );
		return pages.filter( ( page ) => {
			const namespaces = infos.get( page.project )?.namespaces;
			return !namespaces || titleNamespace( page.title, namespaces ) === wanted;
		} );
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
		namespace,
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
		incompleteDate,
		elapsedTime,
		query,
		setFromQuery,
		load,
		abort
	};
} );
