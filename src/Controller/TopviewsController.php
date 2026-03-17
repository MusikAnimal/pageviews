<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class TopviewsController extends AbstractController {

	#[Route( '/topviews', name: 'topviews' )]
	public function index(): Response {
		return $this->render( 'topviews/index.html.twig', [ 'current_app' => 'topviews' ] );
	}

	#[Route( '/topviews/faq', name: 'topviews/faq' )]
	public function faq(): Response {
		return $this->render( 'topviews/faq.html.twig', [ 'current_app' => 'topviews' ] );
	}

	#[Route( '/topviews/url_structure', name: 'topviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'topviews/url_structure.html.twig', [ 'current_app' => 'topviews' ] );
	}
}
