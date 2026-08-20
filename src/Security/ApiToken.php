<?php

declare( strict_types = 1 );

namespace App\Security;

/**
 * A verified API access token's claims.
 */
final readonly class ApiToken {

	public function __construct(
		public string $subject,
		public int $issuedAt,
		public int $expiresAt,
	) {
	}
}
