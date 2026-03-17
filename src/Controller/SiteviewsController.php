<?php

declare( strict_types = 1 );

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class SiteviewsController extends AbstractController {

	#[Route( '/siteviews', name: 'siteviews' )]
	public function index(): Response {
		return $this->render( 'siteviews/index.html.twig', [ 'current_app' => 'siteviews' ] );
	}

	#[Route( '/siteviews/faq', name: 'siteviews/faq' )]
	public function faq(): Response {
		return $this->render( 'siteviews/faq.html.twig', [ 'current_app' => 'siteviews' ] );
	}

	#[Route( '/siteviews/url_structure', name: 'siteviews/url_structure' )]
	public function urlStructure(): Response {
		return $this->render( 'siteviews/url_structure.html.twig', [ 'current_app' => 'siteviews' ] );
	}
}
