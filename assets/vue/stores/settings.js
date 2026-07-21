import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { formatYmd, resolveSpecialRange } from '../lib/dates.js';

const PLATFORMS = [ 'all', 'desktop', 'mobile-app', 'mobile-web' ];
const AGENTS = [ 'all', 'user', 'spider', 'automated' ];
const DATE_PATTERN = /^\d{4}-\d{2}(-\d{2})?$/;
const DEFAULT_RANGE = 'latest-30';

export const useSettingsStore = defineStore( 'settings', () => {
	/**
	 * The Wikimedia project to query for data.
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const project = ref( 'en.wikipedia.org' );
	/**
	 * The start date for the data query, either in YYYY-MM-DD format (daily)
	 * or in YYYY-MM format (monthly).
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const start = ref( '' );
	/**
	 * The end date for the data query, either in YYYY-MM-DD format (daily)
	 * or in YYYY-MM format (monthly).
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const end = ref( '' );
	/**
	 * The type of date range to query for, either 'daily' or 'monthly'.
	 *
	 * @type {import( 'vue' ).Ref<'daily'|'monthly'>}
	 */
	const dateType = ref( 'daily' );
	/**
	 * The platform to query for.
	 *
	 * @type {import( 'vue' ).Ref<'all'|'desktop'|'mobile-app'|'mobile-web'>}
	 */
	const platform = ref( 'all' );
	/**
	 * The agent to query for.
	 *
	 * @type {import( 'vue' ).Ref<'all'|'user'|'spider'|'automated'>}
	 */
	const agent = ref( 'user' );

	/**
	 * The canonical serialized form of the shared params, for the URL query string.
	 *
	 * @type {import( 'vue' ).ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		project: project.value,
		start: start.value || undefined,
		end: end.value || undefined,
		platform: platform.value,
		agent: agent.value
	} ) );

	/**
	 * Populate the store from URL query params. Invalid values are ignored,
	 * leaving the current (or default) values in place.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	/**
	 * Resolve a legacy special range name (latest-N, last-month, ...)
	 * into concrete start/end dates.
	 *
	 * @param {string} range
	 * @return {boolean} Whether the name was recognized.
	 */
	function setSpecialRange( range ) {
		const resolved = resolveSpecialRange( range );
		if ( !resolved ) {
			return false;
		}
		start.value = formatYmd( resolved.start );
		end.value = formatYmd( resolved.end );
		dateType.value = 'daily';
		return true;
	}

	/**
	 * Apply the default date range if none is set yet. Called before
	 * the first data load.
	 */
	function ensureDefaultDates() {
		if ( !start.value || !end.value ) {
			setSpecialRange( DEFAULT_RANGE );
		}
	}

	function setFromQuery( params ) {
		if ( params.project ) {
			project.value = params.project;
		}
		if ( params.range ) {
			// Legacy URLs use e.g. ?range=latest-20. Resolved to
			// concrete dates; permalinks re-serialize as start/end.
			setSpecialRange( params.range );
		}
		if ( params.start && DATE_PATTERN.test( params.start ) ) {
			start.value = params.start;
		}
		if ( params.end && DATE_PATTERN.test( params.end ) ) {
			end.value = params.end;
		}
		if ( start.value ) {
			// Monthly ranges are expressed as YYYY-MM dates.
			dateType.value = start.value.length === 7 ? 'monthly' : 'daily';
		}
		if ( PLATFORMS.includes( params.platform ) ) {
			platform.value = params.platform;
		}
		if ( AGENTS.includes( params.agent ) ) {
			agent.value = params.agent;
		}
	}

	return {
		project,
		start,
		end,
		dateType,
		platform,
		agent,
		query,
		setFromQuery,
		setSpecialRange,
		ensureDefaultDates
	};
} );
