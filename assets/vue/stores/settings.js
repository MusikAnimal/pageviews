import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import {
	addMonths,
	endOfMonth,
	formatYm,
	formatYmd,
	isYm,
	isYmd,
	lastCompleteMonthUtc,
	parseDate,
	resolveSpecialRange,
	yesterdayUtc
} from '../lib/dates.js';

const DATE_PATTERN = /^\d{4}-\d{2}(-\d{2})?$/;
const DEFAULT_RANGE = 'latest-30';

/**
 * The date-range params every app shares. App-specific report params
 * (project, platform, agent, pages, sites, ...) live in each app's own
 * store; both serialize into the URL via useQuerySync.
 */
export const useSettingsStore = defineStore( 'settings', () => {
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

	// Monthly ranges are expressed as YYYY-MM everywhere, including the
	// URL (legacy-compatible). Switching the date type converts the
	// dates in place; values already in the target format are left
	// alone, keeping setFromQuery (which derives dateType from the date
	// format) idempotent. Synchronous so the dates are never observed
	// in the wrong format for the type.
	watch( dateType, ( type ) => {
		if ( type === 'monthly' ) {
			const max = lastCompleteMonthUtc();
			for ( const date of [ start, end ] ) {
				if ( isYmd( date.value ) ) {
					const parsed = parseDate( date.value );
					date.value = formatYm( parsed > max ? max : parsed );
				}
			}
			// Without daily dates to carry over, default to the past
			// six complete months.
			if ( !isYm( start.value ) || !isYm( end.value ) ) {
				start.value = formatYm( addMonths( max, -5 ) );
				end.value = formatYm( max );
			}
		} else {
			if ( isYm( start.value ) ) {
				start.value = formatYmd( parseDate( start.value ) );
			}
			if ( isYm( end.value ) ) {
				const last = endOfMonth( parseDate( end.value ) );
				const max = yesterdayUtc();
				end.value = formatYmd( last > max ? max : last );
			}
		}
	}, { flush: 'sync' } );

	/**
	 * The canonical serialized form of the shared params, for the URL query string.
	 *
	 * @type {import( 'vue' ).ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		range: specialRange.value ?? undefined,
		start: specialRange.value ? undefined : start.value || undefined,
		end: specialRange.value ? undefined : end.value || undefined
	} ) );

	/**
	 * Apply a special range name (latest-N, last-month, ...): resolves
	 * it to concrete dates — YYYY-MM in monthly mode, clamped to the
	 * last complete month — and remembers the name for the URL.
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
		if ( dateType.value === 'monthly' ) {
			const max = lastCompleteMonthUtc();
			const clamp = ( date ) => formatYm( date > max ? max : date );
			start.value = clamp( resolved.start );
			end.value = clamp( resolved.end );
		} else {
			start.value = formatYmd( resolved.start );
			end.value = formatYmd( resolved.end );
		}
		applyingRange = false;
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
	}

	return {
		start,
		end,
		dateType,
		specialRange,
		query,
		setFromQuery,
		setSpecialRange,
		ensureDefaultDates
	};
} );
