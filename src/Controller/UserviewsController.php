<?php

declare( strict_types = 1 );

namespace App\Controller;

use App\Repository\UserviewsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\Cache;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Userviews app shell and its pages-created API. The list of pages
 * a user created comes from the Toolforge replicas (the one replica
 * query of this app); the pageviews themselves are fanned out
 * client-side over MetricsController's batched pageviews endpoint.
 */
class UserviewsController extends AbstractController {

	#[Route( '/userviews', name: 'userviews' )]
	// FAQ and URL structure render as dialogs within the Vue app; the
	// routes exist so deep links and the footer links resolve.
	#[Route( '/userviews/faq', name: 'userviews/faq' )]
	#[Route( '/userviews/url_structure', name: 'userviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'userviews/index.html.twig', [
			'current_app' => 'userviews',
		] );
	}

	#[Route( '/api/users/{project}/pages-created', name: 'api_users_pages_created', methods: [ 'GET' ] )]
	#[Cache( maxage: 600, public: true )]
	public function pagesCreated(
		UserviewsRepository $userviewsRepo,
		string $project,
		#[MapQueryParameter] string $user = '',
		#[MapQueryParameter] string $namespace = 'all',
		#[MapQueryParameter] string $redirects = '0',
	): JsonResponse {
		return new JsonResponse(
			$userviewsRepo->getPagesCreated( $project, $user, $namespace, $redirects )
		);
	}
}
