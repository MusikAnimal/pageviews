<?php

declare( strict_types = 1 );

namespace App\Repository;

use Doctrine\DBAL\Connection;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

/**
 * Pages created by a user, from the Toolforge replicas. Pairs with
 * UserviewsController; the client fans the resulting list out over the
 * batched pageviews metrics endpoint.
 */
class UserviewsRepository extends Repository {

	/**
	 * Result cap, matching the legacy tool. The response reports it so
	 * the client can warn when a set was likely truncated.
	 */
	public const MAX_PAGES = 20000;

	public function __construct(
		private readonly ProjectsRepository $projectsRepo,
		private readonly ReplicasClient $replicasClient,
		private readonly CacheInterface $cacheLists,
	) {
	}

	/**
	 * @param string $project e.g. en.wikipedia.org
	 * @param string $username Spaces or underscores.
	 * @param string $namespace A numeric namespace ID, or 'all'.
	 * @param string $redirects '0' excludes redirects, '1' returns only
	 *   redirects, '2' returns both (legacy vocabulary).
	 * @return array{project: string, user: string, namespace: string,
	 *   redirects: string, limit: int, pages: array}
	 */
	public function getPagesCreated(
		string $project,
		string $username,
		string $namespace = 'all',
		string $redirects = '0',
	): array {
		$project = $this->normalizeProject( $project );
		$dbName = $this->projectsRepo->getProjects()[ $project ] ?? null;
		if ( !$dbName ) {
			$this->invalidParameter(
				'invalid_project',
				"Project $project is not a valid project or is unsupported.",
				[ 'invalid-project', $project ]
			);
		}

		$username = trim( str_replace( '_', ' ', $username ) );
		if ( $username === '' ) {
			$this->invalidParameter( 'invalid_user', 'A user parameter is required.' );
		}
		// Usernames are stored with an uppercase first letter.
		$username = mb_strtoupper( mb_substr( $username, 0, 1 ) ) . mb_substr( $username, 1 );

		if ( $namespace !== 'all' && !ctype_digit( $namespace ) ) {
			$this->invalidParameter(
				'invalid_namespace',
				"namespace must be a namespace ID or 'all', got: $namespace"
			);
		}
		if ( !in_array( $redirects, [ '0', '1', '2' ], true ) ) {
			$this->invalidParameter(
				'invalid_redirects',
				"redirects must be one of 0 (exclude), 1 (only) or 2 (include), got: $redirects"
			);
		}

		$cacheKey = 'pages-created.' . md5( "$dbName|$username|$namespace|$redirects" );
		return $this->cacheLists->get(
			$cacheKey,
			function ( ItemInterface $item ) use ( $project, $dbName, $username, $namespace, $redirects ) {
				$item->expiresAfter( 600 );
				// Fetched in the same query as the page list, where the
				// project uses PageAssessments at all.
				$withAssessments = (bool)$this->projectsRepo->getProjectAssessmentsConfig( $project );
				$rows = $this->queryPagesCreated(
					$dbName, $username, $namespace, $redirects, $withAssessments
				);

				return [
					'project' => $project,
					'user' => $username,
					'namespace' => $namespace,
					'redirects' => $redirects,
					'limit' => self::MAX_PAGES,
					'pages' => array_map( fn ( array $row ) => [
						// Underscored and without the namespace prefix,
						// as stored; the client localizes via siteinfo.
						'title' => (string)$row['title'],
						'namespace' => (int)$row['namespace'],
						'created' => preg_replace(
							'/^(\d{4})(\d{2})(\d{2}).*$/',
							'$1-$2-$3',
							(string)$row['timestamp']
						),
						'redirect' => (bool)$row['redirect'],
						'length' => (int)$row['length'],
						'assessment' => $this->projectsRepo->formatAssessment(
							$project, $row['assessment'] ?? null
						),
					], $rows ),
				];
			}
		);
	}

	/**
	 * The pages whose first revision belongs to the user. Kept as its
	 * own (overridable) unit so tests can supply fixture rows without a
	 * live replica connection.
	 */
	protected function queryPagesCreated(
		string $dbName,
		string $username,
		string $namespace,
		string $redirects,
		bool $withAssessments = false,
	): array {
		$conn = $this->replicasClient->getConnection( $dbName );
		$qb = $conn->createQueryBuilder()
			->select(
				'page_title AS title',
				'page_namespace AS namespace',
				// Imports and history merges can leave several parentless
				// revisions per page; group to one row, dated by the first.
				'MIN(rev_timestamp) AS timestamp',
				'page_is_redirect AS redirect',
				'page_len AS length'
			)
			->from( 'page', 'page' )
			// revision_userindex is the replica view of revision indexed
			// for actor lookups.
			->join( 'page', 'revision_userindex', 'revision', 'page_id = rev_page' )
			->join( 'revision', 'actor', 'actor', 'actor_id = rev_actor' )
			->where( 'actor_name = :username' )
			// rev_parent_id = 0 marks a page's first revision; imported
			// revisions can lack a timestamp, hence the sanity guard.
			->andWhere( 'rev_parent_id = 0' )
			->andWhere( 'rev_timestamp > 1' )
			->groupBy( 'page_id' )
			->setParameter( 'username', $username )
			->setMaxResults( self::MAX_PAGES );
		if ( $namespace !== 'all' ) {
			$qb->andWhere( 'page_namespace = :namespace' )
				->setParameter( 'namespace', (int)$namespace );
		}
		if ( $redirects === '0' ) {
			$qb->andWhere( 'page_is_redirect = 0' );
		} elseif ( $redirects === '1' ) {
			$qb->andWhere( 'page_is_redirect = 1' );
		}
		if ( $withAssessments ) {
			// Piggybacked on the page list rather than fetched
			// per-page afterwards. Correlated on the grouped page_id
			// (like PageviewsRepository::doEditDataQuery): a page can
			// have one assessment per WikiProject; any non-empty one
			// will do.
			$qb->addSelect( '(' . $conn->createQueryBuilder()
					->select( 'pa_class' )
					->from( 'page_assessments' )
					->where( 'pa_page_id = page_id' )
					->andWhere( "pa_class != ''" )
					->getSQL() . ' LIMIT 1) AS assessment'
			);
		}
		return $qb->fetchAllAssociative();
	}
}
