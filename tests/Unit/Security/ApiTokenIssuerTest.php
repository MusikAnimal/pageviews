<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Security;

use App\Security\ApiTokenIssuer;
use App\Security\TokenException;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ApiTokenIssuerTest extends TestCase {

	private function makeIssuer( string $secret = 'test-secret' ): ApiTokenIssuer {
		return new ApiTokenIssuer( $secret );
	}

	public function testMintVerifyRoundtrip(): void {
		$issuer = $this->makeIssuer();
		$before = time();
		$token = $issuer->verify( $issuer->mint( 'anon' ) );

		static::assertSame( 'anon', $token->subject );
		static::assertGreaterThanOrEqual( $before, $token->issuedAt );
		static::assertSame( $token->issuedAt + ApiTokenIssuer::DEFAULT_TTL, $token->expiresAt );
	}

	public function testCarriesTheSubject(): void {
		$issuer = $this->makeIssuer();
		static::assertSame(
			'Jimbo Wales',
			$issuer->verify( $issuer->mint( 'Jimbo Wales' ) )->subject
		);
	}

	public function testExpiredTokenRejected(): void {
		$issuer = $this->makeIssuer();
		// Expired beyond the leeway.
		$token = $issuer->mint( 'anon', -120 );
		$this->expectException( TokenException::class );
		try {
			$issuer->verify( $token );
		} catch ( TokenException $e ) {
			static::assertSame( TokenException::EXPIRED, $e->reason );
			throw $e;
		}
	}

	public function testLeewayToleratesSmallSkew(): void {
		$issuer = $this->makeIssuer();
		// Expired 30s ago: within the 60s leeway.
		$token = $issuer->mint( 'anon', -30 );
		static::assertSame( 'anon', $issuer->verify( $token )->subject );
	}

	public function testExpiredTokenAcceptedForRenewal(): void {
		$issuer = $this->makeIssuer();
		// A day past expiry: well within the 30-day renewal window.
		$token = $issuer->mint( 'anon', -86400 );
		static::assertSame( 'anon', $issuer->verify( $token, true )->subject );
	}

	public function testAncientTokenRejectedEvenForRenewal(): void {
		$issuer = $this->makeIssuer();
		$token = $issuer->mint( 'anon', -40 * 24 * 3600 );
		$this->expectException( TokenException::class );
		$issuer->verify( $token, true );
	}

	public function testTamperedPayloadRejected(): void {
		$issuer = $this->makeIssuer();
		[ $claims, $signature ] = explode( '.', $issuer->mint( 'anon' ) );
		$forged = rtrim( strtr(
			base64_encode( json_encode( [
				'sub' => 'admin', 'iat' => time(), 'exp' => time() + 3600,
			] ) ),
			'+/',
			'-_'
		), '=' );
		$this->expectException( TokenException::class );
		try {
			$issuer->verify( "$forged.$signature" );
		} catch ( TokenException $e ) {
			static::assertSame( TokenException::BAD_SIGNATURE, $e->reason );
			throw $e;
		}
	}

	public function testWrongSecretRejected(): void {
		$token = $this->makeIssuer( 'secret-a' )->mint( 'anon' );
		$this->expectException( TokenException::class );
		$this->makeIssuer( 'secret-b' )->verify( $token );
	}

	public function testGarbageRejected(): void {
		$issuer = $this->makeIssuer();
		foreach ( [ '', 'no-dot', 'a.b.c', '!!.!!' ] as $garbage ) {
			try {
				$issuer->verify( $garbage );
				static::fail( "Accepted garbage token: $garbage" );
			} catch ( TokenException $e ) {
				static::assertSame( TokenException::MALFORMED, $e->reason );
			}
		}
	}

	public function testEmptySecretThrows(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->makeIssuer( '' );
	}
}
