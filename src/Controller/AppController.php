<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ProjectsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
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

	#[Route( '/set_language', name: 'set_language' )]
	public function setLanguage(): Response {

	}
}
