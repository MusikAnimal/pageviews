<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class PageviewsController extends AbstractController {

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

	#[Route( '/set_language', name: 'set_language' )]
	public function setLanguage(): Response {

	}
}
