<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ProjectsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\Cache;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Shared routes for all apps.
 */
class AppController extends AbstractController {

	#[Route('/projects.json', name: 'api_projects')]
	#[Cache(maxage: 7 * 24 * 60 * 60 /* 1 week */, public: true, vary: [ 'Accept-Encoding' ])]
	public function projectsApi( ProjectsRepository $projectsRepo ): JsonResponse {
		return new JsonResponse( $projectsRepo->getProjects() );
	}

	#[Route('/commons_categories.json', name: 'api_commons_categories')]
	#[Cache(maxage: 24 * 60 * 60 /* 1 day */, public: true, vary: [ 'Accept-Encoding' ])]
	public function commonsCategoriesApi( ProjectsRepository $projectsRepo ): JsonResponse {
		return new JsonResponse( $projectsRepo->getCommonsCategories() );
	}

	#[Route('/assessments.json', name: 'api_assessment_wikis')]
	#[Cache(maxage: 24 * 60 * 60 /* 1 day */, public: true, vary: [ 'Accept-Encoding' ])]
	public function assessmentWikisApi( ProjectsRepository $projectsRepo ): JsonResponse {
		return new JsonResponse( $projectsRepo->getAssessmentWikis() );
	}

	#[Route('/siteinfo/{project}', name: 'api_siteinfo')]
	#[Cache(maxage: 7 * 24 * 60 * 60 /* 1 week */, public: true, vary: [ 'Accept-Encoding' ])]
	public function siteInfoApi( ProjectsRepository $projectsRepo, string $project ): JsonResponse {
		$project = preg_replace( '/\.org$/', '', $project );
		return new JsonResponse( $projectsRepo->getSiteInfo( $project ) );
	}

	#[Route( '/set_language/{language}', name: 'set_language' )]
	public function setLanguage( Request $request, string $language ): RedirectResponse {
		// Return to the page the user came from, but only if it's ours —
		// a foreign Referer must not turn this into an open redirect.
		$referer = $request->headers->get( 'referer' );
		$url = $this->generateUrl( 'default' );
		if ( $referer && parse_url( $referer, PHP_URL_HOST ) === $request->getHost() ) {
			$url = $referer;
		}
		$separator = str_contains( $url, '?' ) ? '&' : '?';
		return $this->redirect( $url . $separator . 'uselang=' . urlencode( $language ) );
	}
}
