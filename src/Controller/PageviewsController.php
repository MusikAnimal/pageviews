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

	/**
	 * FAQ and URL structure render as dialogs within the Vue app; the
	 * vue-router matches these paths and opens the appropriate dialog.
	 */
	#[Route( '/faq', name: 'pageviews/faq' )]
	#[Route( '/url_structure', name: 'pageviews/url_structure' )]
	public function dialogs(): Response {
		return $this->render( 'pageviews/index.html.twig', [
			'current_app' => 'pageviews',
		] );
	}

	/**
	 * Edit statistics (edit/editor counts, assessments) from the
	 * replicas.
	 */
	#[Route( '/api/pages/{project}/edits', name: 'api_page_edits', methods: [ 'GET' ] )]
	public function api( Request $request, PageviewsRepository $pageviewsRepo, string $project ): JsonResponse {
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
