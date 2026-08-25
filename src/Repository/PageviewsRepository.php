<?php

declare( strict_types = 1 );

namespace App\Repository;

use App\Trait\DateParserTrait;
use DateTimeInterface;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use InvalidArgumentException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class PageviewsRepository extends Repository {

	use DateParserTrait;

	protected ?array $projects = null;

	public function __construct(
		readonly ProjectsRepository $projectsRepo,
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
		$startDate = $this->parseDate( $start );
		$endDate = $this->parseDate( $end, true );

		$cacheKey = sprintf(
			'edits.%s.%s.%s.%s.%s',
			$project,
			$startDate->format( 'Ymd' ),
			$endDate->format( 'Ymd' ),
			$totals ? '1' : '0',
			sha1( implode( '|', $pages ) )
		);

		return $this->cache->get(
			$cacheKey,
			function ( ItemInterface $item ) use (
				$project, $dbName, $pages, $startDate, $endDate, $totals
			): array {
				$item->expiresAfter( $this->ttlForRange( $endDate ) );
				return $this->fetchEditData( $project, $dbName, $pages, $startDate, $endDate, $totals );
			}
		);
	}

	protected function fetchEditData(
		string $project,
		string $dbName,
		array $pages,
		DateTimeInterface $startDate,
		DateTimeInterface $endDate,
		bool $totals,
	): array {
		$start = $startDate->format( 'YmdHis' );
		$end = $endDate->format( 'Ymd235959' );

		$conn = $this->replicasClient->getConnection( $dbName );
		$pageIds = $this->getPageIds( $conn, $project, $pages );
		$foundIds = [];
		$output = [];

		foreach ( $pages as $page ) {
			// Keyed like the API this replaced: normalized with spaces.
			$display = str_replace( '_', ' ', $page );
			$pageId = $pageIds[ $page ] ?? null;
			if ( $pageId === null ) {
				$output['pages'][$display] = [
					'num_edits' => 0,
					'num_users' => 0,
					'assessment' => null,
				];
				continue;
			}
			$foundIds[] = $pageId;
			$row = $this->doEditDataQuery( $conn, $project, $pageId, $start, $end )[0];
			if ( array_key_exists( 'assessment', $row ) ) {
				$row['assessment'] = $this->projectsRepo->formatAssessment( $project, $row['assessment'] );
			}
			$output['pages'][$display] = $row;
		}

		if ( count( $foundIds ) > 1 && $totals ) {
			$totalsRow = $this->doEditDataQuery( $conn, $project, $foundIds, $start, $end )[0];
			// An assessment is per-page; meaningless on the aggregate row.
			unset( $totalsRow['assessment'] );
			$output['totals'] = $totalsRow;
		}

		return $output;
	}

	/**
	 * Resolve titles to page IDs from the replicas — one batched query
	 * per namespace, in place of the API round-trip this replaced.
	 * Titles carry their (localized or canonical) namespace prefix and
	 * are normalized the way MediaWiki stores them: underscores, and an
	 * uppercase first letter where the namespace is first-letter cased.
	 *
	 * @return array<string, int> Page IDs keyed by the input title.
	 *   Missing pages are absent.
	 */
	protected function getPageIds( Connection $conn, string $project, array $pages ): array {
		$siteinfo = $this->projectsRepo->getSiteInfo( $project );
		$defaultCase = $siteinfo['general']['case'] ?? 'first-letter';
		$prefixes = [];
		foreach ( $siteinfo['namespaces'] as $ns ) {
			foreach ( [ $ns['*'] ?? '', $ns['canonical'] ?? '' ] as $name ) {
				if ( $name !== '' ) {
					$prefixes[ str_replace( ' ', '_', mb_strtolower( $name ) ) ] =
						[ (int)$ns['id'], $ns['case'] ?? $defaultCase ];
				}
			}
		}

		// Group the db-keyed titles by namespace, remembering which
		// input each came from.
		$byNamespace = [];
		foreach ( $pages as $input ) {
			$title = str_replace( ' ', '_', trim( $input ) );
			$namespace = 0;
			$case = $defaultCase;
			$colon = strpos( $title, ':' );
			if ( $colon !== false ) {
				$prefix = mb_strtolower( substr( $title, 0, $colon ) );
				if ( isset( $prefixes[ $prefix ] ) ) {
					[ $namespace, $case ] = $prefixes[ $prefix ];
					$title = substr( $title, $colon + 1 );
				}
			}
			if ( $case === 'first-letter' && $title !== '' ) {
				$title = mb_strtoupper( mb_substr( $title, 0, 1 ) ) . mb_substr( $title, 1 );
			}
			$byNamespace[ $namespace ][ $title ] = $input;
		}

		$ids = [];
		foreach ( $byNamespace as $namespace => $titles ) {
			$rows = $conn->createQueryBuilder()
				->select( 'page_title', 'page_id' )
				->from( 'page' )
				->where( 'page_namespace = :namespace' )
				->andWhere( 'page_title IN (:titles)' )
				->setParameter( 'namespace', $namespace )
				->setParameter( 'titles', array_keys( $titles ), ArrayParameterType::STRING )
				->fetchAllAssociative();
			foreach ( $rows as $row ) {
				$ids[ $titles[ $row['page_title'] ] ] = (int)$row['page_id'];
			}
		}
		return $ids;
	}

	protected function doEditDataQuery(
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
		if ( $this->projectsRepo->getProjectAssessmentsConfig( $project ) ) {
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
