<?php

declare( strict_types = 1 );

namespace App\Repository;

use App\Exception\ApiException;
use App\Trait\DateParserTrait;
use DateInterval;
use DatePeriod;
use DateTime;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Component\Yaml\Yaml;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Proxies the Wikimedia AQS pageviews metrics API: batched per-article
 * timeseries, fetched concurrently, zero-filled, and cached. Pairs with
 * MetricsController.
 */
class MetricsRepository extends Repository {

	use DateParserTrait;

	public const MAX_PAGES = 50;

	/**
	 * How many AQS requests to run concurrently, with a short pause
	 * between waves. AQS rate-limits per-IP bursts far below our
	 * 50-page batch size (instant 429s at ~25 parallel; the legacy
	 * tool fetched strictly one at a time per client), so a batch is
	 * processed in small paced waves.
	 */
	private const AQS_CONCURRENCY = 5;
	private const AQS_WAVE_PAUSE_US = 100000;

	private const PLATFORMS = [ 'all-access', 'desktop', 'mobile-app', 'mobile-web' ];
	private const AGENTS = [ 'all-agents', 'user', 'spider', 'automated' ];

	public const MAX_SITES = 10;

	/**
	 * Siteviews metric sources and their AQS particulars: URL template
	 * pieces, platform vocabulary and the per-item value key.
	 */
	private const SITEVIEWS_SOURCES = [
		'pageviews' => [
			'platforms' => self::PLATFORMS,
			'valueKey' => 'views',
		],
		'unique-devices' => [
			'platforms' => [ 'all-sites', 'desktop-site', 'mobile-site' ],
			'valueKey' => 'devices',
		],
		'pagecounts' => [
			'platforms' => [ 'all-sites', 'desktop-site', 'mobile-site' ],
			'valueKey' => 'count',
		],
	];

	public function __construct(
		private readonly HttpClientInterface $aqsClient,
		private readonly CacheInterface $cacheMetrics,
		#[Autowire( '%kernel.project_dir%/config/topviews_excludes.yaml' )]
		private readonly string $topviewsExcludesPath = '',
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

		$pageData = [];
		$totals = array_fill( 0, count( $dates ), 0 );

		foreach ( array_chunk( $pages, self::AQS_CONCURRENCY ) as $waveIndex => $wave ) {
			if ( $waveIndex > 0 ) {
				usleep( self::AQS_WAVE_PAUSE_US );
			}
			// Issue the wave up front; HttpClient runs them all
			// concurrently, and blocking on responses one-by-one below
			// is safe because the wave size stays under
			// max_host_connections — a request that had to queue for a
			// connection would deadlock sequential consumption.
			$responses = [];
			foreach ( $wave as $page ) {
				$article = rawurlencode( str_replace( ' ', '_', $page ) );
				$responses[ $page ] = $this->aqsClient->request(
					'GET',
					"pageviews/per-article/$project/$platform/$agent/$article/$granularity/$startTs/$endTs"
				);
			}

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
	 * Batched per-site aggregate timeseries for Siteviews: pageviews
	 * (AQS aggregate, optionally the special site 'all-projects'),
	 * unique devices, or the legacy pagecounts. Same contract shape as
	 * getPageviews(), with `sites` in place of `pages`.
	 *
	 * @param string $sitesParam Pipe-delimited site domains (max 10).
	 */
	public function getSiteviews(
		string $sitesParam,
		string $source,
		string $start,
		string $end,
		string $platform = '',
		string $agent = 'user',
		string $granularity = 'daily',
	): array {
		$source = $this->validated( 'source', $source, array_keys( self::SITEVIEWS_SOURCES ) );
		$isPageviews = $source === 'pageviews';
		$platforms = self::SITEVIEWS_SOURCES[ $source ]['platforms'];
		$platform = $this->validated(
			'platform',
			match ( $platform ) {
				// Per-source default and the interim 'all' alias.
				'', 'all' => $platforms[0],
				default => $platform,
			},
			$platforms
		);
		// Only the pageviews source has an agent breakdown.
		$agent = $isPageviews ?
			$this->validated( 'agent', $agent === 'all' ? 'all-agents' : $agent, self::AGENTS ) :
			null;
		$granularity = $this->validated( 'granularity', $granularity, [ 'daily', 'monthly' ] );
		$sites = $this->parseSites( $sitesParam, $isPageviews );

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
			'sv.%s.%s.%s.%s.%s.%s.%s',
			$source,
			$platform,
			$agent ?? '-',
			$granularity,
			$startDate->format( 'Ymd' ),
			$endDate->format( 'Ymd' ),
			sha1( implode( '|', $sites ) )
		);

		return $this->cacheMetrics->get(
			$cacheKey,
			function ( ItemInterface $item ) use (
				$source, $sites, $startDate, $endDate, $platform, $agent, $granularity
			): array {
				$item->expiresAfter( $this->ttlForRange( $endDate ) );
				return $this->fetchSiteviews(
					$source, $sites, $startDate, $endDate, $platform, $agent, $granularity
				);
			}
		);
	}

	private function fetchSiteviews(
		string $source,
		array $sites,
		DateTime $startDate,
		DateTime $endDate,
		string $platform,
		?string $agent,
		string $granularity,
	): array {
		$dates = $this->dateAxis( $startDate, $endDate, $granularity );
		$startTs = $startDate->format( 'Ymd' ) . '00';
		$endTs = $endDate->format( 'Ymd' ) . '00';
		$valueKey = self::SITEVIEWS_SOURCES[ $source ]['valueKey'];

		$siteData = [];
		$totals = array_fill( 0, count( $dates ), 0 );

		foreach ( array_chunk( $sites, self::AQS_CONCURRENCY ) as $waveIndex => $wave ) {
			if ( $waveIndex > 0 ) {
				usleep( self::AQS_WAVE_PAUSE_US );
			}
			$responses = [];
			foreach ( $wave as $site ) {
				$domain = rawurlencode( $this->normalizeProject( $site ) );
				$responses[ $site ] = $this->aqsClient->request( 'GET', match ( $source ) {
					'pageviews' => "pageviews/aggregate/$domain/$platform/$agent/$granularity/$startTs/$endTs",
					'unique-devices' => "unique-devices/$domain/$platform/$granularity/$startTs/$endTs",
					'pagecounts' => "legacy/pagecounts/aggregate/$domain/$platform/$granularity/$startTs/$endTs",
				} );
			}

			foreach ( $responses as $site => $response ) {
				$counts = $this->extractCounts( $response, $dates, $granularity, $noData, $valueKey );
				foreach ( $counts as $i => $count ) {
					$totals[ $i ] += $count;
				}
				$total = array_sum( $counts );
				$domain = $this->normalizeProject( $site );
				$siteData[] = [
					'site' => $domain === 'all-projects' ? $domain : "$domain.org",
					'counts' => $counts,
					'total' => $total,
					'average' => round( $total / count( $dates ), 2 ),
				] + ( $noData ? [ 'no_data' => true ] : [] );
			}
		}

		return [
			'source' => $source,
			'platform' => $platform,
			'granularity' => $granularity,
			'start' => $startDate->format( 'Y-m-d' ),
			'end' => $endDate->format( 'Y-m-d' ),
			'dates' => $dates,
			'sites' => $siteData,
			'totals' => [
				'counts' => $totals,
				'total' => array_sum( $totals ),
				'average' => round( array_sum( $totals ) / count( $dates ), 2 ),
			],
		] + ( $agent === null ? [] : [ 'agent' => $agent ] );
	}

	/**
	 * @return string[] Trimmed, deduplicated site domains.
	 */
	private function parseSites( string $sitesParam, bool $allProjectsAllowed ): array {
		$sites = array_values( array_unique( array_filter(
			array_map( 'trim', explode( '|', $sitesParam ) ),
			static fn ( string $site ): bool => $site !== ''
		) ) );

		if ( !$sites ) {
			$this->invalidParameter(
				'missing_param',
				'The sites parameter is required.',
				[ 'param-error-3', 'sites' ]
			);
		}
		if ( count( $sites ) > self::MAX_SITES ) {
			$this->invalidParameter(
				'too_many_sites',
				sprintf( 'A maximum of %d sites may be requested at once.', self::MAX_SITES ),
				[ 'param-error-3', 'sites' ]
			);
		}
		// The special all-projects site only exists for the pageviews
		// aggregate endpoint, and only by itself.
		if ( in_array( 'all-projects', $sites, true ) && ( !$allProjectsAllowed || count( $sites ) > 1 ) ) {
			$this->invalidParameter(
				'invalid_sites',
				'all-projects is only valid alone, with the pageviews source.',
				[ 'param-error-3', 'sites' ]
			);
		}
		return $sites;
	}

	private const EDITOR_TYPES = [ 'all-editor-types', 'anonymous', 'group-bot', 'name-bot', 'user' ];
	private const PAGE_TYPES = [ 'all-page-types', 'content', 'non-content' ];

	/**
	 * The editing metrics served by getSiteEdits(), all sharing the
	 * editor-type/page-type breakdowns and the "wikistats 2" response
	 * shape. `extra` is a fixed path segment between page-type and
	 * granularity (edited-pages/aggregate has an activity-level we
	 * don't break down by).
	 */
	private const EDIT_METRICS = [
		'edits' => [ 'path' => 'edits/aggregate', 'valueKey' => 'edits' ],
		'editors' => [
			'path' => 'editors/aggregate',
			'valueKey' => 'editors',
			'extra' => 'all-activity-levels',
		],
		'editedPages' => [
			'path' => 'edited-pages/aggregate',
			'valueKey' => 'edited_pages',
			'extra' => 'all-activity-levels',
		],
		'newPages' => [ 'path' => 'edited-pages/new', 'valueKey' => 'new_pages' ],
	];

	/**
	 * Batched per-site editing statistics (edit counts and pages
	 * created) from the AQS editing metrics, keyed under `metrics`
	 * with the getSiteviews() sites/totals shape each, plus
	 * `dataThrough`: the last date any site actually has data for
	 * (null when none). Edit data is only loaded into AQS monthly, so
	 * a daily range reaching into the current month gets zero-filled
	 * past the coverage — the client hints at the cutoff. Unlike the
	 * pageviews endpoints, the end timestamp is exclusive and result
	 * timestamps are ISO-8601.
	 *
	 * @param string $sitesParam Pipe-delimited site domains (max 10),
	 *   or the special all-projects.
	 */
	public function getSiteEdits(
		string $sitesParam,
		string $start,
		string $end,
		string $editorType = 'user',
		string $pageType = 'content',
		string $granularity = 'daily',
	): array {
		$editorType = $this->validated( 'editor-type', $editorType, self::EDITOR_TYPES );
		$pageType = $this->validated( 'page-type', $pageType, self::PAGE_TYPES );
		$granularity = $this->validated( 'granularity', $granularity, [ 'daily', 'monthly' ] );
		// all-projects is valid for edits too (same alone-only rule).
		$sites = $this->parseSites( $sitesParam, true );

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
			'se.%s.%s.%s.%s.%s.%s',
			$editorType,
			$pageType,
			$granularity,
			$startDate->format( 'Ymd' ),
			$endDate->format( 'Ymd' ),
			sha1( implode( '|', $sites ) )
		);

		return $this->cacheMetrics->get(
			$cacheKey,
			function ( ItemInterface $item ) use (
				$sites, $startDate, $endDate, $editorType, $pageType, $granularity
			): array {
				$item->expiresAfter( $this->ttlForRange( $endDate ) );
				return $this->fetchSiteEdits(
					$sites, $startDate, $endDate, $editorType, $pageType, $granularity
				);
			}
		);
	}

	private function fetchSiteEdits(
		array $sites,
		DateTime $startDate,
		DateTime $endDate,
		string $editorType,
		string $pageType,
		string $granularity,
	): array {
		$dates = $this->dateAxis( $startDate, $endDate, $granularity );
		$startTs = $startDate->format( 'Ymd' );
		// The editing APIs' end timestamp is exclusive.
		$endTs = ( clone $endDate )->modify( '+1 day' )->format( 'Ymd' );

		$metrics = [];
		$dataThrough = null;
		foreach ( self::EDIT_METRICS as $metric => $unused ) {
			$metrics[ $metric ] = [
				'sites' => [],
				'totals' => array_fill( 0, count( $dates ), 0 ),
			];
		}

		// One request per site and metric, in the usual paced waves.
		$requests = [];
		foreach ( array_keys( self::EDIT_METRICS ) as $metric ) {
			foreach ( $sites as $site ) {
				$requests[] = [ $metric, $site ];
			}
		}

		foreach ( array_chunk( $requests, self::AQS_CONCURRENCY ) as $waveIndex => $wave ) {
			if ( $waveIndex > 0 ) {
				usleep( self::AQS_WAVE_PAUSE_US );
			}
			$responses = [];
			foreach ( $wave as [ $metric, $site ] ) {
				$domain = rawurlencode( $this->normalizeProject( $site ) );
				$path = self::EDIT_METRICS[ $metric ]['path'];
				$extra = isset( self::EDIT_METRICS[ $metric ]['extra'] ) ?
					self::EDIT_METRICS[ $metric ]['extra'] . '/' :
					'';
				$responses[] = [ $metric, $site, $this->aqsClient->request(
					'GET',
					"$path/$domain/$editorType/$pageType/$extra$granularity/$startTs/$endTs"
				) ];
			}

			foreach ( $responses as [ $metric, $site, $response ] ) {
				$counts = $this->extractAggregateResults(
					$response, $dates, $granularity, $noData, $lastDate,
					self::EDIT_METRICS[ $metric ]['valueKey']
				);
				foreach ( $counts as $i => $count ) {
					$metrics[ $metric ]['totals'][ $i ] += $count;
				}
				if ( $lastDate !== null && $lastDate > $dataThrough ) {
					$dataThrough = $lastDate;
				}
				$total = array_sum( $counts );
				$domain = $this->normalizeProject( $site );
				$metrics[ $metric ]['sites'][] = [
					'site' => $domain === 'all-projects' ? $domain : "$domain.org",
					'counts' => $counts,
					'total' => $total,
					'average' => round( $total / count( $dates ), 2 ),
				] + ( $noData ? [ 'no_data' => true ] : [] );
			}
		}

		foreach ( $metrics as &$data ) {
			$counts = $data['totals'];
			$data['totals'] = [
				'counts' => $counts,
				'total' => array_sum( $counts ),
				'average' => round( array_sum( $counts ) / count( $dates ), 2 ),
			];
		}

		return [
			'editorType' => $editorType,
			'pageType' => $pageType,
			'granularity' => $granularity,
			'start' => $startDate->format( 'Y-m-d' ),
			'end' => $endDate->format( 'Y-m-d' ),
			'dataThrough' => $dataThrough,
			'dates' => $dates,
			'metrics' => $metrics,
		];
	}

	/**
	 * Map an AQS "wikistats 2" style response (items[0].results with
	 * ISO-8601 timestamps) onto the date axis, zero-filling gaps.
	 *
	 * @param string[] $dates
	 * @param bool|null $noData Set to whether AQS had no data at all (404).
	 * @param string|null $lastDate Set to the last date (Y-m-d or Y-m per
	 *   granularity) with a data point, or null.
	 * @return int[]
	 */
	private function extractAggregateResults(
		object $response,
		array $dates,
		string $granularity,
		?bool &$noData,
		?string &$lastDate,
		string $valueKey,
	): array {
		$noData = false;
		$lastDate = null;
		try {
			$results = $response->toArray()['items'][0]['results'] ?? [];
		} catch ( HttpClientExceptionInterface $e ) {
			if (
				$e instanceof ClientExceptionInterface &&
				$response->getStatusCode() === Response::HTTP_NOT_FOUND
			) {
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
		foreach ( $results as $result ) {
			// ISO-8601, e.g. 2026-06-01T00:00:00.000Z.
			$day = substr( $result['timestamp'], 0, 10 );
			$key = $granularity === 'monthly' ? substr( $day, 0, 7 ) : $day;
			$byDate[ $key ] = $result[ $valueKey ];
			if ( $key > $lastDate ) {
				$lastDate = $key;
			}
		}

		return array_map(
			static fn ( string $date ): int => $byDate[ $date ] ?? 0,
			$dates
		);
	}

	/**
	 * The most-viewed pages of a month or day, with the curated
	 * false positives (config/topviews_excludes.yaml) removed and ranks
	 * recomputed — the legacy tool showed raw AQS ranks in the
	 * single-page summary, which ignored excludes.
	 *
	 * @param string $date YYYY-MM (whole month) or YYYY-MM-DD.
	 */
	public function getTopPageviews(
		string $project,
		string $date,
		string $platform = 'all-access',
	): array {
		$project = $this->normalizeProject( $project );
		$platform = $this->validated( 'platform', $platform === 'all' ? 'all-access' : $platform, self::PLATFORMS );

		if ( preg_match( '/^\d{4}-(\d{2})$/', $date, $matches ) ) {
			$day = 'all-days';
			$end = ( new DateTime( "$date-01" ) )->modify( 'last day of this month' );
		} elseif ( preg_match( '/^\d{4}-\d{2}-(\d{2})$/', $date, $matches ) ) {
			$day = $matches[1];
			$end = new DateTime( $date );
		} else {
			$this->invalidParameter(
				'invalid_date',
				"Date $date is not in a valid format (YYYY-MM or YYYY-MM-DD).",
				[ 'param-error-3', 'date' ]
			);
		}

		$cacheKey = sprintf( 'top.%s.%s.%s', $project, $platform, $date );

		return $this->cacheMetrics->get(
			$cacheKey,
			function ( ItemInterface $item ) use ( $project, $platform, $date, $day, $end ): array {
				$item->expiresAfter( $this->ttlForRange( $end ) );
				return $this->fetchTopPageviews( $project, $platform, $date, $day );
			}
		);
	}

	private function fetchTopPageviews(
		string $project,
		string $platform,
		string $date,
		string $day,
	): array {
		[ $year, $month ] = explode( '-', $date );
		$response = $this->aqsClient->request(
			'GET',
			"pageviews/top/$project/$platform/$year/$month/$day"
		);

		$noData = false;
		try {
			$entries = $response->toArray()['items'][0]['articles'] ?? [];
		} catch ( HttpClientExceptionInterface $e ) {
			if (
				$e instanceof ClientExceptionInterface &&
				$response->getStatusCode() === Response::HTTP_NOT_FOUND
			) {
				// No data for this period (e.g. too recent).
				$noData = true;
				$entries = [];
			} else {
				throw new ApiException(
					'upstream_error',
					'The Pageviews API returned an error.',
					[ 'api-error', 'Pageviews API' ],
					Response::HTTP_BAD_GATEWAY,
					'aqs',
					true,
				);
			}
		}

		$excludes = $this->topviewsExcludes( $project );
		$articles = [];
		$rank = 0;
		foreach ( $entries as $entry ) {
			$title = str_replace( '_', ' ', $entry['article'] );
			if ( in_array( $title, $excludes, true ) ) {
				continue;
			}
			$articles[] = [
				'article' => $title,
				'views' => $entry['views'],
				'rank' => ++$rank,
			];
		}

		return [
			'project' => $project,
			'platform' => $platform,
			'date' => $date,
			'articles' => $articles,
		] + ( $noData ? [ 'no_data' => true ] : [] );
	}

	/**
	 * @return string[] Excluded titles (spaces normalized) for the
	 *   project: the '*' list plus the project's own.
	 */
	private function topviewsExcludes( string $project ): array {
		if ( !$this->topviewsExcludesPath || !is_file( $this->topviewsExcludesPath ) ) {
			return [];
		}
		$config = Yaml::parseFile( $this->topviewsExcludesPath ) ?: [];
		$titles = array_merge( $config['*'] ?? [], $config["$project.org"] ?? [] );
		return array_map(
			static fn ( string $title ): string => str_replace( '_', ' ', $title ),
			$titles
		);
	}

	/**
	 * Map an AQS response onto the date axis, zero-filling gaps.
	 *
	 * @param string[] $dates
	 * @param bool|null $noData Set to whether AQS had no data at all (404).
	 * @param string $valueKey Per-item count key; varies by AQS endpoint
	 *   (views, devices, count).
	 * @return int[]
	 */
	private function extractCounts(
		object $response,
		array $dates,
		string $granularity,
		?bool &$noData,
		string $valueKey = 'views',
	): array {
		$noData = false;
		try {
			$items = $response->toArray()['items'] ?? [];
		} catch ( HttpClientExceptionInterface $e ) {
			// Covers 4xx/5xx, transport failures and undecodable
			// bodies alike, so every AQS failure surfaces to the user
			// as "Error querying Pageviews API" rather than a generic
			// unknown error.
			if (
				$e instanceof ClientExceptionInterface &&
				$response->getStatusCode() === Response::HTTP_NOT_FOUND
			) {
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
			$byDate[ $key ] = $item[ $valueKey ];
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
