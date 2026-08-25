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
	private function makeRepo(
		array $routes = [],
		string $excludesPath = '',
		string $yearlyDir = ''
	): MetricsRepository {
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

		return new MetricsRepository( $client, new ArrayAdapter(), $excludesPath, $yearlyDir );
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

	private static function aqsAggregate( string $valueKey, array $valuesByTimestamp ): array {
		$items = [];
		foreach ( $valuesByTimestamp as $timestamp => $value ) {
			$items[] = [ 'timestamp' => (string)$timestamp, $valueKey => $value ];
		}
		return [ 'items' => $items ];
	}

	public function testSiteviewsContractShape(): void {
		$repo = $this->makeRepo( [
			'pageviews/aggregate/fr.wikipedia/all-access/user/daily' =>
				self::aqsAggregate( 'views', [ '2026070100' => 100, '2026070300' => 300 ] ),
			'pageviews/aggregate/de.wikipedia/all-access/user/daily' =>
				self::aqsAggregate( 'views', [ '2026070100' => 10, '2026070200' => 20, '2026070300' => 30 ] ),
		] );

		$result = $repo->getSiteviews(
			'fr.wikipedia.org|de.wikipedia.org', 'pageviews', '2026-07-01', '2026-07-03'
		);

		static::assertSame( [
			'source' => 'pageviews',
			'platform' => 'all-access',
			'granularity' => 'daily',
			'start' => '2026-07-01',
			'end' => '2026-07-03',
			'dates' => [ '2026-07-01', '2026-07-02', '2026-07-03' ],
			'sites' => [
				[ 'site' => 'fr.wikipedia.org', 'counts' => [ 100, 0, 300 ], 'total' => 400, 'average' => 133.33 ],
				[ 'site' => 'de.wikipedia.org', 'counts' => [ 10, 20, 30 ], 'total' => 60, 'average' => 20.0 ],
			],
			'totals' => [
				'counts' => [ 110, 20, 330 ],
				'total' => 460,
				'average' => 153.33,
			],
			'agent' => 'user',
		], $result );
	}

	public function testSiteviewsUniqueDevices(): void {
		$repo = $this->makeRepo( [
			'unique-devices/fr.wikipedia/all-sites/daily' =>
				self::aqsAggregate( 'devices', [ '20260701' => 5, '20260702' => 7 ] ),
		] );

		$result = $repo->getSiteviews(
			'fr.wikipedia', 'unique-devices', '2026-07-01', '2026-07-02'
		);

		static::assertSame( [ 5, 7 ], $result['sites'][0]['counts'] );
		// No agent breakdown for unique devices.
		static::assertArrayNotHasKey( 'agent', $result );
		static::assertStringNotContainsString( '/user/', $this->requestedUrls[0] );
	}

	public function testSiteviewsPagecounts(): void {
		$repo = $this->makeRepo( [
			'legacy/pagecounts/aggregate/fr.wikipedia/desktop-site/monthly' =>
				self::aqsAggregate( 'count', [ '2015010100' => 1000, '2015020100' => 2000 ] ),
		] );

		$result = $repo->getSiteviews(
			'fr.wikipedia', 'pagecounts', '2015-01', '2015-02', 'desktop-site', 'user', 'monthly'
		);

		static::assertSame( [ '2015-01', '2015-02' ], $result['dates'] );
		static::assertSame( [ 1000, 2000 ], $result['sites'][0]['counts'] );
	}

	public function testSiteviewsAllProjects(): void {
		$repo = $this->makeRepo( [
			'pageviews/aggregate/all-projects/all-access/user/daily' =>
				self::aqsAggregate( 'views', [ '2026070100' => 12345 ] ),
		] );

		$result = $repo->getSiteviews( 'all-projects', 'pageviews', '2026-07-01', '2026-07-01' );
		static::assertSame( 'all-projects', $result['sites'][0]['site'] );

		// ... but only alone, and only for pageviews.
		foreach ( [
			[ 'all-projects|fr.wikipedia', 'pageviews' ],
			[ 'all-projects', 'unique-devices' ],
		] as [ $sites, $source ] ) {
			try {
				$repo->getSiteviews( $sites, $source, '2026-07-01', '2026-07-01' );
				static::fail( 'Expected ApiException (invalid_sites)' );
			} catch ( ApiException $e ) {
				static::assertSame( 'invalid_sites', $e->errorCode );
			}
		}
	}

	public function testSiteviewsValidation(): void {
		$repo = $this->makeRepo();

		$cases = [
			[ [ 'fr.wikipedia', 'metaviews', '2026-07-01', '2026-07-02' ], 'invalid_source' ],
			[ [ '', 'pageviews', '2026-07-01', '2026-07-02' ], 'missing_param' ],
			[ [ implode( '|', range( 1, 11 ) ), 'pageviews', '2026-07-01', '2026-07-02' ], 'too_many_sites' ],
			// Vocabularies must match the source.
			[ [ 'fr.wikipedia', 'pageviews', '2026-07-01', '2026-07-02', 'all-sites' ], 'invalid_platform' ],
			[ [ 'fr.wikipedia', 'unique-devices', '2026-07-01', '2026-07-02', 'desktop' ], 'invalid_platform' ],
			[ [ 'fr.wikipedia', 'pageviews', '2026-07-02', '2026-07-01' ], 'invalid_date_range' ],
		];

		foreach ( $cases as [ $args, $expectedCode ] ) {
			try {
				$repo->getSiteviews( ...$args );
				static::fail( "Expected ApiException ($expectedCode)" );
			} catch ( ApiException $e ) {
				static::assertSame( $expectedCode, $e->errorCode );
				static::assertSame( 400, $e->status );
			}
		}
	}

	public function testMediarequestsContractShape(): void {
		$repo = $this->makeRepo( [
			'mediarequests/per-file/all-referers/user/%2Fwikipedia%2Fcommons%2Fa%2Fa9%2FExample.jpg/daily' =>
				self::aqsAggregate( 'requests', [ '2026070100' => 10, '2026070300' => 30 ] ),
		] );

		$result = $repo->getMediarequests(
			'/wikipedia/commons/a/a9/Example.jpg', '2026-07-01', '2026-07-03'
		);

		static::assertSame( [
			'referer' => 'all-referers',
			'agent' => 'user',
			'granularity' => 'daily',
			'start' => '2026-07-01',
			'end' => '2026-07-03',
			'dates' => [ '2026-07-01', '2026-07-02', '2026-07-03' ],
			'files' => [
				[
					'path' => '/wikipedia/commons/a/a9/Example.jpg',
					'counts' => [ 10, 0, 30 ],
					'total' => 40,
					'average' => 13.33,
				],
			],
			'totals' => [
				'counts' => [ 10, 0, 30 ],
				'total' => 40,
				'average' => 13.33,
			],
		], $result );
	}

	public function testMediarequestsValidation(): void {
		$repo = $this->makeRepo();

		foreach ( [
			[ [ '/a/b.jpg', '2026-07-01', '2026-07-02', 'friend' ], 'invalid_referer' ],
			// No 'automated' agent for mediarequests.
			[ [ '/a/b.jpg', '2026-07-01', '2026-07-02', 'all-referers', 'automated' ], 'invalid_agent' ],
			[ [ '', '2026-07-01', '2026-07-02' ], 'missing_param' ],
			[ [ implode( '|', range( 1, 11 ) ), '2026-07-01', '2026-07-02' ], 'too_many_files' ],
		] as [ $args, $expectedCode ] ) {
			try {
				$repo->getMediarequests( ...$args );
				static::fail( "Expected ApiException ($expectedCode)" );
			} catch ( ApiException $e ) {
				static::assertSame( $expectedCode, $e->errorCode );
			}
		}
	}

	private static function aqsResults( string $valueKey, array $valuesByIsoDate ): array {
		$results = [];
		foreach ( $valuesByIsoDate as $date => $value ) {
			$results[] = [ 'timestamp' => "{$date}T00:00:00.000Z", $valueKey => $value ];
		}
		return [ 'items' => [ [ 'results' => $results ] ] ];
	}

	private static function aqsEdits( array $editsByIsoDate ): array {
		return self::aqsResults( 'edits', $editsByIsoDate );
	}

	public function testSiteEditsContractShape(): void {
		$repo = $this->makeRepo( [
			// AQS only has data through 07-02: 07-03 zero-fills, and
			// dataThrough reports the coverage for the client's hint.
			'edits/aggregate/fr.wikipedia/user/content/daily/20260701/20260704' =>
				self::aqsEdits( [ '2026-07-01' => 100, '2026-07-02' => 200 ] ),
			'editors/aggregate/fr.wikipedia/user/content/all-activity-levels/daily/20260701/20260704' =>
				self::aqsResults( 'editors', [ '2026-07-01' => 10, '2026-07-02' => 30 ] ),
			'edited-pages/aggregate/fr.wikipedia/user/content/all-activity-levels/daily/20260701/20260704' =>
				self::aqsResults( 'edited_pages', [ '2026-07-01' => 50, '2026-07-02' => 70 ] ),
			'edited-pages/new/fr.wikipedia/user/content/daily/20260701/20260704' =>
				self::aqsResults( 'new_pages', [ '2026-07-01' => 5, '2026-07-02' => 7 ] ),
			'bytes-difference/net/aggregate/fr.wikipedia/user/content/daily/20260701/20260704' =>
				self::aqsResults( 'net_bytes_diff', [ '2026-07-01' => 1000, '2026-07-02' => -300 ] ),
		] );

		$result = $repo->getSiteEdits( 'fr.wikipedia.org', '2026-07-01', '2026-07-03' );

		static::assertSame( [
			'editorType' => 'user',
			'pageType' => 'content',
			'granularity' => 'daily',
			'start' => '2026-07-01',
			'end' => '2026-07-03',
			'dataThrough' => '2026-07-02',
			'dates' => [ '2026-07-01', '2026-07-02', '2026-07-03' ],
			'metrics' => [
				'edits' => [
					'sites' => [
						[ 'site' => 'fr.wikipedia.org', 'counts' => [ 100, 200, 0 ], 'total' => 300, 'average' => 100.0 ],
					],
					'totals' => [
						'counts' => [ 100, 200, 0 ],
						'total' => 300,
						'average' => 100.0,
					],
				],
				'editors' => [
					'sites' => [
						[ 'site' => 'fr.wikipedia.org', 'counts' => [ 10, 30, 0 ], 'total' => 40, 'average' => 13.33 ],
					],
					'totals' => [
						'counts' => [ 10, 30, 0 ],
						'total' => 40,
						'average' => 13.33,
					],
				],
				'editedPages' => [
					'sites' => [
						[ 'site' => 'fr.wikipedia.org', 'counts' => [ 50, 70, 0 ], 'total' => 120, 'average' => 40.0 ],
					],
					'totals' => [
						'counts' => [ 50, 70, 0 ],
						'total' => 120,
						'average' => 40.0,
					],
				],
				'newPages' => [
					'sites' => [
						[ 'site' => 'fr.wikipedia.org', 'counts' => [ 5, 7, 0 ], 'total' => 12, 'average' => 4.0 ],
					],
					'totals' => [
						'counts' => [ 5, 7, 0 ],
						'total' => 12,
						'average' => 4.0,
					],
				],
				// Negative values (deletions outweighing additions) pass
				// through the whole pipeline.
				'netBytes' => [
					'sites' => [
						[ 'site' => 'fr.wikipedia.org', 'counts' => [ 1000, -300, 0 ], 'total' => 700, 'average' => 233.33 ],
					],
					'totals' => [
						'counts' => [ 1000, -300, 0 ],
						'total' => 700,
						'average' => 233.33,
					],
				],
			],
		], $result );
	}

	public function testSiteEditsAllProjectsSkipsUnsupportedMetrics(): void {
		$repo = $this->makeRepo( [
			'edits/aggregate/all-projects/user/content/daily/20260701/20260704' =>
				self::aqsEdits( [ '2026-07-01' => 100 ] ),
			'edited-pages/new/all-projects/user/content/daily/20260701/20260704' =>
				self::aqsResults( 'new_pages', [ '2026-07-01' => 5 ] ),
			'bytes-difference/net/aggregate/all-projects/user/content/daily/20260701/20260704' =>
				self::aqsResults( 'net_bytes_diff', [ '2026-07-01' => 1000 ] ),
		] );

		$result = $repo->getSiteEdits( 'all-projects', '2026-07-01', '2026-07-03' );

		// AQS rejects the all-projects rollup for editors and
		// edited-pages: neither queried nor in the response.
		static::assertSame(
			[ 'edits', 'newPages', 'netBytes' ],
			array_keys( $result['metrics'] )
		);
		foreach ( $this->requestedUrls as $url ) {
			static::assertStringNotContainsString( 'editors/aggregate', $url );
			static::assertStringNotContainsString( 'edited-pages/aggregate', $url );
		}
		static::assertSame( 'all-projects', $result['metrics']['edits']['sites'][0]['site'] );
		static::assertSame( 100, $result['metrics']['edits']['sites'][0]['total'] );
	}

	public function testSiteEditsMonthlyAndTypes(): void {
		$repo = $this->makeRepo( [
			// Monthly, non-default types; the exclusive end timestamp
			// covers the whole final month.
			'edits/aggregate/de.wikipedia/anonymous/all-page-types/monthly/20260401/20260601' =>
				self::aqsEdits( [ '2026-04-01' => 1000, '2026-05-01' => 2000 ] ),
		] );

		$result = $repo->getSiteEdits(
			'de.wikipedia', '2026-04', '2026-05', 'anonymous', 'all-page-types', 'monthly'
		);

		static::assertSame( [ '2026-04', '2026-05' ], $result['dates'] );
		static::assertSame( [ 1000, 2000 ], $result['metrics']['edits']['sites'][0]['counts'] );
		static::assertSame( '2026-05', $result['dataThrough'] );
		// The pages-created route wasn't mocked: 404 -> no_data zeros,
		// without affecting the edits metric or dataThrough.
		static::assertTrue( $result['metrics']['newPages']['sites'][0]['no_data'] );
	}

	public function testSiteEditsNoData(): void {
		// No mocked route: the mock client 404s (data not loaded yet).
		$repo = $this->makeRepo();

		$result = $repo->getSiteEdits( 'fr.wikipedia', '2026-07-01', '2026-07-02' );

		static::assertTrue( $result['metrics']['edits']['sites'][0]['no_data'] );
		static::assertTrue( $result['metrics']['newPages']['sites'][0]['no_data'] );
		static::assertSame( [ 0, 0 ], $result['metrics']['edits']['sites'][0]['counts'] );
		static::assertNull( $result['dataThrough'] );
	}

	public function testSiteEditsValidation(): void {
		$repo = $this->makeRepo();

		foreach ( [
			[ [ 'fr.wikipedia', '2026-07-01', '2026-07-02', 'vandals' ], 'invalid_editor-type' ],
			[ [ 'fr.wikipedia', '2026-07-01', '2026-07-02', 'user', 'talk' ], 'invalid_page-type' ],
			[ [ '', '2026-07-01', '2026-07-02' ], 'missing_param' ],
		] as [ $args, $expectedCode ] ) {
			try {
				$repo->getSiteEdits( ...$args );
				static::fail( "Expected ApiException ($expectedCode)" );
			} catch ( ApiException $e ) {
				static::assertSame( $expectedCode, $e->errorCode );
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
			// The known false positives, with their original position.
			'excluded' => [
				[ 'article' => 'Global Spam', 'views' => 400, 'rank' => 2 ],
				[ 'article' => 'Bot Magnet', 'views' => 300, 'rank' => 3 ],
			],
		], $result );
	}

	public function testTopPageviewsYearlyFromStaticDataset(): void {
		$repo = $this->makeRepo(
			[],
			self::EXCLUDES_FIXTURE,
			__DIR__ . '/../../Fixtures/topviews_yearly'
		);

		$result = $repo->getTopPageviews( 'en.wikipedia.org', '2016' );

		static::assertSame( [
			'project' => 'en.wikipedia',
			'platform' => 'all-access',
			'date' => '2016',
			'articles' => [
				[ 'article' => 'Cat', 'views' => 900, 'mobile_percentage' => 60.1, 'rank' => 1 ],
				[ 'article' => 'Dog', 'views' => 700, 'mobile_percentage' => 55.5, 'rank' => 2 ],
			],
			'excluded' => [
				[ 'article' => 'Global Spam', 'views' => 800, 'mobile_percentage' => 99.9, 'rank' => 2 ],
			],
		], $result );
	}

	public function testTopPageviewsYearlyMissingDataset(): void {
		$repo = $this->makeRepo( [], '', __DIR__ . '/../../Fixtures/topviews_yearly' );

		try {
			$repo->getTopPageviews( 'en.wikipedia', '1999' );
			static::fail( 'Expected ApiException (no_data)' );
		} catch ( ApiException $e ) {
			static::assertSame( 'no_data', $e->errorCode );
			static::assertSame( 404, $e->status );
			static::assertFalse( $e->retryable );
		}
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

	public function testCommonsCategoryContractShape(): void {
		$repo = $this->makeRepo( [
			// 2025-02 is missing from the response: zero-filled. The
			// dataset uses space-separated ISO timestamps.
			'commons-analytics/pageviews-per-category-monthly/UNESCO/deep/en.wikipedia/20250101/20250401' => [
				'items' => [
					[ 'timestamp' => '2025-01-01 00:00:00.000Z', 'pageview-count' => 100 ],
					[ 'timestamp' => '2025-03-01 00:00:00.000Z', 'pageview-count' => 50 ],
				],
			],
		] );

		$result = $repo->getCommonsCategoryViews(
			// Prefix stripped, spaces underscored, project normalized.
			'Category:UNESCO', 'deep', 'en.wikipedia.org', '2025-01', '2025-03'
		);

		static::assertSame( [
			'category' => 'UNESCO',
			'scope' => 'deep',
			'wiki' => 'en.wikipedia',
			'granularity' => 'monthly',
			'start' => '2025-01',
			'end' => '2025-03',
			'dates' => [ '2025-01', '2025-02', '2025-03' ],
			'counts' => [ 100, 0, 50 ],
			'total' => 150,
			'average' => 50.0,
		], $result );
	}

	public function testCommonsCategoryNotLoaded(): void {
		// 404 means the category is not in the allowlisted dataset:
		// an error, not zeros (unlike per-article pageviews 404s).
		$repo = $this->makeRepo();

		try {
			$repo->getCommonsCategoryViews( 'Nonexistent', 'deep', 'all-wikis', '2025-01', '2025-03' );
			static::fail( 'Expected ApiException (category_not_loaded)' );
		} catch ( ApiException $e ) {
			static::assertSame( 'category_not_loaded', $e->errorCode );
			static::assertSame( 404, $e->status );
			static::assertSame( [ 'mediaviews-commons-category-unknown' ], $e->i18n );
			static::assertFalse( $e->retryable );
		}
	}

	public function testCommonsCategoryInvalidScope(): void {
		$repo = $this->makeRepo();

		try {
			$repo->getCommonsCategoryViews( 'UNESCO', 'nested', 'all-wikis', '2025-01', '2025-03' );
			static::fail( 'Expected ApiException (invalid_scope)' );
		} catch ( ApiException $e ) {
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
