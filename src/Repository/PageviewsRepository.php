<?php

declare( strict_types = 1 );

namespace App\Repository;

use App\Trait\DateParserTrait;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use InvalidArgumentException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class PageviewsRepository extends Repository {

	use DateParserTrait;

	protected ?array $projects = null;
	protected ?array $assessmentsConfig = null;

	public function __construct(
		readonly ProjectsRepository $projectsRepo,
		private readonly HttpClientInterface $httpClient,
		private readonly CacheInterface $cache,
		private readonly ReplicasClient $replicasClient,
	) {
	}

	/**
	 * Lazily fetched so that instantiating the service (e.g. in tests or
	 * container warmup) makes no HTTP or database calls.
	 */
	private function getProjects(): array {
		return $this->projects ??= $this->projectsRepo->getProjects();
	}

	private function getAssessmentsConfig(): array {
		return $this->assessmentsConfig ??= $this->projectsRepo->getAssessmentsConfig();
	}

	public function getEditData(
		string $project,
		array $pages,
		string $start,
		string $end,
		bool $totals = false,
	): array {
		$project = $this->normalizeProject( $project );
		$dbName = $this->getProjects()[ $project ] ?? null;
		if ( !$dbName ) {
			throw new InvalidArgumentException( "Project $project is not a valid project or is unsupported." );
		}
		$start = $this->parseDate( $start )->format( 'YmdHis' );
		$end = $this->parseDate( $end, true )->format( 'Ymd235959' );

		// Get page IDs for the given page titles.
		$apiPages = $this->httpClient->request( 'GET', "https://$project.org/w/api.php", [
			'query' => [
				'action' => 'query',
				'titles' => implode( '|', $pages ),
				'format' => 'json',
			],
		] )->toArray()['query']['pages'];

		$conn = $this->replicasClient->getConnection( $dbName );
		$pageIds = [];
		$output = [];

		foreach ( $apiPages as $page ) {
			if ( isset( $page['missing'] ) ) {
				$output['pages'][$page['title']] = [
					'num_edits' => 0,
					'num_users' => 0,
					'assessment' => null,
				];
				continue;
			}
			$pageIds[] = $page['pageid'];
			$row = $this->doEditDataQuery( $conn, $project, $page['pageid'], $start, $end )[0];
			if ( array_key_exists( 'assessment', $row ) ) {
				$row['assessment'] = $this->formatAssessment( $project, $row['assessment'] );
			}
			$output['pages'][$page['title']] = $row;
		}

		if ( count( $pageIds ) > 1 && $totals ) {
			$totalsRow = $this->doEditDataQuery( $conn, $project, $pageIds, $start, $end )[0];
			// An assessment is per-page; meaningless on the aggregate row.
			unset( $totalsRow['assessment'] );
			$output['totals'] = $totalsRow;
		}

		return $output;
	}

	/**
	 * The PageAssessments class config for a project, or null if the
	 * project doesn't use assessments. The XTools response is keyed by
	 * the full domain including .org, under a 'config' wrapper.
	 */
	private function getProjectAssessmentsConfig( string $project ): ?array {
		return $this->getAssessmentsConfig()['config'][ "$project.org" ] ?? null;
	}

	/**
	 * Expand a raw pa_class value into a display-ready structure with
	 * the badge image URL and color from the project's config.
	 *
	 * @return array{class: string, badge: ?string, color: ?string}|null
	 */
	private function formatAssessment( string $project, ?string $class ): ?array {
		if ( $class === null || $class === '' ) {
			return null;
		}
		$classConfig = $this->getProjectAssessmentsConfig( $project )['class'][ $class ] ?? [];
		return [
			'class' => $class,
			'badge' => isset( $classConfig['badge'] ) ?
				'https://upload.wikimedia.org/wikipedia/commons/' . $classConfig['badge'] :
				null,
			'color' => $classConfig['color'] ?? null,
		];
	}

	private function doEditDataQuery(
		Connection $conn,
		string $project,
		int|array $pageIds,
		string $start,
		string $end
	): array {
		$pageIds = is_array( $pageIds ) ? $pageIds : [ $pageIds ];
		$qb = $conn->createQueryBuilder()
			->select( 'COUNT(*) AS num_edits', 'COUNT(DISTINCT rev_actor) AS num_users' )
			->from( 'revision' )
			->where( 'rev_page IN (:pages)' )
			->andWhere( 'rev_timestamp >= :start' )
			->andWhere( 'rev_timestamp <= :end' )
			->setParameter( 'pages', $pageIds, ArrayParameterType::INTEGER )
			->setParameter( 'start', $start )
			->setParameter( 'end', $end );
		if ( $this->getProjectAssessmentsConfig( $project ) ) {
			$qb->addSelect( '(' . $conn->createQueryBuilder()
					->select( 'pa_class' )
					->from( 'page_assessments')
					->where( 'pa_page_id = rev_page' )
					->andWhere( "pa_class != ''" )
					->getSQL() . ' LIMIT 1) AS assessment'
			);
		}
		return $qb->fetchAllAssociative();
	}
}
