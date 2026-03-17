<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MediaviewsController extends AbstractController {

	#[Route( '/mediaviews', name: 'mediaviews' )]
	public function index(): Response {
		return $this->render( 'mediaviews/index.html.twig', [ 'current_app' => 'mediaviews' ] );
	}

	#[Route( '/mediaviews/faq', name: 'mediaviews/faq' )]
	public function faq(): Response {
		return $this->render( 'mediaviews/faq.html.twig', [ 'current_app' => 'mediaviews' ] );
	}

	#[Route( '/mediaviews/url_structure', name: 'mediaviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'mediaviews/url_structure.html.twig', [ 'current_app' => 'mediaviews' ] );
	}
}
