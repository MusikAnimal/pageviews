<?php

declare( strict_types = 1 );

namespace App\Security;

use Symfony\Component\Security\Core\User\UserInterface;

/**
 * The virtual user behind a verified API access token. The frontend's
 * anonymous tokens carry ROLE_FRONTEND; OAuth-minted tokens (whose
 * subject is a username) will additionally carry ROLE_OAUTH, gating
 * the expensive endpoints.
 */
class ApiUser implements UserInterface {

	public const ANONYMOUS = 'anon';

	public function __construct( private readonly string $subject ) {
	}

	public function getUserIdentifier(): string {
		return $this->subject;
	}

	public function getRoles(): array {
		return $this->subject === self::ANONYMOUS ?
			[ 'ROLE_FRONTEND' ] :
			[ 'ROLE_FRONTEND', 'ROLE_OAUTH' ];
	}

	public function eraseCredentials(): void {
	}
}
