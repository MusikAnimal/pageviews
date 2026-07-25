<?php

declare( strict_types = 1 );

namespace App\Controller;

use App\Repository\MetricsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\Cache;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

/**
 * JSON proxies for the Wikimedia AQS metrics REST API. Pairs with
 * MetricsRepository. Errors render as the /api/* envelope (see
 * ApiExceptionListener).
 */
class MetricsController extends AbstractController {

	#[Route( '/api/metrics/pageviews/{project}', name: 'api_metrics_pageviews', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function pageviews(
		MetricsRepository $metricsRepo,
		string $project,
		#[MapQueryParameter] string $pages = '',
		#[MapQueryParameter] string $start = '',
		#[MapQueryParameter] string $end = '',
		#[MapQueryParameter] string $platform = 'all-access',
		#[MapQueryParameter] string $agent = 'user',
		#[MapQueryParameter] string $granularity = 'daily',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getPageviews(
			$project, $pages, $start, $end, $platform, $agent, $granularity
		) );
	}

	#[Route( '/api/metrics/siteviews', name: 'api_metrics_siteviews', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function siteviews(
		MetricsRepository $metricsRepo,
		#[MapQueryParameter] string $sites = '',
		#[MapQueryParameter] string $source = 'pageviews',
		#[MapQueryParameter] string $start = '',
		#[MapQueryParameter] string $end = '',
		#[MapQueryParameter] string $platform = '',
		#[MapQueryParameter] string $agent = 'user',
		#[MapQueryParameter] string $granularity = 'daily',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getSiteviews(
			$sites, $source, $start, $end, $platform, $agent, $granularity
		) );
	}

	#[Route( '/api/metrics/mediarequests', name: 'api_metrics_mediarequests', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function mediarequests(
		MetricsRepository $metricsRepo,
		#[MapQueryParameter] string $files = '',
		#[MapQueryParameter] string $start = '',
		#[MapQueryParameter] string $end = '',
		#[MapQueryParameter] string $referer = 'all-referers',
		#[MapQueryParameter] string $agent = 'user',
		#[MapQueryParameter] string $granularity = 'daily',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getMediarequests(
			$files, $start, $end, $referer, $agent, $granularity
		) );
	}

	#[Route( '/api/metrics/edits', name: 'api_metrics_edits', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function edits(
		MetricsRepository $metricsRepo,
		#[MapQueryParameter] string $sites = '',
		#[MapQueryParameter] string $start = '',
		#[MapQueryParameter] string $end = '',
		#[MapQueryParameter( name: 'editor-type' )] string $editorType = 'user',
		#[MapQueryParameter( name: 'page-type' )] string $pageType = 'content',
		#[MapQueryParameter] string $granularity = 'daily',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getSiteEdits(
			$sites, $start, $end, $editorType, $pageType, $granularity
		) );
	}

	#[Route( '/api/metrics/top/{project}', name: 'api_metrics_top', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function top(
		MetricsRepository $metricsRepo,
		string $project,
		#[MapQueryParameter] string $date = '',
		#[MapQueryParameter] string $platform = 'all-access',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getTopPageviews( $project, $date, $platform ) );
	}

	#[Route( '/api/metrics/commons-category', name: 'api_metrics_commons_category', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function commonsCategory(
		MetricsRepository $metricsRepo,
		#[MapQueryParameter] string $category = '',
		#[MapQueryParameter] string $scope = 'deep',
		#[MapQueryParameter] string $wiki = 'all-wikis',
		#[MapQueryParameter] string $start = '',
		#[MapQueryParameter] string $end = '',
	): JsonResponse {
		return new JsonResponse( $metricsRepo->getCommonsCategoryViews(
			$category, $scope, $wiki, $start, $end
		) );
	}
}
