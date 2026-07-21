import { computed, ref, watch } from 'vue';
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
	 * The active special range name (e.g. 'latest-30', 'last-month'),
	 * or null when concrete dates were chosen. When set, permalinks
	 * carry `range` instead of start/end, like the legacy tool.
	 *
	 * @type {import( 'vue' ).Ref<?string>}
	 */
	const specialRange = ref( null );

	// Editing the dates directly makes the range no longer "special".
	// Synchronous so the applyingRange guard in setSpecialRange() works.
	let applyingRange = false;
	watch( [ start, end ], () => {
		if ( !applyingRange ) {
			specialRange.value = null;
		}
	}, { flush: 'sync' } );

	/**
	 * The canonical serialized form of the shared params, for the URL query string.
	 *
	 * @type {import( 'vue' ).ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		project: project.value,
		range: specialRange.value ?? undefined,
		start: specialRange.value ? undefined : start.value || undefined,
		end: specialRange.value ? undefined : end.value || undefined,
		platform: platform.value,
		agent: agent.value
	} ) );

	/**
	 * Apply a special range name (latest-N, last-month, ...): resolves
	 * it to concrete dates and remembers the name for the URL.
	 *
	 * @param {string} range
	 * @return {boolean} Whether the name was recognized.
	 */
	function setSpecialRange( range ) {
		const resolved = resolveSpecialRange( range );
		if ( !resolved ) {
			return false;
		}
		applyingRange = true;
		start.value = formatYmd( resolved.start );
		end.value = formatYmd( resolved.end );
		applyingRange = false;
		dateType.value = 'daily';
		specialRange.value = range;
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

	/**
	 * Populate the store from URL query params. Invalid values are ignored,
	 * leaving the current (or default) values in place.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( params.project ) {
			project.value = params.project;
		}
		if ( params.range ) {
			// e.g. ?range=latest-20, kept in permalinks (like the
			// legacy tool) and resolved to concrete dates on load.
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
		specialRange,
		query,
		setFromQuery,
		setSpecialRange,
		ensureDefaultDates
	};
} );
