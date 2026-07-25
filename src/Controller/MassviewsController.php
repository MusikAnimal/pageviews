<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Massviews app shell. Sources resolve to page lists (or, for the
 * Commons category source, to MetricsController's commons-category
 * aggregate) and fan out over the batched pageviews endpoint.
 */
class MassviewsController extends AbstractController {

	#[Route( '/massviews', name: 'massviews' )]
	// FAQ and URL structure render as dialogs within the Vue app; the
	// routes exist so deep links and the footer links resolve.
	#[Route( '/massviews/faq', name: 'massviews/faq' )]
	#[Route( '/massviews/url_structure', name: 'massviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'massviews/index.html.twig', [
			'current_app' => 'massviews',
		] );
	}
}
