<?php

declare( strict_types = 1 );

namespace App\Tests\Functional;

use App\Security\ApiTokenIssuer;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * The api firewall end to end: 401 envelopes for missing/bad/expired
 * tokens, pass-through for valid ones, the public routes staying
 * public, and token renewal. Requests deliberately omit query params
 * so an authenticated pass surfaces as the controller's own 400 —
 * never touching real upstreams.
 */
class ApiFirewallTest extends WebTestCase {

	public function testMissingTokenRejected(): void {
		$client = static::createClient();
		$client->request( 'GET', '/api/metrics/siteviews' );

		static::assertResponseStatusCodeSame( 401 );
		$error = json_decode( $client->getResponse()->getContent(), true )[ 'error' ];
		static::assertSame( 'auth_required', $error[ 'code' ] );
		static::assertSame( [ 'api-error-auth' ], $error[ 'i18n' ] );
		static::assertFalse( $error[ 'retryable' ] );
	}

	public function testGarbageTokenRejected(): void {
		$client = static::createClient();
		$client->request( 'GET', '/api/metrics/siteviews', server: [
			'HTTP_X_API_TOKEN' => 'garbage',
		] );

		static::assertResponseStatusCodeSame( 401 );
		static::assertSame(
			'auth_invalid',
			json_decode( $client->getResponse()->getContent(), true )[ 'error' ][ 'code' ]
		);
	}

	public function testExpiredTokenRejected(): void {
		$client = static::createClient();
		$token = static::getContainer()->get( ApiTokenIssuer::class )->mint( 'anon', -7200 );
		$client->request( 'GET', '/api/metrics/siteviews', server: [
			'HTTP_X_API_TOKEN' => $token,
		] );

		static::assertResponseStatusCodeSame( 401 );
		static::assertSame(
			'auth_expired',
			json_decode( $client->getResponse()->getContent(), true )[ 'error' ][ 'code' ]
		);
	}

	public function testValidTokenReachesTheController(): void {
		$client = static::createClient();
		$token = static::getContainer()->get( ApiTokenIssuer::class )->mint( 'anon' );
		// No query params: an authenticated request surfaces the
		// controller's own validation 400.
		$client->request( 'GET', '/api/metrics/siteviews', server: [
			'HTTP_X_API_TOKEN' => $token,
		] );

		static::assertResponseStatusCodeSame( 400 );
	}

	public function testLegacyAliasIsGone(): void {
		$client = static::createClient();
		$client->request( 'GET', '/pageviews/api' );
		static::assertResponseStatusCodeSame( 404 );
	}

	public function testRenewalExchangesAnExpiredToken(): void {
		$client = static::createClient();
		$issuer = static::getContainer()->get( ApiTokenIssuer::class );
		$expired = $issuer->mint( 'anon', -86400 );

		$client->request( 'POST', '/auth/token', server: [
			'CONTENT_TYPE' => 'application/json',
		], content: json_encode( [ 'token' => $expired ] ) );

		static::assertResponseIsSuccessful();
		$fresh = json_decode( $client->getResponse()->getContent(), true )[ 'token' ];
		static::assertSame( 'anon', $issuer->verify( $fresh )->subject );
	}

	public function testRenewalRejectsGarbage(): void {
		$client = static::createClient();
		$client->request( 'POST', '/auth/token', server: [
			'CONTENT_TYPE' => 'application/json',
		], content: json_encode( [ 'token' => 'garbage' ] ) );

		static::assertResponseStatusCodeSame( 401 );
		static::assertSame(
			'auth_invalid',
			json_decode( $client->getResponse()->getContent(), true )[ 'error' ][ 'code' ]
		);
	}
}
