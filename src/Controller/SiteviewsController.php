<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Siteviews app shell. Data comes from MetricsController's
 * /api/metrics/siteviews endpoint.
 */
class SiteviewsController extends AbstractController {

	#[Route( '/siteviews', name: 'siteviews' )]
	// FAQ and URL structure will render as dialogs within the Vue app;
	// the routes exist so deep links and the footer links resolve.
	#[Route( '/siteviews/faq', name: 'siteviews/faq' )]
	#[Route( '/siteviews/url_structure', name: 'siteviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'app.html.twig', [
			'current_app' => 'siteviews',
		] );
	}
}
