<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MassviewsController extends AbstractController {

	#[Route( '/massviews', name: 'massviews' )]
	public function index(): Response {
		return $this->render( 'massviews/index.html.twig', [ 'current_app' => 'massviews' ] );
	}

	#[Route( '/massviews/faq', name: 'massviews/faq' )]
	public function faq(): Response {
		return $this->render( 'massviews/faq.html.twig', [ 'current_app' => 'massviews' ] );
	}

	#[Route( '/massviews/url_structure', name: 'massviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'massviews/url_structure.html.twig', [ 'current_app' => 'massviews' ] );
	}
}
