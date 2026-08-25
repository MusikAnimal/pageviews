<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Exception\ApiException;
use App\Repository\MassviewsRepository;
use App\Repository\ProjectsRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\Exception\TimeoutException;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Throwable;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class MassviewsRepositoryTest extends TestCase {

	/** @var array<int, string[]> Categories each subcategory query was given. */
	private array $subcatQueries = [];
	/** @var string[]|null Categories the members query was given. */
	private ?array $memberQuery = null;

	/**
	 * The replica queries are faked with fixture rows; everything else
	 * (validation, recursion, deduplication, the response contract)
	 * runs for real.
	 *
	 * @param array $subcatsByParent Parent category => subcategory titles.
	 * @param array $members Member rows (title + namespace).
	 */
	private function makeRepo( array $subcatsByParent, array $members ): MassviewsRepository {
		$projectsRepo = $this->createStub( ProjectsRepository::class );
		$projectsRepo->method( 'getProjects' )
			->willReturn( [ 'en.wikipedia' => 'enwiki' ] );
		$replicasClient = $this->createStub( ReplicasClient::class );
		$httpClient = $this->createStub( HttpClientInterface::class );

		return new class ( $subcatsByParent, $members, $this, $projectsRepo, $replicasClient, $httpClient ) extends MassviewsRepository {
			public function __construct(
				private readonly array $subcatsByParent,
				private readonly array $members,
				private readonly MassviewsRepositoryTest $test,
				ProjectsRepository $projectsRepo,
				ReplicasClient $replicasClient,
				HttpClientInterface $httpClient,
			) {
				parent::__construct( $projectsRepo, $replicasClient, new ArrayAdapter(), $httpClient );
			}

			protected function querySubcategories( string $dbName, array $categories ): array {
				$this->test->recordSubcatQuery( $categories );
				return array_merge( ...array_map(
					fn ( string $category ): array => $this->subcatsByParent[ $category ] ?? [],
					$categories
				) );
			}

			protected function queryCategoryMembers( string $dbName, array $categories ): array {
				$this->test->recordMemberQuery( $categories );
				return $this->members;
			}
		};
	}

	public function recordSubcatQuery( array $categories ): void {
		$this->subcatQueries[] = $categories;
	}

	public function recordMemberQuery( array $categories ): void {
		$this->memberQuery = $categories;
	}

	public function testContractShape(): void {
		$repo = $this->makeRepo( [], [
			[ 'title' => 'Run-DMC', 'namespace' => '0' ],
			[ 'title' => 'Beastie_Boys', 'namespace' => '0' ],
			// Duplicate row (a page in several matched categories).
			[ 'title' => 'Run-DMC', 'namespace' => '0' ],
			[ 'title' => 'Run-DMC', 'namespace' => '1' ],
		] );

		$result = $repo->getCategoryMembers( 'en.wikipedia.org', 'Hip-hop groups' );

		static::assertSame( [
			'project' => 'en.wikipedia',
			'category' => 'Hip-hop_groups',
			'recursive' => false,
			'limit' => 20000,
			'pages' => [
				[ 'title' => 'Run-DMC', 'namespace' => 0 ],
				[ 'title' => 'Beastie_Boys', 'namespace' => 0 ],
				[ 'title' => 'Run-DMC', 'namespace' => 1 ],
			],
		], $result );
		// Non-recursive: only the category itself, no subcat queries.
		static::assertSame( [ 'Hip-hop_groups' ], $this->memberQuery );
		static::assertSame( [], $this->subcatQueries );
	}

	public function testRecursionDeduplicatesAndDescends(): void {
		$repo = $this->makeRepo(
			[
				// A → B, C; B → C (already seen) and A (cycle).
				'A' => [ 'B', 'C' ],
				'B' => [ 'C', 'A' ],
			],
			[ [ 'title' => 'Page', 'namespace' => '0' ] ]
		);

		$result = $repo->getCategoryMembers( 'en.wikipedia', 'A', true );

		static::assertTrue( $result['recursive'] );
		// The members query covers the whole deduplicated tree.
		static::assertSame( [ 'A', 'B', 'C' ], $this->memberQuery );
		// Wave 1 searched A; wave 2 searched the new B and C; nothing
		// new remained, so the recursion stopped well before the depth
		// cap.
		static::assertSame( [ [ 'A' ], [ 'B', 'C' ] ], $this->subcatQueries );
	}

	public function testInvalidProject(): void {
		$repo = $this->makeRepo( [], [] );
		$this->expectException( ApiException::class );
		$repo->getCategoryMembers( 'not.a.project', 'Category' );
	}

	public function testMissingCategory(): void {
		$repo = $this->makeRepo( [], [] );
		$this->expectException( ApiException::class );
		$repo->getCategoryMembers( 'en.wikipedia.org', ' _ ' );
	}

	/**
	 * @param array $rows Raw hashtag-tool rows.
	 * @param ?Throwable $throws Failure fetchHashtagRows raises.
	 */
	private function makeHashtagRepo( array $rows, ?Throwable $throws = null ): MassviewsRepository {
		$projectsRepo = $this->createStub( ProjectsRepository::class );
		$replicasClient = $this->createStub( ReplicasClient::class );
		$httpClient = $this->createStub( HttpClientInterface::class );

		return new class ( $rows, $throws, $projectsRepo, $replicasClient, $httpClient ) extends MassviewsRepository {
			public int $fetches = 0;

			public function __construct(
				private readonly array $rows,
				private readonly ?Throwable $throws,
				ProjectsRepository $projectsRepo,
				ReplicasClient $replicasClient,
				HttpClientInterface $httpClient,
			) {
				parent::__construct( $projectsRepo, $replicasClient, new ArrayAdapter(), $httpClient );
			}

			protected function fetchHashtagRows( string $tag ): array {
				$this->fetches++;
				if ( $this->throws ) {
					throw $this->throws;
				}
				return $this->rows;
			}
		};
	}

	public function testHashtagPagesDedupeAndCache(): void {
		$repo = $this->makeHashtagRepo( [
			[ 'Domain' => 'fr.wikipedia.org', 'Page_title' => 'Jacques Servin' ],
			[ 'Domain' => 'fr.wikipedia.org', 'Page_title' => 'Jacques Servin' ],
			[ 'Domain' => 'en.wikipedia.org', 'Page_title' => 'Jacques Servin' ],
			[ 'Domain' => '', 'Page_title' => 'Orphan row' ],
		] );

		$result = $repo->getHashtagPages( '#moiswikif' );

		static::assertSame( 'moiswikif', $result['tag'] );
		static::assertSame( [
			[ 'project' => 'fr.wikipedia.org', 'title' => 'Jacques_Servin' ],
			[ 'project' => 'en.wikipedia.org', 'title' => 'Jacques_Servin' ],
		], $result['pages'] );

		// A repeat request is served from the cache.
		$repo->getHashtagPages( 'moiswikif' );
		static::assertSame( 1, $repo->fetches );
	}

	public function testHashtagTimeoutNamesTheUpstream(): void {
		$repo = $this->makeHashtagRepo( [], new TimeoutException( 'timed out' ) );
		try {
			$repo->getHashtagPages( 'wpwp' );
			static::fail( 'Expected an ApiException.' );
		} catch ( ApiException $e ) {
			static::assertSame( 'upstream_timeout', $e->errorCode );
			static::assertSame( [ 'api-error-upstream-timeout', 'Hashtags API' ], $e->i18n );
			static::assertSame( 'hashtags', $e->upstream );
			static::assertTrue( $e->retryable );
		}
	}

	public function testHashtagUnreachableNamesTheUpstream(): void {
		$repo = $this->makeHashtagRepo( [], new TransportException( 'Connection refused' ) );
		try {
			$repo->getHashtagPages( 'wpwp' );
			static::fail( 'Expected an ApiException.' );
		} catch ( ApiException $e ) {
			static::assertSame( 'upstream_unreachable', $e->errorCode );
			static::assertSame( [ 'api-error-upstream-unreachable', 'Hashtags API' ], $e->i18n );
			static::assertTrue( $e->retryable );
		}
	}

	public function testHashtagRequiresATag(): void {
		$repo = $this->makeHashtagRepo( [] );
		$this->expectException( ApiException::class );
		$repo->getHashtagPages( '  # ' );
	}
}
