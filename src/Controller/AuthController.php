<?php

declare( strict_types = 1 );

namespace App\Controller;

use App\Exception\ErrorEnvelope;
use App\Security\ApiTokenIssuer;
use App\Security\TokenException;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Access-token renewal for long-lived tabs. Deliberately outside the
 * /api firewall: the expired Bearer token being renewed would be
 * rejected there before reaching us. Renewal requires an authentic
 * (if expired) prior token, so fresh tokens still originate only from
 * the server-rendered shell — and an OAuth login's subject will
 * survive renewal unchanged.
 */
class AuthController extends AbstractController {

	#[Route( '/auth/token', name: 'auth_token', methods: [ 'POST' ] )]
	public function token(
		Request $request,
		ApiTokenIssuer $issuer,
		LoggerInterface $logger
	): JsonResponse {
		$payload = json_decode( $request->getContent(), true );
		$token = is_array( $payload ) ? ( $payload[ 'token' ] ?? null ) : null;
		if ( !is_string( $token ) ) {
			return ErrorEnvelope::json(
				'invalid_param',
				'A token to renew is required.',
				[ 'api-error-auth' ],
				Response::HTTP_BAD_REQUEST,
			);
		}

		try {
			$verified = $issuer->verify( $token, true );
		} catch ( TokenException $e ) {
			// Renewal rejections are what turn into the user-facing
			// "session could not be verified" error: log the reason
			// (too old for the renewal window, or a foreign/rotated
			// signature).
			$logger->warning( 'API token renewal rejected', [
				'reason' => $e->reason,
			] );
			return ErrorEnvelope::json(
				'auth_invalid',
				'The token could not be renewed.',
				[ 'api-error-auth' ],
				Response::HTTP_UNAUTHORIZED,
			);
		}

		return new JsonResponse( [ 'token' => $issuer->mint( $verified->subject ) ] );
	}
}
