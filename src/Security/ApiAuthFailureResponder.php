<?php

declare( strict_types = 1 );

namespace App\Security;

use App\Exception\ErrorEnvelope;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authentication\AuthenticationFailureHandlerInterface;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

/**
 * 401s from the api firewall, in the standard error envelope. These
 * are authenticator Responses rather than thrown exceptions, so
 * ApiExceptionListener never sees them — the envelope must be built
 * here. The client renews its token and retries once on any of the
 * codes; the distinction is for logs.
 */
class ApiAuthFailureResponder implements
	AuthenticationEntryPointInterface,
	AuthenticationFailureHandlerInterface
{

	/**
	 * No usable credentials at all.
	 */
	public function start( Request $request, ?AuthenticationException $authException = null ): Response {
		return $this->envelope( 'auth_required', 'An API access token is required.' );
	}

	/**
	 * A token was presented but rejected.
	 */
	public function onAuthenticationFailure( Request $request, AuthenticationException $exception ): Response {
		// ApiTokenHandler sets the TokenException reason as message.
		$expired = $exception->getMessage() === TokenException::EXPIRED;
		return $this->envelope(
			$expired ? 'auth_expired' : 'auth_invalid',
			$expired ? 'The API access token has expired.' : 'The API access token is invalid.'
		);
	}

	private function envelope( string $code, string $message ): Response {
		return ErrorEnvelope::json(
			$code,
			$message,
			[ 'api-error-auth' ],
			Response::HTTP_UNAUTHORIZED,
		);
	}
}
