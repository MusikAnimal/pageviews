<?php

declare( strict_types = 1 );

namespace App\Controller;

use App\Repository\PageviewsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class PageviewsController extends AbstractController {

	public function __construct(
		private readonly PageviewsRepository $pageviewsRepository
	) {
	}

	#[Route( '/', name: 'pageviews' )]
	public function index(): Response {
		return $this->render( 'pageviews/index.html.twig', [
			'current_app' => 'pageviews',
			'latest_days' => 30
		] );
	}

	#[Route( '/faq', name: 'pageviews/faq' )]
	public function faq(): Response {
		return $this->render( 'pageviews/faq.html.twig', [ 'current_app' => 'pageviews' ] );
	}

	#[Route( '/url_structure', name: 'pageviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'pageviews/url_structure.html.twig', [ 'current_app' => 'pageviews' ] );
	}

	#[Route( '/pageviews/api', name: 'api_pageviews' )]
	public function api( Request $request, PageviewsRepository $pageviewsRepo ): JsonResponse {
		$requiredParams = [ 'project', 'pages', 'start', 'end' ];
		foreach ( $requiredParams as $param ) {
			if ( !$request->query->has( $param ) ) {
				return new JsonResponse( [ 'error' => "Missing required parameter: $param" ], Response::HTTP_BAD_REQUEST );
			}
		}
		$pages = explode( '|', urldecode( $request->query->get( 'pages' ) ) );
		$ret = $pageviewsRepo->getEditData(
			$request->query->get( 'project' ),
			$pages,
			$request->query->get( 'start' ),
			$request->query->get( 'end' ),
			$request->query->has( 'totals' ),
		);
		return new JsonResponse( $ret );
	}
}
