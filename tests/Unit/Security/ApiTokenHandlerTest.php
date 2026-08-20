<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\Security;

use App\Security\ApiTokenHandler;
use App\Security\ApiTokenIssuer;
use App\Security\ApiUser;
use App\Security\TokenException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;

class ApiTokenHandlerTest extends TestCase {

	private ApiTokenIssuer $issuer;
	private ApiTokenHandler $handler;

	protected function setUp(): void {
		$this->issuer = new ApiTokenIssuer( 'test-secret' );
		$this->handler = new ApiTokenHandler( $this->issuer );
	}

	public function testValidTokenYieldsFrontendUser(): void {
		$badge = $this->handler->getUserBadgeFrom( $this->issuer->mint( 'anon' ) );

		static::assertSame( 'anon', $badge->getUserIdentifier() );
		$user = ( $badge->getUserLoader() )( 'anon' );
		static::assertInstanceOf( ApiUser::class, $user );
		static::assertSame( [ 'ROLE_FRONTEND' ], $user->getRoles() );
	}

	public function testOauthSubjectGainsTheRole(): void {
		$badge = $this->handler->getUserBadgeFrom( $this->issuer->mint( 'Jimbo Wales' ) );
		$user = ( $badge->getUserLoader() )( 'Jimbo Wales' );
		static::assertSame( [ 'ROLE_FRONTEND', 'ROLE_OAUTH' ], $user->getRoles() );
	}

	public function testExpiredTokenRejectedWithReason(): void {
		$token = $this->issuer->mint( 'anon', -7200 );
		try {
			$this->handler->getUserBadgeFrom( $token );
			static::fail( 'Expected BadCredentialsException' );
		} catch ( BadCredentialsException $e ) {
			static::assertSame( TokenException::EXPIRED, $e->getMessage() );
		}
	}

	public function testGarbageRejectedWithReason(): void {
		try {
			$this->handler->getUserBadgeFrom( 'garbage' );
			static::fail( 'Expected BadCredentialsException' );
		} catch ( BadCredentialsException $e ) {
			static::assertSame( TokenException::MALFORMED, $e->getMessage() );
		}
	}
}
