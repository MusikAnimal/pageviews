<?php

declare( strict_types = 1 );

namespace App\Repository;

use Doctrine\DBAL\ArrayParameterType;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

/**
 * Page lists for the Massviews sources, from the Toolforge replicas.
 * Pairs with MassviewsController; the client fans the resulting list
 * out over the batched pageviews metrics endpoint.
 */
class MassviewsRepository extends Repository {

	/**
	 * Result cap, matching the legacy tool. The response reports it so
	 * the client can warn when a set was likely truncated.
	 */
	public const MAX_PAGES = 20000;

	/**
	 * Subcategory recursion caps, matching the legacy replica API:
	 * breadth-first up to this many levels deep…
	 */
	private const MAX_DEPTH = 5;
	/** …with at most this many new subcategories per level. */
	private const MAX_SUBCATS_PER_WAVE = 5000;

	public function __construct(
		private readonly ProjectsRepository $projectsRepo,
		private readonly ReplicasClient $replicasClient,
		private readonly CacheInterface $cacheLists,
		private readonly HttpClientInterface $httpClient,
	) {
	}

	/**
	 * The unique pages with an edit tagged with the hashtag, across
	 * all wikis, from the Wikimedia hashtag search tool. Proxied
	 * server-side because the tool's API sends no CORS headers.
	 *
	 * @param string $tag With or without the leading #.
	 * @return array{tag: string, pages: array<array{project: string, title: string}>}
	 */
	public function getHashtagPages( string $tag ): array {
		$tag = ltrim( trim( $tag ), '#' );
		if ( $tag === '' ) {
			$this->invalidParameter(
				'missing_param',
				'The query parameter is required.',
				[ 'param-error-3', 'query' ]
			);
		}

		return $this->cacheLists->get(
			'hashtag.' . md5( $tag ),
			function ( ItemInterface $item ) use ( $tag ): array {
				// Name the actual upstream in the envelope — the
				// listener's fallbacks blame the Pageviews API.
				try {
					$rows = $this->fetchHashtagRows( $tag );
				} catch ( HttpClientExceptionInterface $e ) {
					$this->upstreamFailure( $e, 'Hashtags API', 'hashtags' );
				}

				// One row per edit; several edits often hit the same
				// page. Dedupe per wiki + title.
				$pages = [];
				foreach ( $rows as $row ) {
					$project = (string)( $row['Domain'] ?? '' );
					$title = str_replace( ' ', '_', (string)( $row['Page_title'] ?? '' ) );
					if ( $project === '' || $title === '' ) {
						continue;
					}
					$pages[ "$project|$title" ] = [ 'project' => $project, 'title' => $title ];
				}
				return [ 'tag' => $tag, 'pages' => array_values( $pages ) ];
			}
		);
	}

	/**
	 * @return array Raw per-edit rows from the hashtag tool.
	 */
	protected function fetchHashtagRows( string $tag ): array {
		return $this->httpClient->request( 'GET', 'https://hashtags.wmcloud.org/json/', [
			'query' => [ 'query' => $tag ],
		] )->toArray()['Rows'] ?? [];
	}

	/**
	 * The members of a category (pages and files, all namespaces),
	 * optionally recursing through its subcategories.
	 *
	 * @param string $project e.g. en.wikipedia.org
	 * @param string $category Without the namespace prefix; spaces or
	 *   underscores.
	 * @param bool $recursive Include all subcategories' members.
	 * @return array{project: string, category: string, recursive: bool,
	 *   limit: int, pages: array}
	 */
	public function getCategoryMembers(
		string $project,
		string $category,
		bool $recursive = false,
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

		$category = trim( str_replace( ' ', '_', $category ), " _" );
		if ( $category === '' ) {
			$this->invalidParameter(
				'missing_param',
				'The category parameter is required.',
				[ 'param-error-3', 'category' ]
			);
		}

		$cacheKey = 'category-members.' . md5( "$dbName|$category|" . (int)$recursive );
		return $this->cacheLists->get(
			$cacheKey,
			function ( ItemInterface $item ) use ( $project, $dbName, $category, $recursive ) {
				$item->expiresAfter( 600 );

				$categories = [ $category ];
				if ( $recursive ) {
					$search = [ $category ];
					for ( $depth = 0; $depth < self::MAX_DEPTH && $search; $depth++ ) {
						$subcats = $this->querySubcategories( $dbName, $search );
						// Only descend into unseen categories (cycles are
						// legal in the category graph).
						$search = array_slice(
							array_values( array_unique( array_diff( $subcats, $categories ) ) ),
							0,
							self::MAX_SUBCATS_PER_WAVE
						);
						$categories = array_merge( $categories, $search );
					}
				}

				$rows = $this->queryCategoryMembers( $dbName, $categories );
				$pages = [];
				foreach ( $rows as $row ) {
					// A page can be in several matched categories.
					$pages[ $row['namespace'] . ':' . $row['title'] ] = [
						'title' => (string)$row['title'],
						'namespace' => (int)$row['namespace'],
					];
				}

				return [
					'project' => $project,
					'category' => $category,
					'recursive' => $recursive,
					'limit' => self::MAX_PAGES,
					'pages' => array_values( $pages ),
				];
			}
		);
	}

	/**
	 * The pages assessed under a WikiProject (as recorded by the
	 * PageAssessments extension), with each page's quality class and
	 * importance formatted for display — intended to replace on-wiki
	 * "Popular pages" reports.
	 *
	 * @param string $project e.g. en.wikipedia.org
	 * @param string $name The WikiProject name as stored by
	 *   PageAssessments (usually without a "WikiProject" prefix);
	 *   spaces or underscores.
	 * @return array{project: string, name: string, limit: int, pages: array}
	 */
	public function getWikiprojectPages( string $project, string $name ): array {
		$project = $this->normalizeProject( $project );
		$dbName = $this->projectsRepo->getProjects()[ $project ] ?? null;
		if ( !$dbName ) {
			$this->invalidParameter(
				'invalid_project',
				"Project $project is not a valid project or is unsupported.",
				[ 'invalid-project', $project ]
			);
		}
		if ( !$this->projectsRepo->getProjectAssessmentsConfig( $project ) ) {
			$this->invalidParameter(
				'unsupported_project',
				"Project $project does not use the PageAssessments extension.",
				[ 'massviews-wikiproject-unsupported', $project ]
			);
		}

		// Unlike page titles, pap_project_title stores spaces.
		$name = trim( str_replace( '_', ' ', $name ) );
		if ( $name === '' ) {
			$this->invalidParameter(
				'missing_param',
				'The name parameter is required.',
				[ 'param-error-3', 'name' ]
			);
		}

		return $this->cacheLists->get(
			'wikiproject-pages.' . md5( "$dbName|$name" ),
			function ( ItemInterface $item ) use ( $project, $dbName, $name ) {
				$item->expiresAfter( 600 );

				$pages = [];
				foreach ( $this->queryWikiprojectPages( $dbName, $name ) as $row ) {
					$pages[] = [
						'title' => (string)$row['title'],
						'namespace' => (int)$row['namespace'],
						'assessment' => $this->projectsRepo->formatAssessment(
							$project, $row['class']
						),
						'importance' => $this->projectsRepo->formatImportance(
							$project, $row['importance']
						),
					];
				}

				return [
					'project' => $project,
					'name' => $name,
					'limit' => self::MAX_PAGES,
					'pages' => $pages,
				];
			}
		);
	}

	/**
	 * The pages a WikiProject has assessed, with the raw class and
	 * importance values. PageAssessments records the subject page, so
	 * no talk-to-subject mapping is needed. Kept as its own
	 * (overridable) unit so tests can supply fixture rows without a
	 * live replica connection.
	 *
	 * @return array Rows of title (underscored, no prefix), namespace,
	 *   class and importance.
	 */
	protected function queryWikiprojectPages( string $dbName, string $name ): array {
		$conn = $this->replicasClient->getConnection( $dbName );
		return $conn->createQueryBuilder()
			->select(
				'page_title AS title',
				'page_namespace AS namespace',
				'pa_class AS class',
				'pa_importance AS importance'
			)
			->from( 'page_assessments', 'page_assessments' )
			->join(
				'page_assessments',
				'page_assessments_projects',
				'page_assessments_projects',
				'pa_project_id = pap_project_id'
			)
			->join( 'page_assessments', 'page', 'page', 'page_id = pa_page_id' )
			->where( 'pap_project_title = :name' )
			->setParameter( 'name', $name )
			->setMaxResults( self::MAX_PAGES )
			->fetchAllAssociative();
	}

	/**
	 * The subcategory titles of the given categories. Kept as its own
	 * (overridable) unit so tests can supply fixture rows without a
	 * live replica connection.
	 *
	 * @param string[] $categories
	 * @return string[]
	 */
	protected function querySubcategories( string $dbName, array $categories ): array {
		$conn = $this->replicasClient->getConnection( $dbName );
		return $conn->createQueryBuilder()
			->select( 'page_title' )
			->from( 'categorylinks', 'categorylinks' )
			->join( 'categorylinks', 'linktarget', 'linktarget', 'cl_target_id = lt_id' )
			->join( 'categorylinks', 'page', 'page', 'page_id = cl_from' )
			->where( 'lt_title IN (:categories)' )
			->andWhere( 'lt_namespace = 14' )
			->andWhere( "cl_type = 'subcat'" )
			->setParameter( 'categories', $categories, ArrayParameterType::STRING )
			->fetchFirstColumn();
	}

	/**
	 * The page and file members of the given categories.
	 *
	 * @param string[] $categories
	 * @return array Rows of title (underscored, no prefix) + namespace.
	 */
	protected function queryCategoryMembers( string $dbName, array $categories ): array {
		$conn = $this->replicasClient->getConnection( $dbName );
		return $conn->createQueryBuilder()
			->select( 'page_title AS title', 'page_namespace AS namespace' )
			->from( 'categorylinks', 'categorylinks' )
			->join( 'categorylinks', 'linktarget', 'linktarget', 'cl_target_id = lt_id' )
			->join( 'categorylinks', 'page', 'page', 'page_id = cl_from' )
			->where( 'lt_title IN (:categories)' )
			->andWhere( 'lt_namespace = 14' )
			->andWhere( "cl_type IN ('page', 'file')" )
			->setParameter( 'categories', $categories, ArrayParameterType::STRING )
			->setMaxResults( self::MAX_PAGES )
			->fetchAllAssociative();
	}
}
