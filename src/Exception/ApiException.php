<?php

declare( strict_types = 1 );

namespace App\Exception;

use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * An error to be rendered as the JSON error envelope on /api/* routes
 * (see ApiExceptionListener). Carries a stable machine-readable code and
 * an i18n message key + params so the frontend can localize the error.
 */
class ApiException extends RuntimeException {

	/**
	 * @param string $errorCode e.g. 'invalid_param', 'unknown_project'.
	 * @param string $message English description (for logs and curl).
	 * @param string[] $i18n Message key followed by its params, e.g.
	 *   [ 'param-error-3', 'date' ]. Empty if untranslated.
	 * @param int $status HTTP status code.
	 * @param string|null $upstream Which upstream failed ('aqs', ...),
	 *   for 5xx envelopes.
	 * @param bool $retryable Whether the client may sensibly retry.
	 */
	public function __construct(
		public readonly string $errorCode,
		string $message,
		public readonly array $i18n = [],
		public readonly int $status = Response::HTTP_BAD_REQUEST,
		public readonly ?string $upstream = null,
		public readonly bool $retryable = false,
	) {
		parent::__construct( $message );
	}
}
