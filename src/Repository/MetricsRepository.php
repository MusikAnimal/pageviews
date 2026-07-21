<?php

declare( strict_types = 1 );

namespace App\Repository;

use App\Exception\ApiException;
use App\Trait\DateParserTrait;
use DateInterval;
use DatePeriod;
use DateTime;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Proxies the Wikimedia AQS pageviews metrics API: batched per-article
 * timeseries, fetched concurrently, zero-filled, and cached. Pairs with
 * MetricsController.
 */
class MetricsRepository extends Repository {

	use DateParserTrait;

	public const MAX_PAGES = 50;

	private const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
	private const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];

	public function __construct(
		private readonly HttpClientInterface $aqsClient,
		private readonly CacheInterface $cacheMetrics,
	) {
	}

	/**
	 * Batched per-article pageview timeseries, shaped for the frontend
	 * stores: a single date axis plus aligned per-page count arrays,
	 * zero-filled. AQS 404s ("no data") become all-zero pages flagged
	 * no_data — never an error.
	 *
	 * @param string $pagesParam Pipe-delimited page titles (max 50).
	 */
	public function getPageviews(
		string $project,
		string $pagesParam,
		string $start,
		string $end,
		string $platform = 'all-access',
		string $agent = 'user',
		string $granularity = 'daily',
	): array {
		$project = $this->normalizeProject( $project );
		$platform = $this->validated( 'platform', $platform === 'all' ? 'all-access' : $platform, self::PLATFORMS );
		$agent = $this->validated( 'agent', $agent === 'all' ? 'all-agents' : $agent, self::AGENTS );
		$granularity = $this->validated( 'granularity', $granularity, [ 'daily', 'monthly' ] );
		$pages = $this->parsePages( $pagesParam );

		$startDate = $this->parseDate( $start );
		$endDate = $this->parseDate( $end, true );
		if ( $startDate > $endDate ) {
			$this->invalidParameter(
				'invalid_date_range',
				'The start date must not be after the end date.',
				[ 'param-error-2' ]
			);
		}

		$cacheKey = sprintf(
			'pv.%s.%s.%s.%s.%s.%s.%s',
			$project,
			$platform,
			$agent,
			$granularity,
			$startDate->format( 'Ymd' ),
			$endDate->format( 'Ymd' ),
			sha1( implode( '|', $pages ) )
		);

		return $this->cacheMetrics->get(
			$cacheKey,
			function ( ItemInterface $item ) use (
				$project, $pages, $startDate, $endDate, $platform, $agent, $granularity
			): array {
				$item->expiresAfter( $this->ttlForRange( $endDate ) );
				return $this->fetchPageviews(
					$project, $pages, $startDate, $endDate, $platform, $agent, $granularity
				);
			}
		);
	}

	private function fetchPageviews(
		string $project,
		array $pages,
		DateTime $startDate,
		DateTime $endDate,
		string $platform,
		string $agent,
		string $granularity,
	): array {
		$dates = $this->dateAxis( $startDate, $endDate, $granularity );
		$startTs = $startDate->format( 'Ymd' ) . '00';
		$endTs = $endDate->format( 'Ymd' ) . '00';

		// Issue every request up front; HttpClient multiplexes them
		// concurrently and blocks only when a response body is read.
		$responses = [];
		foreach ( $pages as $page ) {
			$article = rawurlencode( str_replace( ' ', '_', $page ) );
			$responses[ $page ] = $this->aqsClient->request(
				'GET',
				"pageviews/per-article/$project/$platform/$agent/$article/$granularity/$startTs/$endTs"
			);
		}

		$pageData = [];
		$totals = array_fill( 0, count( $dates ), 0 );
		foreach ( $responses as $title => $response ) {
			$counts = $this->extractCounts( $response, $dates, $granularity, $noData );
			foreach ( $counts as $i => $count ) {
				$totals[ $i ] += $count;
			}
			$total = array_sum( $counts );
			$pageData[] = [
				'title' => $title,
				'counts' => $counts,
				'total' => $total,
				'average' => round( $total / count( $dates ), 2 ),
			] + ( $noData ? [ 'no_data' => true ] : [] );
		}

		return [
			'project' => $project,
			'platform' => $platform,
			'agent' => $agent,
			'granularity' => $granularity,
			'start' => $startDate->format( 'Y-m-d' ),
			'end' => $endDate->format( 'Y-m-d' ),
			'dates' => $dates,
			'pages' => $pageData,
			'totals' => [
				'counts' => $totals,
				'total' => array_sum( $totals ),
				'average' => round( array_sum( $totals ) / count( $dates ), 2 ),
			],
		];
	}

	/**
	 * Map an AQS response onto the date axis, zero-filling gaps.
	 *
	 * @param string[] $dates
	 * @param bool|null $noData Set to whether AQS had no data at all (404).
	 * @return int[]
	 */
	private function extractCounts( object $response, array $dates, string $granularity, ?bool &$noData ): array {
		$noData = false;
		try {
			$items = $response->toArray()['items'] ?? [];
		} catch ( ClientExceptionInterface $e ) {
			if ( $response->getStatusCode() === Response::HTTP_NOT_FOUND ) {
				$noData = true;
				return array_fill( 0, count( $dates ), 0 );
			}
			throw new ApiException(
				'upstream_error',
				'The Pageviews API returned an error.',
				[ 'api-error', 'Pageviews API' ],
				Response::HTTP_BAD_GATEWAY,
				'aqs',
				true,
			);
		}

		$byDate = [];
		foreach ( $items as $item ) {
			// AQS timestamps are YYYYMMDDHH; monthly items are the
			// first of the month.
			$key = $granularity === 'monthly' ?
				substr( $item['timestamp'], 0, 6 ) :
				substr( $item['timestamp'], 0, 8 );
			$byDate[ $key ] = $item['views'];
		}

		return array_map( static function ( string $date ) use ( $byDate ): int {
			$key = str_replace( '-', '', $date );
			return $byDate[ $key ] ?? 0;
		}, $dates );
	}

	/**
	 * @return string[] Every day (Y-m-d) or month (Y-m) in the range,
	 *   inclusive.
	 */
	private function dateAxis( DateTime $start, DateTime $end, string $granularity ): array {
		$monthly = $granularity === 'monthly';
		$period = new DatePeriod(
			$monthly ? ( clone $start )->modify( 'first day of this month' ) : $start,
			new DateInterval( $monthly ? 'P1M' : 'P1D' ),
			( clone $end )->modify( '+1 day' )
		);
		$axis = [];
		foreach ( $period as $date ) {
			$axis[] = $date->format( $monthly ? 'Y-m' : 'Y-m-d' );
		}
		return $axis;
	}

	/**
	 * @return string[] Trimmed, deduplicated titles.
	 */
	private function parsePages( string $pagesParam ): array {
		$pages = array_values( array_unique( array_filter(
			array_map( 'trim', explode( '|', $pagesParam ) ),
			static fn ( string $page ): bool => $page !== ''
		) ) );

		if ( !$pages ) {
			$this->invalidParameter(
				'missing_param',
				'The pages parameter is required.',
				[ 'param-error-3', 'pages' ]
			);
		}
		if ( count( $pages ) > self::MAX_PAGES ) {
			$this->invalidParameter(
				'too_many_pages',
				sprintf( 'A maximum of %d pages may be requested at once.', self::MAX_PAGES ),
				[ 'param-error-3', 'pages' ]
			);
		}
		return $pages;
	}

	private function validated( string $name, string $value, array $allowed ): string {
		if ( !in_array( $value, $allowed, true ) ) {
			$this->invalidParameter(
				"invalid_$name",
				sprintf( 'Invalid %s: %s. Allowed: %s.', $name, $value, implode( ', ', $allowed ) ),
				[ 'param-error-3', $name ]
			);
		}
		return $value;
	}
}
