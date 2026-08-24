<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Topviews app shell. Data comes from MetricsController's top
 * endpoint (curated excludes applied server-side), enriched
 * client-side per visible page.
 */
class TopviewsController extends AbstractController {

	#[Route( '/topviews', name: 'topviews' )]
	// FAQ and URL structure render as dialogs within the Vue app; the
	// routes exist so deep links and the footer links resolve.
	#[Route( '/topviews/faq', name: 'topviews/faq' )]
	#[Route( '/topviews/url_structure', name: 'topviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'app.html.twig', [
			'current_app' => 'topviews',
		] );
	}
}
