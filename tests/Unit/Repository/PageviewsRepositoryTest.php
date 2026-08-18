<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Repository\PageviewsRepository;
use App\Repository\ProjectsRepository;
use Doctrine\DBAL\Connection;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class PageviewsRepositoryTest extends TestCase {

	/** @var int Times the replica queries actually ran. */
	private int $fetches = 0;

	/**
	 * The replica queries are faked with fixture data; validation, the
	 * cache layer and the response contract run for real.
	 *
	 * @param array $pageIds Title => page ID, as getPageIds() returns.
	 * @param array $editRow The row every edit-data query returns.
	 */
	private function makeRepo( array $pageIds, array $editRow ): PageviewsRepository {
		$this->fetches = 0;
		$projectsRepo = $this->createStub( ProjectsRepository::class );
		$projectsRepo->method( 'getProjects' )
			->willReturn( [ 'en.wikipedia' => 'enwiki' ] );
		$projectsRepo->method( 'getAssessmentsConfig' )
			->willReturn( [ 'config' => [] ] );

		$replicasClient = $this->createStub( ReplicasClient::class );
		return new class ( $pageIds, $editRow, $this, $projectsRepo, $replicasClient )
			extends PageviewsRepository {
			public function __construct(
				private readonly array $pageIds,
				private readonly array $editRow,
				private readonly PageviewsRepositoryTest $test,
				ProjectsRepository $projectsRepo,
				ReplicasClient $replicasClient,
			) {
				parent::__construct( $projectsRepo, new ArrayAdapter(), $replicasClient );
			}

			protected function getPageIds( Connection $conn, string $project, array $pages ): array {
				$this->test->countFetch();
				return array_intersect_key(
					$this->pageIds,
					array_flip( $pages )
				);
			}

			protected function doEditDataQuery(
				Connection $conn,
				string $project,
				int|array $pageIds,
				string $start,
				string $end
			): array {
				return [ $this->editRow ];
			}
		};
	}

	public function countFetch(): void {
		$this->fetches++;
	}

	public function testEditDataContractAndMissingPages(): void {
		$repo = $this->makeRepo(
			[ 'Domino_Park' => 123, 'Talk:Cat' => 456 ],
			[ 'num_edits' => 7, 'num_users' => 3 ]
		);

		$result = $repo->getEditData(
			'en.wikipedia.org',
			[ 'Domino_Park', 'Talk:Cat', 'No_such_page' ],
			'2026-06-01',
			'2026-06-30',
			true
		);

		static::assertSame( [
			'pages' => [
				// Keyed like the API lookup this replaced: spaces.
				'Domino Park' => [ 'num_edits' => 7, 'num_users' => 3 ],
				'Talk:Cat' => [ 'num_edits' => 7, 'num_users' => 3 ],
				'No such page' => [
					'num_edits' => 0,
					'num_users' => 0,
					'assessment' => null,
				],
			],
			'totals' => [ 'num_edits' => 7, 'num_users' => 3 ],
		], $result );
	}

	public function testEditDataIsCached(): void {
		$repo = $this->makeRepo(
			[ 'Cat' => 1 ],
			[ 'num_edits' => 5, 'num_users' => 2 ]
		);
		$args = [ 'en.wikipedia.org', [ 'Cat' ], '2026-06-01', '2026-06-30' ];

		$first = $repo->getEditData( ...$args );
		$second = $repo->getEditData( ...$args );

		static::assertSame( $first, $second );
		static::assertSame( 1, $this->fetches );

		// A different page set is its own cache entry.
		$repo->getEditData( 'en.wikipedia.org', [ 'Dog' ], '2026-06-01', '2026-06-30' );
		static::assertSame( 2, $this->fetches );
	}

	public function testInvalidProject(): void {
		$repo = $this->makeRepo( [], [] );
		$this->expectException( InvalidArgumentException::class );
		$repo->getEditData( 'not.a.project', [ 'Cat' ], '2026-06-01', '2026-06-30' );
	}
}
