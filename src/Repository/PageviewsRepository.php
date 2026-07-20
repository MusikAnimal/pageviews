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

class PageviewsRepository {

	use DateParserTrait;

	protected array $projects;
	protected array $assessmentsConfig;

	public function __construct(
		readonly ProjectsRepository $projectsRepo,
		private readonly HttpClientInterface $httpClient,
		private readonly CacheInterface $cache,
		private readonly ReplicasClient $replicasClient,
	) {
		$this->projects = $projectsRepo->getProjects();
		$this->assessmentsConfig = $projectsRepo->getAssessmentsConfig();
	}

	public function getEditData(
		string $project,
		array $pages,
		string $start,
		string $end,
		bool $totals = false,
	): array {
		$project = preg_replace( '/\.org$/', '', $project );
		$dbName = $this->projects[ $project ] ?? null;
		if ( !$dbName ) {
			throw new InvalidArgumentException( "Project $dbName is not a valid database name or is unsupported." );
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
			$output['pages'][$page['title']] = $this->doEditDataQuery( $conn, $project, $page['pageid'], $start, $end )[0];
		}

		if ( count( $pageIds ) > 1 && $totals ) {
			$output['totals'] = $this->doEditDataQuery( $conn, $project, $pageIds, $start, $end )[0];
		}

		return $output;
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
		if ( $this->assessmentsConfig[$project] ?? false ) {
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
