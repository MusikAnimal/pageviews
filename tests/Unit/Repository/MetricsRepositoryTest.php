<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Exception\ApiException;
use App\Repository\MetricsRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class MetricsRepositoryTest extends TestCase {

	/** @var string[] Request URLs seen by the mock client. */
	private array $requestedUrls = [];

	/**
	 * @param array $routes Substring => MockResponse factory or body array.
	 */
	private function makeRepo( array $routes = [], string $excludesPath = '' ): MetricsRepository {
		$client = new MockHttpClient( function ( string $method, string $url ) use ( $routes ) {
			$this->requestedUrls[] = $url;
			foreach ( $routes as $needle => $response ) {
				if ( str_contains( $url, $needle ) ) {
					return $response instanceof MockResponse ?
						$response :
						new MockResponse( json_encode( $response ) );
				}
			}
			return new MockResponse(
				json_encode( [ 'type' => 'about:blank', 'title' => 'Not found.' ] ),
				[ 'http_code' => 404 ]
			);
		}, 'https://wikimedia.org/api/rest_v1/metrics/' );

		return new MetricsRepository( $client, new ArrayAdapter(), $excludesPath );
	}

	private static function aqsItems( string $article, array $viewsByTimestamp ): array {
		$items = [];
		foreach ( $viewsByTimestamp as $timestamp => $views ) {
			$items[] = [
				'article' => $article,
				'timestamp' => (string)$timestamp,
				'views' => $views,
			];
		}
		return [ 'items' => $items ];
	}

	public function testContractShape(): void {
		$repo = $this->makeRepo( [
			// 2026-07-02 is missing from the AQS response: zero-filled.
			'/Cat/' => self::aqsItems( 'Cat', [ '2026070100' => 10, '2026070300' => 30 ] ),
			'/Dog/' => self::aqsItems( 'Dog', [ '2026070100' => 1, '2026070200' => 2, '2026070300' => 3 ] ),
		] );

		$result = $repo->getPageviews(
			'en.wikipedia.org', 'Cat|Dog', '2026-07-01', '2026-07-03'
		);

		static::assertSame( [
			'project' => 'en.wikipedia',
			'platform' => 'all-access',
			'agent' => 'user',
			'granularity' => 'daily',
			'start' => '2026-07-01',
			'end' => '2026-07-03',
			'dates' => [ '2026-07-01', '2026-07-02', '2026-07-03' ],
			'pages' => [
				[ 'title' => 'Cat', 'counts' => [ 10, 0, 30 ], 'total' => 40, 'average' => 13.33 ],
				[ 'title' => 'Dog', 'counts' => [ 1, 2, 3 ], 'total' => 6, 'average' => 2.0 ],
			],
			'totals' => [
				'counts' => [ 11, 2, 33 ],
				'total' => 46,
				'average' => 15.33,
			],
		], $result );
	}

	public function testNoDataPageBecomesZerosNotAnError(): void {
		$repo = $this->makeRepo( [
			'/Cat/' => self::aqsItems( 'Cat', [ '2026070100' => 5 ] ),
			// 'Missing' falls through to the mock's 404.
		] );

		$result = $repo->getPageviews( 'en.wikipedia', 'Cat|Missing', '2026-07-01', '2026-07-01' );

		static::assertSame(
			[ 'title' => 'Missing', 'counts' => [ 0 ], 'total' => 0, 'average' => 0.0, 'no_data' => true ],
			$result['pages'][ 1 ]
		);
		static::assertSame( 5, $result['totals']['total'] );
	}

	public function testMonthlyAxis(): void {
		$repo = $this->makeRepo( [
			'/Cat/' => self::aqsItems( 'Cat', [ '2026050100' => 100, '2026070100' => 300 ] ),
		] );

		$result = $repo->getPageviews(
			'en.wikipedia', 'Cat', '2026-05', '2026-07', 'all-access', 'user', 'monthly'
		);

		static::assertSame( [ '2026-05', '2026-06', '2026-07' ], $result['dates'] );
		static::assertSame( [ 100, 0, 300 ], $result['pages'][ 0 ]['counts'] );
		// The monthly end date expands to the end of the month.
		static::assertSame( '2026-07-31', $result['end'] );
	}

	public function testAqsRequestFormat(): void {
		$repo = $this->makeRepo( [
			'/Weird_%2F_Title/' => self::aqsItems( 'Weird_/_Title', [ '2026070100' => 1 ] ),
		] );

		// 'all' aliases normalize to the AQS values; titles are
		// underscored and URL-encoded.
		$repo->getPageviews( 'en.wikipedia.org', 'Weird / Title', '2026-07-01', '2026-07-01', 'all', 'all' );

		static::assertCount( 1, $this->requestedUrls );
		static::assertSame(
			'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' .
				'en.wikipedia/all-access/all-agents/Weird_%2F_Title/daily/2026070100/2026070100',
			$this->requestedUrls[ 0 ]
		);
	}

	public function testResponsesAreCached(): void {
		$repo = $this->makeRepo( [
			'/Cat/' => self::aqsItems( 'Cat', [ '2026070100' => 5 ] ),
		] );

		$repo->getPageviews( 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-01' );
		$repo->getPageviews( 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-01' );

		static::assertCount( 1, $this->requestedUrls );
	}

	public function testValidation(): void {
		$repo = $this->makeRepo();

		$cases = [
			[ [ 'en.wikipedia', '', '2026-07-01', '2026-07-02' ], 'missing_param' ],
			[ [ 'en.wikipedia', implode( '|', range( 1, 51 ) ), '2026-07-01', '2026-07-02' ], 'too_many_pages' ],
			[ [ 'en.wikipedia', 'Cat', '2026-07-02', '2026-07-01' ], 'invalid_date_range' ],
			[ [ 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-02', 'gopher' ], 'invalid_platform' ],
			[ [ 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-02', 'all-access', 'alien' ], 'invalid_agent' ],
			[ [ 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-02', 'all-access', 'user', 'hourly' ], 'invalid_granularity' ],
		];

		foreach ( $cases as [ $args, $expectedCode ] ) {
			try {
				$repo->getPageviews( ...$args );
				static::fail( "Expected ApiException ($expectedCode)" );
			} catch ( ApiException $e ) {
				static::assertSame( $expectedCode, $e->errorCode );
				static::assertSame( 400, $e->status );
			}
		}
	}

	private const EXCLUDES_FIXTURE = __DIR__ . '/../../Fixtures/topviews_excludes.yaml';

	private static function aqsTop( array $articlesToViews ): array {
		$rank = 0;
		$articles = [];
		foreach ( $articlesToViews as $article => $views ) {
			$articles[] = [ 'article' => $article, 'views' => $views, 'rank' => ++$rank ];
		}
		return [ 'items' => [ [ 'articles' => $articles ] ] ];
	}

	public function testTopPageviewsExcludesAndReranks(): void {
		$repo = $this->makeRepo( [
			'pageviews/top/en.wikipedia/all-access/2026/06/all-days' => self::aqsTop( [
				'Cat' => 500,
				// Excluded via '*' (stored with a space, served with an
				// underscore) and via the project list respectively:
				// following ranks shift up.
				'Global_Spam' => 400,
				'Bot_Magnet' => 300,
				'Dog' => 200,
			] ),
		], self::EXCLUDES_FIXTURE );

		$result = $repo->getTopPageviews( 'en.wikipedia.org', '2026-06' );

		static::assertSame( [
			'project' => 'en.wikipedia',
			'platform' => 'all-access',
			'date' => '2026-06',
			'articles' => [
				[ 'article' => 'Cat', 'views' => 500, 'rank' => 1 ],
				[ 'article' => 'Dog', 'views' => 200, 'rank' => 2 ],
			],
		], $result );
	}

	public function testTopPageviewsDailyAndOtherProjectExcludes(): void {
		$repo = $this->makeRepo( [
			'pageviews/top/de.wikipedia/desktop/2026/06/15' => self::aqsTop( [
				'Katze' => 300,
				'Hund' => 200,
			] ),
		], self::EXCLUDES_FIXTURE );

		$result = $repo->getTopPageviews( 'de.wikipedia', '2026-06-15', 'desktop' );

		static::assertSame(
			[ [ 'article' => 'Hund', 'views' => 200, 'rank' => 1 ] ],
			$result['articles']
		);
	}

	public function testTopPageviewsNoData(): void {
		// No mocked route: the mock client 404s.
		$repo = $this->makeRepo();

		$result = $repo->getTopPageviews( 'en.wikipedia', '2026-06' );

		static::assertSame( [], $result['articles'] );
		static::assertTrue( $result['no_data'] );
	}

	public function testTopPageviewsInvalidDate(): void {
		$repo = $this->makeRepo();

		try {
			$repo->getTopPageviews( 'en.wikipedia', 'June 2026' );
			static::fail( 'Expected ApiException (invalid_date)' );
		} catch ( ApiException $e ) {
			static::assertSame( 'invalid_date', $e->errorCode );
			static::assertSame( 400, $e->status );
		}
	}

	public function testUpstreamServerErrorBecomesApiException(): void {
		// Both 4xx and 5xx (e.g. exhausted 429 retries, Cassandra
		// errors) must surface as a labeled Pageviews API error, never
		// the generic unknown-error envelope.
		foreach ( [ 400, 503 ] as $statusCode ) {
			$repo = $this->makeRepo( [
				'/Cat/' => new MockResponse( 'no', [ 'http_code' => $statusCode ] ),
			] );

			try {
				$repo->getPageviews( 'en.wikipedia', 'Cat', '2026-07-01', '2026-07-01' );
				static::fail( "Expected ApiException for HTTP $statusCode" );
			} catch ( ApiException $e ) {
				static::assertSame( 'upstream_error', $e->errorCode );
				static::assertSame( 502, $e->status );
				static::assertSame( 'aqs', $e->upstream );
				static::assertSame( [ 'api-error', 'Pageviews API' ], $e->i18n );
				static::assertTrue( $e->retryable );
			}
		}
	}
}
