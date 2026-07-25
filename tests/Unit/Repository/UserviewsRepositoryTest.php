<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Exception\ApiException;
use App\Repository\ProjectsRepository;
use App\Repository\UserviewsRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class UserviewsRepositoryTest extends TestCase {

	/** @var array|null Arguments the fake replica query was called with. */
	private ?array $queryArgs = null;

	/**
	 * The replica query is faked with fixture rows; everything else
	 * (validation, normalization, the response contract) runs for real.
	 */
	private function makeRepo( array $rows ): UserviewsRepository {
		$projectsRepo = $this->createStub( ProjectsRepository::class );
		$projectsRepo->method( 'getProjects' )
			->willReturn( [ 'en.wikipedia' => 'enwiki' ] );

		$replicasClient = $this->createStub( ReplicasClient::class );
		return new class ( $rows, $this, $projectsRepo, $replicasClient ) extends UserviewsRepository {
			public function __construct(
				private readonly array $rows,
				private readonly UserviewsRepositoryTest $test,
				ProjectsRepository $projectsRepo,
				ReplicasClient $replicasClient,
			) {
				parent::__construct( $projectsRepo, $replicasClient, new ArrayAdapter() );
			}

			protected function queryPagesCreated(
				string $dbName,
				string $username,
				string $namespace,
				string $redirects,
			): array {
				$this->test->setQueryArgs( func_get_args() );
				return $this->rows;
			}
		};
	}

	public function setQueryArgs( array $args ): void {
		$this->queryArgs = $args;
	}

	public function testContractShape(): void {
		$repo = $this->makeRepo( [
			[
				'title' => 'Vector_field_reconstruction',
				'namespace' => '0',
				'timestamp' => '20260102030405',
				'redirect' => '0',
				'length' => '1234',
			],
			[
				'title' => 'Sandbox',
				'namespace' => '2',
				'timestamp' => '20250607080910',
				'redirect' => '1',
				'length' => '56',
			],
		] );

		$result = $repo->getPagesCreated( 'en.wikipedia.org', 'jimbo_wales', '0', '2' );

		static::assertSame( [
			'project' => 'en.wikipedia',
			'user' => 'Jimbo wales',
			'namespace' => '0',
			'redirects' => '2',
			'limit' => 20000,
			'pages' => [
				[
					'title' => 'Vector_field_reconstruction',
					'namespace' => 0,
					'created' => '2026-01-02',
					'redirect' => false,
					'length' => 1234,
				],
				[
					'title' => 'Sandbox',
					'namespace' => 2,
					'created' => '2025-06-07',
					'redirect' => true,
					'length' => 56,
				],
			],
		], $result );
		// Underscores become spaces and the first letter is uppercased
		// before the query, like the legacy tool.
		static::assertSame( [ 'enwiki', 'Jimbo wales', '0', '2' ], $this->queryArgs );
	}

	public function testInvalidProject(): void {
		$repo = $this->makeRepo( [] );
		$this->expectException( ApiException::class );
		$repo->getPagesCreated( 'not.a.project', 'Jimbo Wales' );
	}

	public function testMissingUser(): void {
		$repo = $this->makeRepo( [] );
		$this->expectException( ApiException::class );
		$repo->getPagesCreated( 'en.wikipedia.org', '_' );
	}

	public function testInvalidNamespace(): void {
		$repo = $this->makeRepo( [] );
		$this->expectException( ApiException::class );
		$repo->getPagesCreated( 'en.wikipedia.org', 'Jimbo Wales', 'talk' );
	}

	public function testInvalidRedirects(): void {
		$repo = $this->makeRepo( [] );
		$this->expectException( ApiException::class );
		$repo->getPagesCreated( 'en.wikipedia.org', 'Jimbo Wales', 'all', '3' );
	}
}
