<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class UserviewsController extends AbstractController {

	#[Route( '/userviews', name: 'userviews' )]
	public function index(): Response {
		return $this->render( 'userviews/index.html.twig', [ 'current_app' => 'userviews' ] );
	}

	#[Route( '/userviews/faq', name: 'userviews/faq' )]
	public function faq(): Response {
		return $this->render( 'userviews/faq.html.twig', [ 'current_app' => 'userviews' ] );
	}

	#[Route( '/userviews/url_structure', name: 'userviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'userviews/url_structure.html.twig', [ 'current_app' => 'userviews' ] );
	}
}
