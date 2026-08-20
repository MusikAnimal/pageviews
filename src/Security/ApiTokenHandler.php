<?php

declare( strict_types = 1 );

namespace App\Security;

use SensitiveParameter;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * Resolves the Authorization: Bearer token on /api/* requests to its
 * virtual user (see security.yaml's api firewall).
 */
class ApiTokenHandler implements AccessTokenHandlerInterface {

	public function __construct( private readonly ApiTokenIssuer $issuer ) {
	}

	public function getUserBadgeFrom( #[SensitiveParameter] string $accessToken ): UserBadge {
		try {
			$token = $this->issuer->verify( $accessToken );
		} catch ( TokenException $e ) {
			// The reason distinguishes an expired token (renewable;
			// the client will) from a forged/mangled one, both for the
			// 401 body and for logs.
			throw new BadCredentialsException( $e->reason, 0, $e );
		}
		return new UserBadge(
			$token->subject,
			static fn ( string $subject ) => new ApiUser( $subject )
		);
	}
}
