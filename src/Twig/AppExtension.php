<?php

declare( strict_types = 1 );

namespace App\Twig;

use App\Security\ApiTokenIssuer;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * App-specific Twig helpers for the shell templates.
 */
class AppExtension extends AbstractExtension {

	public function __construct( private readonly ApiTokenIssuer $issuer ) {
	}

	public function getFunctions(): array {
		return [
			// The frontend's API access token, embedded in the shell's
			// data-app-config.
			new TwigFunction( 'api_token', fn (): string => $this->issuer->mint( 'anon' ) ),
		];
	}
}
