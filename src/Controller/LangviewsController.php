<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The Langviews app shell. Data comes from Wikidata sitelinks
 * (client-side) fanned out over MetricsController's pageviews
 * endpoint, one language project at a time.
 */
class LangviewsController extends AbstractController {

	#[Route( '/langviews', name: 'langviews' )]
	// FAQ and URL structure render as dialogs within the Vue app; the
	// routes exist so deep links and the footer links resolve.
	#[Route( '/langviews/faq', name: 'langviews/faq' )]
	#[Route( '/langviews/url_structure', name: 'langviews/url_structure' )]
	public function index(): Response {
		return $this->render( 'langviews/index.html.twig', [
			'current_app' => 'langviews',
		] );
	}
}
