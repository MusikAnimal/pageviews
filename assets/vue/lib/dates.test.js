import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	addDays,
	addMonths,
	endOfMonth,
	formatYm,
	formatYmd,
	isYm,
	isYmd,
	lastCompleteMonthUtc,
	parseDate,
	resolveSpecialRange,
	startOfWeek,
	yesterdayUtc
} from './dates.js';

describe( 'dates', () => {
	beforeEach( () => {
		vi.useFakeTimers();
		// A Tuesday. UTC throughout.
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );
	} );

	afterEach( () => {
		vi.useRealTimers();
	} );

	it( 'validates date strings', () => {
		expect( isYmd( '2026-07-21' ) ).toBe( true );
		expect( isYmd( '2026-07' ) ).toBe( false );
		expect( isYm( '2026-07' ) ).toBe( true );
		expect( isYm( 'yesterday' ) ).toBe( false );
	} );

	it( 'parses days and months as UTC', () => {
		expect( formatYmd( parseDate( '2026-07-21' ) ) ).toBe( '2026-07-21' );
		expect( formatYmd( parseDate( '2026-07' ) ) ).toBe( '2026-07-01' );
		expect( parseDate( 'nonsense' ) ).toBeNull();
	} );

	it( 'does date arithmetic across boundaries', () => {
		expect( formatYmd( addDays( parseDate( '2026-01-01' ), -1 ) ) ).toBe( '2025-12-31' );
		expect( formatYm( addMonths( parseDate( '2026-01-15' ), -2 ) ) ).toBe( '2025-11' );
		expect( formatYmd( endOfMonth( parseDate( '2024-02-10' ) ) ) ).toBe( '2024-02-29' );
	} );

	it( 'computes the last complete month, lagging two days', () => {
		// July 21: June data has long landed.
		expect( formatYm( lastCompleteMonthUtc() ) ).toBe( '2026-06' );
		// July 2: June's monthly total isn't published yet.
		vi.setSystemTime( new Date( '2026-07-02T12:00:00Z' ) );
		expect( formatYm( lastCompleteMonthUtc() ) ).toBe( '2026-05' );
		// Year boundary.
		vi.setSystemTime( new Date( '2026-01-15T12:00:00Z' ) );
		expect( formatYm( lastCompleteMonthUtc() ) ).toBe( '2025-12' );
	} );

	it( 'computes ISO week starts', () => {
		// 2026-07-21 is a Tuesday; the ISO week starts Monday the 20th.
		expect( formatYmd( startOfWeek( parseDate( '2026-07-21' ) ) ) ).toBe( '2026-07-20' );
		// A Sunday belongs to the week that started the previous Monday.
		expect( formatYmd( startOfWeek( parseDate( '2026-07-26' ) ) ) ).toBe( '2026-07-20' );
	} );

	it( 'resolves latest-N ending yesterday, inclusive', () => {
		expect( formatYmd( yesterdayUtc() ) ).toBe( '2026-07-20' );
		const { start, end } = resolveSpecialRange( 'latest-20' );
		expect( formatYmd( start ) ).toBe( '2026-07-01' );
		expect( formatYmd( end ) ).toBe( '2026-07-20' );
		// Bare 'latest' defaults to 30 days.
		expect( formatYmd( resolveSpecialRange( 'latest' ).start ) ).toBe( '2026-06-21' );
	} );

	it( 'resolves calendar ranges', () => {
		expect( resolveSpecialRange( 'last-month' ) ).toEqual( {
			start: parseDate( '2026-06-01' ),
			end: parseDate( '2026-06-30' )
		} );
		expect( resolveSpecialRange( 'last-week' ) ).toEqual( {
			start: parseDate( '2026-07-13' ),
			end: parseDate( '2026-07-19' )
		} );
		expect( resolveSpecialRange( 'last-year' ) ).toEqual( {
			start: parseDate( '2025-01-01' ),
			end: parseDate( '2025-12-31' )
		} );
		expect( resolveSpecialRange( 'all-time' ) ).toEqual( {
			start: parseDate( '2015-07-01' ),
			end: parseDate( '2026-07-20' )
		} );
	} );

	it( 'clamps this-* ranges when the period starts after maxDate', () => {
		// On the 1st of a month, "this-month" starts today — after
		// yesterday's maxDate. The end must not precede the start.
		vi.setSystemTime( new Date( '2026-08-01T05:00:00Z' ) );
		const { start, end } = resolveSpecialRange( 'this-month' );
		expect( formatYmd( start ) ).toBe( '2026-08-01' );
		expect( formatYmd( end ) ).toBe( '2026-08-01' );
	} );

	it( 'returns null for unknown ranges', () => {
		expect( resolveSpecialRange( 'fortnight' ) ).toBeNull();
	} );
} );
