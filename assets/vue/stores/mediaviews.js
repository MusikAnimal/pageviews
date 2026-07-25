import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchCommonsCategory, fetchMediarequests, trimIncompleteTail } from '../lib/metricsApi.js';
import { getFileInfo } from '../lib/mwApi.js';
import { formatYm, lastCompleteMonthUtc } from '../lib/dates.js';
import { banana } from '../i18n.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const REFERERS = [ 'all-referers', 'internal', 'external', 'search-engine', 'unknown', 'none' ];
// The mediarequests data has no 'automated' agent breakdown.
const AGENTS = [ 'all-agents', 'user', 'spider' ];

export const MAX_FILES = 10;

const SOURCES = [ 'files', 'categories' ];
export const MAX_CATEGORIES = 10;
const SCOPES = [ 'deep', 'shallow' ];
// The Commons Impact Metrics dataset (the categories source) begins here.
export const COMMONS_METRICS_MIN_MONTH = '2023-01';
// Default span for the monthly categories source: a year of months.
const DEFAULT_MONTH_SPAN = 12;

export const useMediaviewsStore = defineStore( 'mediaviews', () => {
	/**
	 * The file names to query for, without the File: prefix
	 * (underscored, matching the legacy URL structure).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const files = ref( [] );
	/**
	 * What to analyze: mediarequests per file, or (via Commons Impact
	 * Metrics) pageviews of the pages using media from a category.
	 *
	 * @type {import('vue').Ref<'files'|'categories'>}
	 */
	const source = ref( 'files' );
	/**
	 * The Commons categories (categories source), without the
	 * namespace prefix (underscored, pipe-delimited in the URL like
	 * the files).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const categories = ref( [] );
	/**
	 * 'deep' includes all subcategories; 'shallow' the category alone.
	 *
	 * @type {import('vue').Ref<'deep'|'shallow'>}
	 */
	const scope = ref( 'deep' );
	/**
	 * The wiki whose pageviews to count (categories source): a project
	 * domain, or 'all-wikis'.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const wiki = ref( 'all-wikis' );
	/**
	 * The project whose file pages to search (the mediarequest counts
	 * themselves are global, keyed by upload.wikimedia path).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const project = ref( 'commons.wikimedia.org' );
	/**
	 * @type {import('vue').Ref<string>} AQS referer class.
	 */
	const referer = ref( 'all-referers' );
	/**
	 * @type {import('vue').Ref<'all-agents'|'user'|'spider'>}
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
	 * Per-file series: { name, counts, total, average, no_data? }.
	 *
	 * @type {import('vue').Ref<Array<Object>>}
	 */
	const series = ref( [] );
	/**
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );
	/**
	 * File metadata from imageinfo (path, mediatype, size, duration,
	 * upload timestamp), keyed by file name with spaces. null until
	 * loaded.
	 *
	 * @type {import('vue').Ref<?Object>}
	 */
	const fileInfo = ref( null );
	/**
	 * One-shot signal: the trailing date dropped because its data
	 * hasn't been published yet (see trimIncompleteTail).
	 *
	 * @type {import('vue').Ref<?string>}
	 */
	const incompleteDate = ref( null );

	const settings = useSettingsStore();

	// Guards against out-of-order responses from overlapping loads.
	let loadId = 0;
	// Cancels the previous cycle's requests whenever a new one starts.
	const aborter = createLoadAborter();
	// What abort() returns the app to.
	let statusBeforeLoad = 'initial';

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Files are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => source.value === 'categories' ?
		{
			source: 'categories',
			categories: categories.value.join( '|' ) || undefined,
			scope: scope.value,
			wiki: wiki.value,
			autolog: autolog.value ? undefined : 'false'
		} :
		// The files source keeps the legacy URL structure (no source
		// param).
		{
			files: files.value.join( '|' ) || undefined,
			project: project.value,
			referer: referer.value,
			agent: agent.value,
			autolog: autolog.value ? undefined : 'false'
		} );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( SOURCES.includes( params.source ) ) {
			source.value = params.source;
		}
		if ( params.categories !== undefined ) {
			const names = params.categories.split( '|' )
				.filter( ( name ) => name !== '' )
				.slice( 0, MAX_CATEGORIES );
			// Keep the array identity when unchanged (see the
			// pageviews store).
			if ( names.join( '|' ) !== categories.value.join( '|' ) ) {
				categories.value = names;
			}
		}
		if ( SCOPES.includes( params.scope ) ) {
			scope.value = params.scope;
		}
		if ( params.wiki ) {
			wiki.value = params.wiki;
		}
		if ( params.project ) {
			project.value = params.project;
		}
		if ( REFERERS.includes( params.referer ) ) {
			referer.value = params.referer;
		}
		if ( AGENTS.includes( params.agent ) ) {
			agent.value = params.agent;
		} else if ( params.agent === 'all' ) {
			agent.value = 'all-agents';
		}
		if ( params.files ) {
			const names = params.files.split( '|' )
				.filter( ( name ) => name !== '' )
				.slice( 0, MAX_FILES );
			// Keep the array identity when unchanged (see the
			// pageviews store).
			if ( names.join( '|' ) !== files.value.join( '|' ) ) {
				files.value = names;
			}
		}
		autolog.value = params.autolog !== 'false';
	}

	/**
	 * The categories source only has monthly data: force the shared
	 * date params into month form and default to the last complete
	 * year. Called by the Settings component and loadCategory().
	 */
	function ensureMonthlyDefaults() {
		settings.dateType = 'monthly';
		// Day-precision values (e.g. carried over from the files
		// source) truncate to their month.
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
	 * One aggregate request per category (no per-page fan-out):
	 * monthly views of the pages using media from each category.
	 * Categories the dataset doesn't know get a message each and are
	 * dropped, like missing files.
	 */
	async function loadCategories() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests.
		const signal = aborter.next();

		if ( !categories.value.length ) {
			status.value = 'initial';
			dates.value = [];
			series.value = [];
			totals.value = null;
			fileInfo.value = null;
			incompleteDate.value = null;
			// A cleared input also clears lingering errors.
			ui.clearMessages();
			return;
		}

		ensureMonthlyDefaults();
		statusBeforeLoad = status.value === 'loading' ? statusBeforeLoad : status.value;
		status.value = 'loading';
		ui.clearMessages();

		const results = await Promise.all( categories.value.map( ( name ) => fetchCommonsCategory( {
			category: name,
			scope: scope.value,
			wiki: wiki.value,
			start: settings.start,
			end: settings.end,
			signal
		} ).then(
			( result ) => ( { name, result } ),
			( error ) => ( { name, error } )
		)
		) );
		if ( id !== loadId ) {
			return;
		}

		for ( const { name, error } of results.filter( ( entry ) => entry.error ) ) {
			ui.notify( {
				type: 'error',
				text: `${ name.replace( /_/g, ' ' ) }: ${
					error.i18n?.length ? banana.i18n( ...error.i18n ) : error.message }`
			} );
		}

		const successes = results.filter( ( entry ) => entry.result );
		if ( !successes.length ) {
			status.value = 'initial';
			dates.value = [];
			series.value = [];
			totals.value = null;
			return;
		}

		const axis = successes[ 0 ].result.dates;
		const combined = axis.map( () => 0 );
		series.value = successes.map( ( { name, result } ) => {
			result.counts.forEach( ( count, i ) => {
				combined[ i ] += count;
			} );
			return {
				name: name.replace( /_/g, ' ' ),
				counts: result.counts,
				total: result.total,
				average: result.average
			};
		} );
		dates.value = axis;
		const total = combined.reduce( ( a, b ) => a + b, 0 );
		totals.value = {
			counts: combined,
			total,
			average: Math.round( ( total / axis.length ) * 100 ) / 100
		};
		fileInfo.value = null;
		incompleteDate.value = null;
		status.value = 'complete';
	}

	/**
	 * Fetch the data for the current params and source.
	 *
	 * @return {Promise}
	 */
	async function load() {
		if ( source.value === 'categories' ) {
			return loadCategories();
		}
		return loadFiles();
	}

	/**
	 * Fetch the mediarequest counts: resolve the file names to
	 * upload.wikimedia paths via imageinfo (dropping files that don't
	 * exist, with a message each), then query the batch endpoint.
	 */
	async function loadFiles() {
		const ui = useUiStore();
		const id = ++loadId;
		// A new cycle always cancels the previous one's requests —
		// including the reset cycle from a cleared form.
		const signal = aborter.next();

		if ( !files.value.length ) {
			status.value = 'initial';
			dates.value = [];
			series.value = [];
			totals.value = null;
			fileInfo.value = null;
			incompleteDate.value = null;
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
			const info = await getFileInfo( project.value, files.value, signal );
			if ( id !== loadId ) {
				return;
			}
			fileInfo.value = info;

			// Resolve names to paths, dropping missing files.
			const resolved = [];
			for ( const name of files.value ) {
				const entry = info[ name.replace( /_/g, ' ' ) ];
				if ( !entry || entry.missing || !entry.path ) {
					ui.notify( {
						type: 'error',
						text: `${ name.replace( /_/g, ' ' ) }: ${ banana.i18n( 'api-error-no-data' ) }`
					} );
					continue;
				}
				resolved.push( { name: name.replace( /_/g, ' ' ), path: entry.path } );
			}
			if ( !resolved.length ) {
				status.value = 'initial';
				dates.value = [];
				series.value = [];
				totals.value = null;
				return;
			}

			const result = await fetchMediarequests( {
				files: resolved.map( ( file ) => file.path ),
				start: settings.start,
				end: settings.end,
				referer: referer.value,
				agent: agent.value,
				granularity: settings.dateType,
				signal
			} );
			if ( id !== loadId ) {
				return;
			}

			// Key the series by file name rather than path.
			const named = result.files.map( ( file, i ) => ( {
				...file,
				name: resolved[ i ].name
			} ) );
			const trimmed = trimIncompleteTail( {
				dates: result.dates,
				series: named,
				totals: result.totals
			} );
			incompleteDate.value = trimmed?.trimmedDate ?? null;
			dates.value = trimmed?.dates ?? result.dates;
			series.value = trimmed?.series ?? named;
			totals.value = trimmed?.totals ?? result.totals;
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
		files,
		source,
		categories,
		scope,
		wiki,
		project,
		referer,
		agent,
		autolog,
		status,
		dates,
		series,
		totals,
		fileInfo,
		incompleteDate,
		query,
		setFromQuery,
		ensureMonthlyDefaults,
		load,
		abort
	};
} );
