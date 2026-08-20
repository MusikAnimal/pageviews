<?php

declare( strict_types = 1 );

namespace App\Security;

use RuntimeException;

/**
 * An API access token failed verification. The reason distinguishes a
 * token that was never ours (or was tampered with) from one that is
 * authentic but past its lifetime — the renewal endpoint accepts the
 * latter.
 */
class TokenException extends RuntimeException {

	public const MALFORMED = 'malformed';
	public const BAD_SIGNATURE = 'bad_signature';
	public const EXPIRED = 'expired';

	public function __construct( public readonly string $reason ) {
		parent::__construct( "API token rejected: $reason" );
	}
}
