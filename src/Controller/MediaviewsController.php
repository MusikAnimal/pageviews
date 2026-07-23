<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Mediaviews app shell. Data comes from MetricsController's
 * /api/metrics/mediarequests endpoint.
 */
class MediaviewsController extends AbstractController {

	#[Route( '/mediaviews', name: 'mediaviews' )]
	// FAQ and URL structure will render as dialogs within the Vue app;
	// the routes exist so deep links and the footer links resolve.
	#[Route( '/mediaviews/faq', name: 'mediaviews/faq' )]
	#[Route( '/mediaviews/url_structure', name: 'mediaviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'mediaviews/index.html.twig', [
			'current_app' => 'mediaviews',
		] );
	}
}
