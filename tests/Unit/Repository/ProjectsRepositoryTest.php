<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Repository;

use App\Repository\ProjectsRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class ProjectsRepositoryTest extends TestCase {

	/**
	 * A trimmed-down XTools assessments config (the real one carries
	 * the same fields); the class map is ordered best-first, the
	 * importance entries carry their own weights.
	 */
	private function makeRepo(): ProjectsRepository {
		$config = [ 'config' => [
			'en.wikipedia.org' => [
				'class' => [
					'FA' => [
						'badge' => 'b/bc/Featured_article_star.svg',
						'color' => '#9CBDFF',
						'category' => 'Category:FA-Class articles',
					],
					'GA' => [
						'badge' => '9/94/Symbol_support_vote.svg',
						'color' => '#66FF66',
						'category' => 'Category:GA-Class articles',
					],
					'Stub' => [
						'color' => '#FFA4A4',
						'category' => 'Category:Stub-Class articles',
					],
				],
				'importance' => [
					'Top' => [
						'color' => '#ff97ff',
						'category' => 'Category:Top-importance articles',
						'weight' => 5,
					],
				],
			],
			'fr.wikipedia.org' => [ 'class' => [], 'importance' => [] ],
		] ];
		return new ProjectsRepository(
			new MockHttpClient( new MockResponse( json_encode( $config ) ) ),
			new ArrayAdapter(),
			$this->createStub( ReplicasClient::class ),
		);
	}

	public function testFormatAssessment(): void {
		$repo = $this->makeRepo();

		// Best class: full badge URL, category link, top weight (the
		// config lists classes best-first, so position 0 of 3 → 3).
		static::assertSame( [
			'class' => 'FA',
			'badge' => 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Featured_article_star.svg',
			'color' => '#9CBDFF',
			'category' => 'Category:FA-Class articles',
			'weight' => 3,
		], $repo->formatAssessment( 'en.wikipedia', 'FA' ) );

		// Badge-less class, lowest weight.
		static::assertSame( [
			'class' => 'Stub',
			'badge' => null,
			'color' => '#FFA4A4',
			'category' => 'Category:Stub-Class articles',
			'weight' => 1,
		], $repo->formatAssessment( 'en.wikipedia', 'Stub' ) );

		// A class the config doesn't know keeps its raw name only.
		static::assertSame( [
			'class' => 'Unassessed',
			'badge' => null,
			'color' => null,
			'category' => null,
			'weight' => null,
		], $repo->formatAssessment( 'en.wikipedia', 'Unassessed' ) );

		static::assertNull( $repo->formatAssessment( 'en.wikipedia', null ) );
		static::assertNull( $repo->formatAssessment( 'en.wikipedia', '' ) );
	}

	public function testFormatImportance(): void {
		$repo = $this->makeRepo();

		static::assertSame( [
			'importance' => 'Top',
			'color' => '#ff97ff',
			'category' => 'Category:Top-importance articles',
			'weight' => 5,
		], $repo->formatImportance( 'en.wikipedia', 'Top' ) );

		static::assertSame( [
			'importance' => 'Unknown',
			'color' => null,
			'category' => null,
			'weight' => null,
		], $repo->formatImportance( 'en.wikipedia', 'Unknown' ) );

		static::assertNull( $repo->formatImportance( 'en.wikipedia', null ) );
		static::assertNull( $repo->formatImportance( 'en.wikipedia', '' ) );
	}

	public function testGetAssessmentWikis(): void {
		$repo = $this->makeRepo();

		static::assertSame(
			[ 'en.wikipedia', 'fr.wikipedia' ],
			$repo->getAssessmentWikis()
		);
	}
}
