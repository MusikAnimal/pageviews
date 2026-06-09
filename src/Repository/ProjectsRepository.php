<?php

declare( strict_types = 1 );

namespace App\Repository;

use ErrorException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Wikimedia\ToolforgeBundle\Service\ReplicasClient;

class ProjectsRepository {

	const string PROJECTS_TSV = 'https://raw.githubusercontent.com/wikimedia/analytics-refinery/master/static_data/pageview/allowlist/allowlist.tsv';

	public function __construct(
		private readonly HttpClientInterface $httpClient,
		private readonly CacheInterface $cache,
		private readonly ReplicasClient $replicasClient,
	) {
	}

	/**
	 * Get all Pageviews-compatible projects from the source TSV on GitHub.
	 *
	 * @return array<string, string> Database name indexed by project URL domain.
	 */
	public function getProjects(): array {
		return $this->cache->get( 'projects', function ( ItemInterface $item ) {
			$item->expiresAfter( 7 * 24 * 60 * 60 ); // 1 week

			$conn = $this->replicasClient->getConnection( 'metawiki' );

			$response = $this->httpClient->request( 'GET', self::PROJECTS_TSV )->getContent();
			$rows = explode( "\n", $response );
			$projects = [];
			foreach ( $rows as $row ) {
				try {
					[ $type, $project, ] = explode( "\t", $row );
				} catch ( ErrorException ) {
					// Blank row.
					continue;
				}
				if ( $type === 'project' ) {
					$projects[] = $conn->quote( "https://$project.org" );
				}
			}

			// Get the database domains by querying meta_p, which lives on the same slice as metawiki.
			$dbRows = $conn->createQueryBuilder()
				->select( 'url, dbname' )
				->from( 'meta_p.wiki' )
				->where( $conn->createExpressionBuilder()->in( 'url', $projects ) )
				->executeQuery()
				->fetchAllAssociative();
			$projectsWithDbNames = [];
			foreach ( $dbRows as $dbRow ) {
				$domain = preg_replace( '/^https:\/\/(.*)\.org/', '\1', $dbRow['url'] );
				$projectsWithDbNames[ $domain ] = $dbRow['dbname'];
			}

			return $projectsWithDbNames;
		} );
	}

	/**
	 * Fetch and cache PageAssessments configuration from XTools.
	 *
	 * @return array
	 */
	public function getAssessmentsConfig(): array {
		return $this->cache->get( 'assessments_config', function ( ItemInterface $item ) {
			$item->expiresAfter( 24 * 60 * 60 ); // 1 day

			return $this->httpClient
				->request( 'GET', 'https://xtools.wmcloud.org/api/project/assessments' )
				->toArray();
		 } );
	}
}
