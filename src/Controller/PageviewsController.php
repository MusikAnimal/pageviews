<?php

declare( strict_types = 1 );

namespace App\Controller;

use App\Repository\PageviewsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PageviewsController extends AbstractController {

	#[Route( '/', name: 'default' )]
	#[Route( '/pageviews', name: 'pageviews' )]
	public function index(): Response {
		return $this->render('pageviews/index.html.twig', [
			'current_app' => 'pageviews',
		] );
	}

	#[Route( '/faq', name: 'pageviews/faq' )]
	public function faq(): Response {
		return $this->render( 'pageviews/faq.html.twig', [ 'current_app' => 'pageviews', 'title' => 'faq' ] );
	}

	#[Route( '/url_structure', name: 'pageviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'pageviews/url_structure.html.twig', [ 'current_app' => 'pageviews', 'title' => 'url-structure' ] );
	}

	/**
	 * Edit statistics (edit/editor counts, assessments) from the
	 * replicas. The /pageviews/api path is a deprecated alias from
	 * before the /api/* namespace existed.
	 */
	#[Route( '/api/pages/{project}/edits', name: 'api_page_edits', methods: [ 'GET' ] )]
	#[Route( '/pageviews/api', name: 'api_pageviews' )]
	public function api( Request $request, PageviewsRepository $pageviewsRepo, ?string $project = null ): JsonResponse {
		$project ??= $request->query->get( 'project', '' );
		$requiredParams = [ 'pages', 'start', 'end' ];
		foreach ( $requiredParams as $param ) {
			if ( !$request->query->has( $param ) ) {
				return new JsonResponse( [ 'error' => "Missing required parameter: $param" ], Response::HTTP_BAD_REQUEST );
			}
		}
		$pages = explode( '|', urldecode( $request->query->get( 'pages' ) ) );
		$ret = $pageviewsRepo->getEditData(
			$project,
			$pages,
			$request->query->get( 'start' ),
			$request->query->get( 'end' ),
			$request->query->has( 'totals' ),
		);
		return new JsonResponse( $ret );
	}
}
