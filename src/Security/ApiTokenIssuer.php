<?php

declare( strict_types = 1 );

namespace App\Security;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Mints and verifies the HMAC-signed access tokens the frontend must
 * present on /api/* requests. Honest threat model: a public anonymous
 * SPA cannot prove "our frontend" — anyone can scrape a token from the
 * shell page. This raises the bar (no zero-effort scripting, no use
 * from third-party sites) and carries a subject claim so OAuth logins
 * can later mint per-user tokens with the same machinery.
 *
 * Format: base64url( JSON claims ) . '.' . base64url( HMAC-SHA256 ),
 * claims { sub, iat, exp }. Deliberately JWT-shaped, not JWT: nothing
 * external ever needs to parse these.
 */
class ApiTokenIssuer {

	public const DEFAULT_TTL = 3600;
	// Tolerated clock skew when verifying (single-server minting, so
	// mostly theoretical).
	private const LEEWAY = 60;
	// How long past expiry a token may still be exchanged for a fresh
	// one (the renewal endpoint's allowExpired path).
	private const RENEWAL_WINDOW = 30 * 24 * 3600;

	public function __construct(
		#[Autowire( '%kernel.secret%' )] private readonly string $secret,
	) {
		if ( $secret === '' ) {
			// Unsigned tokens would be forgeable; fail on first mint
			// (the shell page render) rather than silently.
			throw new InvalidArgumentException(
				'APP_SECRET must be set for API token signing.'
			);
		}
	}

	public function mint( string $subject, int $ttl = self::DEFAULT_TTL ): string {
		$now = time();
		$claims = json_encode( [ 'sub' => $subject, 'iat' => $now, 'exp' => $now + $ttl ] );
		return $this->base64url( $claims ) . '.' . $this->base64url( $this->sign( $claims ) );
	}

	/**
	 * @param string $token
	 * @param bool $allowExpired Accept an authentic token past its
	 *   expiry, within the renewal window (the renewal endpoint only).
	 * @throws TokenException
	 */
	public function verify( string $token, bool $allowExpired = false ): ApiToken {
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 2 ) {
			throw new TokenException( TokenException::MALFORMED );
		}
		$claims = base64_decode( strtr( $parts[ 0 ], '-_', '+/' ), true );
		$signature = base64_decode( strtr( $parts[ 1 ], '-_', '+/' ), true );
		if ( $claims === false || $signature === false ) {
			throw new TokenException( TokenException::MALFORMED );
		}
		if ( !hash_equals( $this->sign( $claims ), $signature ) ) {
			throw new TokenException( TokenException::BAD_SIGNATURE );
		}
		$decoded = json_decode( $claims, true );
		if (
			!is_array( $decoded ) ||
			!is_string( $decoded[ 'sub' ] ?? null ) ||
			!is_int( $decoded[ 'iat' ] ?? null ) ||
			!is_int( $decoded[ 'exp' ] ?? null )
		) {
			throw new TokenException( TokenException::MALFORMED );
		}

		$now = time();
		$graceEnd = $decoded[ 'exp' ] + self::LEEWAY +
			( $allowExpired ? self::RENEWAL_WINDOW : 0 );
		if ( $now > $graceEnd || $decoded[ 'iat' ] > $now + self::LEEWAY ) {
			throw new TokenException( TokenException::EXPIRED );
		}

		return new ApiToken( $decoded[ 'sub' ], $decoded[ 'iat' ], $decoded[ 'exp' ] );
	}

	private function sign( string $claims ): string {
		return hash_hmac( 'sha256', $claims, $this->secret, true );
	}

	private function base64url( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}
}
