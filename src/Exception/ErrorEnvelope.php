<?php

declare( strict_types = 1 );

namespace App\Exception;

use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * The JSON error envelope every API error wears:
 *
 *   { "error": { "code", "message", "i18n", "upstream", "retryable" } }
 *
 * Shared by ApiExceptionListener (thrown exceptions) and the security
 * layer, whose authentication failures are Responses the listener
 * never sees.
 */
class ErrorEnvelope {

	/**
	 * @param string[] $i18n Message key and params for client-side
	 *   rendering.
	 */
	public static function json(
		string $code,
		string $message,
		array $i18n,
		int $status,
		?string $upstream = null,
		bool $retryable = false,
	): JsonResponse {
		return new JsonResponse( [
			'error' => [
				'code' => $code,
				'message' => $message,
				'i18n' => $i18n,
				'upstream' => $upstream,
				'retryable' => $retryable,
			],
		], $status );
	}
}
