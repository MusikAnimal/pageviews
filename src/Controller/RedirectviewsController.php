<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class RedirectviewsController extends AbstractController {

	#[Route( '/redirectviews', name: 'redirectviews' )]
	public function index(): Response {
		return $this->render( 'redirectviews/index.html.twig', [ 'current_app' => 'redirectviews' ] );
	}

	#[Route( '/redirectviews/faq', name: 'redirectviews/faq' )]
	public function faq(): Response {
		return $this->render( 'redirectviews/faq.html.twig', [ 'current_app' => 'redirectviews' ] );
	}

	#[Route( '/redirectviews/url_structure', name: 'redirectviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'redirectviews/url_structure.html.twig', [ 'current_app' => 'redirectviews' ] );
	}
}
