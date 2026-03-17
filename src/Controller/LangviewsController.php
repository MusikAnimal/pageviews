<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class LangviewsController extends AbstractController {

	#[Route( '/langviews', name: 'langviews' )]
	public function index(): Response {
		return $this->render( 'langviews/index.html.twig', [ 'current_app' => 'langviews' ] );
	}

	#[Route( '/langviews/faq', name: 'langviews/faq' )]
	public function faq(): Response {
		return $this->render( 'langviews/faq.html.twig', [ 'current_app' => 'langviews' ] );
	}

	#[Route( '/langviews/url_structure', name: 'langviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'langviews/url_structure.html.twig', [ 'current_app' => 'langviews' ] );
	}
}
