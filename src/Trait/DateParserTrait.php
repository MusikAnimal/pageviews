<?php
declare( strict_types = 1 );

namespace App\Trait;

use DateTime;
use InvalidArgumentException;

trait DateParserTrait {

	/**
	 * Parses a date string in the format YYYY-MM or YYYY-MM-DD and returns a DateTime object.
	 *
	 * @param string $date The date string to parse.
	 * @param bool $isEndDate If true and the date is in YYYY-MM format, the day will be
	 *   set to the last day of the month instead of the first day.
	 * @return DateTime The parsed DateTime object.
	 * @throws InvalidArgumentException If the date string is not in a valid format.
	 */
	public function parseDate( string $date, bool $isEndDate = false ): DateTime {
		$isMonthly = false;
		if ( preg_match( '/^\d{4}-\d{2}$/', $date ) ) {
			$isMonthly = true;
			$date = "$date-01";
		}
		if ( !preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			throw new InvalidArgumentException( "Date $date is not in a valid format." );
		}
		$datetime = new DateTime( $date );
		if ( $isMonthly && $isEndDate ) {
			$datetime->format( 'Y-m-t' );
		}
		return $datetime;
	}
}
