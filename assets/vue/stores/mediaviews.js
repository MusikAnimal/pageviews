import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchMediarequests, trimIncompleteTail } from '../lib/metricsApi.js';
import { getFileInfo } from '../lib/mwApi.js';
import { banana } from '../i18n.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';

const REFERERS = [ 'all-referers', 'internal', 'external', 'search-engine', 'unknown', 'none' ];
// The mediarequests data has no 'automated' agent breakdown.
const AGENTS = [ 'all-agents', 'user', 'spider' ];

export const MAX_FILES = 10;

export const useMediaviewsStore = defineStore( 'mediaviews', () => {
	/**
	 * The file names to query for, without the File: prefix
	 * (underscored, matching the legacy URL structure).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const files = ref( [] );
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

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Files are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		files: files.value.join( '|' ) || undefined,
		project: project.value,
		referer: referer.value,
		agent: agent.value,
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
	 * Fetch the mediarequest counts: resolve the file names to
	 * upload.wikimedia paths via imageinfo (dropping files that don't
	 * exist, with a message each), then query the batch endpoint.
	 */
	async function load() {
		const ui = useUiStore();
		const id = ++loadId;

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
			const info = await getFileInfo( project.value, files.value );
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
				granularity: settings.dateType
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

	return {
		files,
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
		load
	};
} );
