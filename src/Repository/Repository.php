<?php

declare( strict_types = 1 );

namespace App\Repository;

use App\Exception\ApiException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Base class for all repositories, holding behavior every data source
 * shares. Repositories pair with controllers by name (e.g.
 * PageviewsController <-> PageviewsRepository); anything needed by two
 * or more of them belongs here.
 */
abstract class Repository {

	/**
	 * Normalize a project domain: strips the protocol and .org suffix,
	 * so 'en.wikipedia.org', 'https://en.wikipedia.org' and
	 * 'en.wikipedia' are all equivalent.
	 */
	public function normalizeProject( string $project ): string {
		$project = preg_replace( '%^https?://%', '', trim( $project ) );
		return preg_replace( '/\.org\/?$/', '', $project );
	}

	/**
	 * Cache TTL appropriate for a metrics date range: data that can
	 * still change (ranges reaching yesterday or later — AQS lags by up
	 * to a day) caches briefly; fully past ranges cache for a day.
	 */
	protected function ttlForRange( \DateTimeInterface $end ): int {
		$cutoff = new \DateTimeImmutable( '-2 days', new \DateTimeZone( 'UTC' ) );
		return $end > $cutoff ? 600 : 86400;
	}

	/**
	 * Shorthand for parameter validation failures, rendered by
	 * ApiExceptionListener as a 400 with the error envelope.
	 *
	 * @param string $code Stable machine-readable error code.
	 * @param string $message English description.
	 * @param string[] $i18n Message key and params for client-side rendering.
	 */
	protected function invalidParameter( string $code, string $message, array $i18n = [] ): never {
		throw new ApiException( $code, $message, $i18n, Response::HTTP_BAD_REQUEST );
	}
}
