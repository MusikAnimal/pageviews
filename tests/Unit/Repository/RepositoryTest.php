<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Exception\ApiException;
use App\Repository\Repository;
use DateTimeImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RepositoryTest extends TestCase {

	private Repository $repository;

	protected function setUp(): void {
		$this->repository = new class extends Repository {
			public function ttl( DateTimeImmutable $end ): int {
				return $this->ttlForRange( $end );
			}

			public function reject(): never {
				$this->invalidParameter( 'unknown_project', 'Nope.', [ 'invalid-project' ] );
			}
		};
	}

	#[DataProvider( 'provideProjects' )]
	public function testNormalizeProject( string $input, string $expected ): void {
		static::assertSame( $expected, $this->repository->normalizeProject( $input ) );
	}

	public static function provideProjects(): array {
		return [
			[ 'en.wikipedia.org', 'en.wikipedia' ],
			[ 'en.wikipedia', 'en.wikipedia' ],
			[ 'https://en.wikipedia.org', 'en.wikipedia' ],
			[ 'https://en.wikipedia.org/', 'en.wikipedia' ],
			[ ' commons.wikimedia.org ', 'commons.wikimedia' ],
			// .org only strips as a suffix.
			[ 'org.wikipedia.org', 'org.wikipedia' ],
		];
	}

	public function testTtlForRange(): void {
		// A range still receiving data caches briefly; a past one, long.
		static::assertSame( 600, $this->repository->ttl( new DateTimeImmutable( 'yesterday' ) ) );
		static::assertSame( 86400, $this->repository->ttl( new DateTimeImmutable( '-2 months' ) ) );
	}

	public function testInvalidParameter(): void {
		try {
			$this->repository->reject();
			static::fail( 'Expected ApiException' );
		} catch ( ApiException $e ) {
			static::assertSame( 'unknown_project', $e->errorCode );
			static::assertSame( [ 'invalid-project' ], $e->i18n );
			static::assertSame( 400, $e->status );
		}
	}
}
