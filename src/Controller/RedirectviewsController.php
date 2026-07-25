<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Redirect Views app shell. Data comes from the Action API's
 * redirect list (client-side) fanned out over MetricsController's
 * batched pageviews endpoint.
 */
class RedirectviewsController extends AbstractController {

	#[Route( '/redirectviews', name: 'redirectviews' )]
	// FAQ and URL structure render as dialogs within the Vue app; the
	// routes exist so deep links and the footer links resolve.
	#[Route( '/redirectviews/faq', name: 'redirectviews/faq' )]
	#[Route( '/redirectviews/url_structure', name: 'redirectviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'redirectviews/index.html.twig', [
			'current_app' => 'redirectviews',
		] );
	}
}
