<?php

declare( strict_types = 1 );

namespace App\EventListener;

use App\Exception\ApiException;
use InvalidArgumentException;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

/**
 * Renders exceptions on /api/* routes as the JSON error envelope:
 *
 *   { "error": { "code", "message", "i18n", "upstream", "retryable" } }
 *
 * Successful responses are bare payloads; the frontend discriminates on
 * the HTTP status. Non-API routes keep Symfony's default error handling.
 */
#[AsEventListener]
class ApiExceptionListener {

	public function __invoke( ExceptionEvent $event ): void {
		if ( !str_starts_with( $event->getRequest()->getPathInfo(), '/api/' ) ) {
			return;
		}

		$throwable = $event->getThrowable();

		if ( $throwable instanceof ApiException ) {
			$event->setResponse( $this->envelope(
				$throwable->errorCode,
				$throwable->getMessage(),
				$throwable->i18n,
				$throwable->status,
				$throwable->upstream,
				$throwable->retryable,
			) );
		} elseif ( $throwable instanceof TransportExceptionInterface ) {
			// Network-level failure reaching an upstream (timeout, DNS...).
			$event->setResponse( $this->envelope(
				'upstream_timeout',
				'An upstream service could not be reached.',
				[ 'api-error-timeout' ],
				Response::HTTP_GATEWAY_TIMEOUT,
				null,
				true,
			) );
		} elseif ( $throwable instanceof HttpClientException ) {
			// Upstream responded with an error (after retries).
			$event->setResponse( $this->envelope(
				'upstream_error',
				'An upstream service returned an error.',
				[ 'api-error-unknown' ],
				Response::HTTP_BAD_GATEWAY,
				null,
				true,
			) );
		} elseif ( $throwable instanceof InvalidArgumentException ) {
			// Repositories predating ApiException throw these for bad params.
			$event->setResponse( $this->envelope(
				'invalid_param',
				$throwable->getMessage(),
				[],
				Response::HTTP_BAD_REQUEST,
			) );
		} elseif ( $throwable instanceof HttpExceptionInterface ) {
			// Kernel-level errors, e.g. 404 for an unknown API route.
			$status = $throwable->getStatusCode();
			$event->setResponse( $this->envelope(
				$status === Response::HTTP_NOT_FOUND ? 'not_found' : 'http_error',
				$status === Response::HTTP_NOT_FOUND ?
					'Unknown API route.' : $throwable->getMessage(),
				[],
				$status,
			) );
		} else {
			// Anything else: keep JSON shape, leak nothing.
			$event->setResponse( $this->envelope(
				'internal_error',
				'An internal error occurred.',
				[ 'api-error-unknown' ],
				Response::HTTP_INTERNAL_SERVER_ERROR,
			) );
		}
	}

	/**
	 * @param string[] $i18n
	 */
	private function envelope(
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
