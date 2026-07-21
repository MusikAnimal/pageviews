<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Trait;

use App\Trait\DateParserTrait;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DateParserTraitTest extends TestCase {

	use DateParserTrait;

	#[DataProvider( 'provideDates' )]
	public function testParseDate( string $date, bool $isEndDate, string $expected ): void {
		static::assertSame( $expected, $this->parseDate( $date, $isEndDate )->format( 'Y-m-d' ) );
	}

	public static function provideDates(): array {
		return [
			'daily' => [ '2026-07-15', false, '2026-07-15' ],
			'daily as end date' => [ '2026-07-15', true, '2026-07-15' ],
			'monthly' => [ '2026-02', false, '2026-02-01' ],
			// Regression: the end of a monthly range must be the last day of
			// the month (previously the format() result was discarded).
			'monthly as end date' => [ '2026-02', true, '2026-02-28' ],
			'monthly as end date, leap year' => [ '2024-02', true, '2024-02-29' ],
			'monthly as end date, 31 days' => [ '2026-07', true, '2026-07-31' ],
		];
	}

	#[DataProvider( 'provideInvalidDates' )]
	public function testInvalidDatesThrow( string $date ): void {
		$this->expectException( InvalidArgumentException::class );
		$this->parseDate( $date );
	}

	public static function provideInvalidDates(): array {
		return [
			'prose' => [ 'yesterday' ],
			'wrong order' => [ '15-07-2026' ],
			'year only' => [ '2026' ],
			'empty' => [ '' ],
		];
	}
}
