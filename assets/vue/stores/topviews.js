import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchEditData, fetchPageviews, fetchTopviews } from '../lib/metricsApi.js';
import { findNonMainspace } from '../lib/mainspace.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { promisePool } from '../lib/queue.js';
import {
	formatYm,
	formatYmd,
	lastCompleteMonthUtc,
	yesterdayUtc
} from '../lib/dates.js';
import { banana } from '../i18n.js';
import { useUiStore } from './ui.js';

const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
export const PAGE_SIZE = 100;
// The replica-backed edits endpoint runs one query per page: small
// batches keep individual requests fast (legacy used 10 as well).
const EDIT_CHUNK = 10;
const EDIT_CONCURRENCY = 2;

export const useTopviewsStore = defineStore( 'topviews', () => {
	/**
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( 'en.wikipedia.org' );
	/**
	 * @type {import('vue').Ref<'all-access'|'desktop'|'mobile-app'|'mobile-web'>}
	 */
	const platform = ref( 'all-access' );
	/**
	 * The concrete date: YYYY-MM-DD (daily), YYYY-MM (monthly) or
	 * YYYY (yearly). Defaults to the last complete month.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const date = ref( '' );
	/**
	 * User-excluded pages (spaces; underscored and pipe-delimited in
	 * the URL, like the legacy tool).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const excludes = ref( [] );
	/**
	 * Whether to show only mainspace pages (legacy default on).
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const mainspace = ref( true );
	/**
	 * The opt-in % Mobile column (mobileviews URL param). Forced on
	 * for yearly, whose datasets bake the percentages in.
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const showMobile = ref( false );
	/**
	 * @type {import('vue').Ref<'initial'|'loading'|'complete'|'error'>}
	 */
	const status = ref( 'initial' );
	/**
	 * The full list from the server: { article, views, rank,
	 * mobile_percentage? }, curated excludes already applied.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const articles = ref( [] );
	/**
	 * The known false positives the server dropped, with their
	 * original positions.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const serverExcluded = ref( [] );
	/**
	 * Titles the mainspace filter drops (site-specific heuristics).
	 *
	 * @type {import('vue').Ref<Set<string>>}
	 */
	const nonMainspace = ref( new Set() );
	/**
	 * How many (filtered) entries are shown; grows via showMore().
	 *
	 * @type {import('vue').Ref<number>}
	 */
	const offset = ref( PAGE_SIZE );
	/**
	 * Client-side filter over the whole list. Kept in the URL so
	 * permalinks reproduce the filtered view.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const search = ref( '' );
	/**
	 * Edit counts per article from the replica endpoint, filled in for
	 * the visible entries: { num_edits, num_users }.
	 *
	 * @type {import('vue').Ref<Object>}
	 */
	const editData = ref( {} );
	/**
	 * Combined mobile-web + mobile-app views per visible article, for
	 * the % Mobile column.
	 *
	 * @type {import('vue').Ref<Object>}
	 */
	const mobileViews = ref( {} );

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;
	// Cancels the previous cycle's requests whenever a new one starts.
	const aborter = createLoadAborter();
	// The current cycle's signal, reused by the lazy enrichment.
	let currentSignal = null;
	// What abort() returns the app to.
	let statusBeforeLoad = 'initial';

	/**
	 * @type {import('vue').ComputedRef<'daily'|'monthly'|'yearly'>}
	 */
	const dateType = computed( () => {
		if ( /^\d{4}$/.test( date.value ) ) {
			return 'yearly';
		}
		return /^\d{4}-\d{2}-\d{2}$/.test( date.value ) ? 'daily' : 'monthly';
	} );

	/**
	 * The % Mobile column applies when explicitly enabled on
	 * all-access data, and always for yearly (baked into the
	 * datasets).
	 *
	 * @type {import('vue').ComputedRef<boolean>}
	 */
	const shouldShowMobile = computed(
		() => dateType.value === 'yearly' ||
			( showMobile.value && platform.value === 'all-access' )
	);

	/**
	 * The list after the client-side filters (mainspace, user
	 * excludes), reranked sequentially.
	 *
	 * @type {import('vue').ComputedRef<Array<Object>>}
	 */
	const pageData = computed( () => {
		let rank = 0;
		const hidden = ( entry ) => (
			( mainspace.value && nonMainspace.value.has( entry.article ) ) ||
			excludes.value.includes( entry.article )
		);
		return articles.value
			.filter( ( entry ) => !hidden( entry ) )
			.map( ( entry ) => ( { ...entry, rank: ++rank } ) );
	} );

	/**
	 * What the table shows: the paginated list, or every match while
	 * searching (ranks kept from the full list, like the legacy tool).
	 *
	 * @type {import('vue').ComputedRef<Array<Object>>}
	 */
	const displayed = computed( () => {
		if ( search.value ) {
			const needle = search.value.toLowerCase();
			return pageData.value.filter(
				( entry ) => entry.article.toLowerCase().includes( needle )
			);
		}
		return pageData.value.slice( 0, offset.value );
	} );

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		project: project.value,
		platform: platform.value,
		date: date.value || undefined,
		excludes: excludes.value.map( ( title ) => title.replace( / /g, '_' ) ).join( '|' ) ||
			undefined,
		mainspace: mainspace.value ? undefined : 'false',
		mobileviews: showMobile.value && platform.value === 'all-access' &&
			dateType.value !== 'yearly' ? 'true' : undefined,
		search: search.value || undefined
	} ) );

	/**
	 * Resolve a date URL param — a concrete date or a legacy special
	 * range name — to the concrete form.
	 *
	 * @param {string} value
	 * @return {?string}
	 */
	function resolveDate( value ) {
		if ( value === 'last-month' ) {
			return formatYm( lastCompleteMonthUtc() );
		}
		if ( value === 'yesterday' ) {
			return formatYmd( yesterdayUtc() );
		}
		if ( value === 'last-year' ) {
			return String( new Date().getUTCFullYear() - 1 );
		}
		return /^\d{4}(-\d{2}(-\d{2})?)?$/.test( value ) ? value : null;
	}

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
		if ( params.date ) {
			const resolved = resolveDate( params.date );
			if ( resolved && resolved !== date.value ) {
				date.value = resolved;
			}
		}
		if ( params.excludes !== undefined ) {
			const titles = params.excludes.split( '|' )
				.filter( ( title ) => title !== '' )
				.map( ( title ) => title.replace( /_/g, ' ' ) );
			if ( titles.join( '|' ) !== excludes.value.join( '|' ) ) {
				excludes.value = titles;
			}
		}
		if ( params.mainspace !== undefined ) {
			mainspace.value = params.mainspace !== 'false';
		}
		if ( params.mobileviews ) {
			showMobile.value = true;
		}
		if ( params.search !== undefined && params.search !== search.value ) {
			search.value = params.search;
		}
	}

	/**
	 * The period the selected date covers, for the enrichment queries
	 * and the per-page Pageviews links.
	 *
	 * @return {[string, string]} [ start, end ] as YYYY-MM-DD.
	 */
	function periodDates() {
		if ( dateType.value === 'daily' ) {
			return [ date.value, date.value ];
		}
		if ( dateType.value === 'yearly' ) {
			return [ `${ date.value }-01-01`, `${ date.value }-12-31` ];
		}
		const [ year, month ] = date.value.split( '-' ).map( Number );
		const lastDay = new Date( Date.UTC( year, month, 0 ) ).getUTCDate();
		return [ `${ date.value }-01`, `${ date.value }-${ String( lastDay ).padStart( 2, '0' ) }` ];
	}

	/**
	 * Lazily fetch edit counts and mobile views for the entries
	 * currently in view, skipping what's cached. Non-fatal: missing
	 * enrichment renders as "?".
	 */
	async function ensureEnrichment() {
		const signal = currentSignal ?? aborter.next();
		const [ start, end ] = periodDates();
		const rows = pageData.value.slice( 0, offset.value );

		const needEdits = rows
			.map( ( entry ) => entry.article )
			.filter( ( article ) => !( article in editData.value ) );
		const editChunks = [];
		for ( let i = 0; i < needEdits.length; i += EDIT_CHUNK ) {
			editChunks.push( needEdits.slice( i, i + EDIT_CHUNK ) );
		}
		// Deliberately not awaited before the mobile fetch; both fill
		// in as they arrive.
		promisePool( editChunks, ( chunk ) => fetchEditData( {
			project: project.value,
			pages: chunk,
			start,
			end,
			signal
		} ).then(
			( result ) => {
				editData.value = { ...editData.value, ...result.pages };
			},
			() => {
				// Mark as attempted so it renders as "?" and isn't
				// refetched on every toggle.
				const failed = {};
				for ( const article of chunk ) {
					failed[ article ] = null;
				}
				editData.value = { ...failed, ...editData.value };
			}
		), { concurrency: EDIT_CONCURRENCY } );

		if ( !shouldShowMobile.value || dateType.value === 'yearly' ) {
			return;
		}
		const needMobile = rows
			.map( ( entry ) => entry.article )
			.filter( ( article ) => !( article in mobileViews.value ) );
		const mobileChunks = [];
		for ( let i = 0; i < needMobile.length; i += EDIT_CHUNK ) {
			mobileChunks.push( needMobile.slice( i, i + EDIT_CHUNK ) );
		}
		// Chunked like the edit data, so the column fills in row by row
		// rather than all at once when the last request lands.
		await promisePool( mobileChunks, async ( chunk ) => {
			const results = await Promise.all( [ 'mobile-web', 'mobile-app' ].map(
				( mobilePlatform ) => fetchPageviews( {
					project: project.value,
					pages: chunk,
					start,
					end,
					platform: mobilePlatform,
					agent: 'user',
					granularity: dateType.value === 'monthly' ? 'monthly' : 'daily',
					signal
				} ).catch( () => null )
			) );
			if ( signal.aborted ) {
				return;
			}
			const combined = {};
			for ( const result of results.filter( Boolean ) ) {
				for ( const page of result.pages ) {
					const article = page.title.replace( /_/g, ' ' );
					combined[ article ] = ( combined[ article ] ?? 0 ) + page.total;
				}
			}
			mobileViews.value = { ...mobileViews.value, ...combined };
		}, { concurrency: EDIT_CONCURRENCY } );
	}

	/**
	 * Fetch the top list for the current params, then enrich the first
	 * page of entries.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests.
		const signal = aborter.next();
		currentSignal = signal;

		if ( !date.value ) {
			date.value = formatYm( lastCompleteMonthUtc() );
		}

		statusBeforeLoad = status.value === 'loading' ? statusBeforeLoad : status.value;
		status.value = 'loading';
		ui.clearMessages();
		editData.value = {};
		mobileViews.value = {};
		offset.value = PAGE_SIZE;

		// Dev aid; see the pageviews store.
		if (
			import.meta.env.MODE !== 'test' &&
			import.meta.env.VITE_SIMULATE_LOADING === '1'
		) {
			ui.setProgress( 2, 5 );
			return;
		}

		try {
			const result = await fetchTopviews( {
				project: project.value,
				date: date.value,
				platform: dateType.value === 'yearly' ? 'all-access' : platform.value,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}
			articles.value = result.articles;
			serverExcluded.value = result.excluded ?? [];
			nonMainspace.value = await findNonMainspace(
				project.value,
				result.articles.map( ( entry ) => entry.article ),
				signal
			);
			if ( id !== loadId ) {
				return;
			}
			if ( !result.articles.length ) {
				ui.notify( { type: 'warning', text: banana.i18n( 'api-error-no-data' ) } );
			}
			status.value = 'complete';
			// Fire-and-forget: the table renders now, the edit/mobile
			// cells fill in as they arrive.
			ensureEnrichment();
		} catch ( error ) {
			if ( id !== loadId ) {
				return;
			}
			// A fatal error acts like the Abort button: the pool has
			// stopped queuing chunks, and this cancels the in-flight
			// ones. (User aborts bump loadId, so they never get here.)
			aborter.abort();
			status.value = 'error';
			articles.value = [];
			serverExcluded.value = [];
			ui.notify( {
				type: 'error',
				text: error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message,
				onRetry: error.retryable === false ? undefined : load
			} );
		}
	}

	/**
	 * Reveal the next page of entries and enrich them.
	 */
	function showMore() {
		offset.value += PAGE_SIZE;
		ensureEnrichment();
	}

	/**
	 * Cancel the in-flight load (the overlay's Abort button): kills the
	 * requests and returns to the pre-submission state; the bumped
	 * loadId drops anything that already settled.
	 */
	function abort() {
		loadId++;
		aborter.abort();
		currentSignal = null;
		status.value = statusBeforeLoad;
		useUiStore().clearProgress();
	}

	return {
		project,
		platform,
		date,
		dateType,
		excludes,
		mainspace,
		showMobile,
		shouldShowMobile,
		status,
		articles,
		serverExcluded,
		offset,
		search,
		editData,
		mobileViews,
		pageData,
		displayed,
		query,
		setFromQuery,
		periodDates,
		ensureEnrichment,
		load,
		showMore,
		abort
	};
} );
