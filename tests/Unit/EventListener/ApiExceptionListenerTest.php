<?php

declare( strict_types = 1 );

namespace App\Tests\Unit\EventListener;

use App\EventListener\ApiExceptionListener;
use App\Exception\ApiException;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Doctrine\DBAL\Driver\Exception as DriverExceptionInterface;
use Doctrine\DBAL\Exception\ConnectionException;
use Doctrine\DBAL\Exception\DriverException;
use Symfony\Component\HttpClient\Exception\TimeoutException;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Throwable;

class ApiExceptionListenerTest extends TestCase {

	private function dispatch( string $path, Throwable $throwable ): ExceptionEvent {
		$event = new ExceptionEvent(
			$this->createStub( HttpKernelInterface::class ),
			Request::create( $path ),
			HttpKernelInterface::MAIN_REQUEST,
			$throwable
		);
		( new ApiExceptionListener() )( $event );
		return $event;
	}

	private static function decode( ExceptionEvent $event ): array {
		return json_decode( $event->getResponse()->getContent(), true )['error'];
	}

	public function testIgnoresNonApiRoutes(): void {
		$event = $this->dispatch( '/pageviews', new RuntimeException( 'boom' ) );
		static::assertNull( $event->getResponse() );
	}

	public function testApiException(): void {
		$event = $this->dispatch( '/api/metrics/pageviews/en.wikipedia', new ApiException(
			'too_many_pages',
			'A maximum of 50 pages may be requested at once.',
			[ 'param-error-3', '50' ],
		) );

		static::assertSame( 400, $event->getResponse()->getStatusCode() );
		static::assertSame( [
			'code' => 'too_many_pages',
			'message' => 'A maximum of 50 pages may be requested at once.',
			'i18n' => [ 'param-error-3', '50' ],
			'upstream' => null,
			'retryable' => false,
		], self::decode( $event ) );
	}

	public function testUpstreamTimeout(): void {
		$event = $this->dispatch( '/api/metrics/pageviews/en.wikipedia', new TimeoutException( 'timeout' ) );

		static::assertSame( 504, $event->getResponse()->getStatusCode() );
		$error = self::decode( $event );
		static::assertSame( 'upstream_timeout', $error['code'] );
		static::assertSame( [ 'api-error-upstream-timeout', 'Pageviews API' ], $error['i18n'] );
		static::assertTrue( $error['retryable'] );
	}

	public function testUpstreamUnreachable(): void {
		$event = $this->dispatch(
			'/api/metrics/pageviews/en.wikipedia',
			new TransportException( 'Could not resolve host' )
		);

		static::assertSame( 502, $event->getResponse()->getStatusCode() );
		$error = self::decode( $event );
		static::assertSame( 'upstream_unreachable', $error['code'] );
		static::assertSame( [ 'api-error-upstream-unreachable', 'Pageviews API' ], $error['i18n'] );
		static::assertTrue( $error['retryable'] );
	}

	private static function driverException( string $message ): DriverExceptionInterface {
		return new class ( $message ) extends RuntimeException implements DriverExceptionInterface {
			public function getSQLState(): ?string {
				return null;
			}
		};
	}

	public function testReplicaUnavailable(): void {
		$event = $this->dispatch( '/api/pages/en.wikipedia/edits', new ConnectionException(
			self::driverException( 'Connection refused' ), null
		) );

		static::assertSame( 503, $event->getResponse()->getStatusCode() );
		$error = self::decode( $event );
		static::assertSame( 'replica_unavailable', $error['code'] );
		static::assertSame( [ 'api-error-upstream-unreachable', 'the replica database' ], $error['i18n'] );
		static::assertSame( 'replicas', $error['upstream'] );
		static::assertTrue( $error['retryable'] );
	}

	public function testReplicaQueryError(): void {
		$event = $this->dispatch( '/api/pages/en.wikipedia/edits', new DriverException(
			self::driverException( 'You have an error in your SQL syntax' ), null
		) );

		static::assertSame( 502, $event->getResponse()->getStatusCode() );
		$error = self::decode( $event );
		static::assertSame( 'replica_error', $error['code'] );
		static::assertSame( [ 'api-error', 'the replica database' ], $error['i18n'] );
		static::assertFalse( $error['retryable'] );
		static::assertStringNotContainsString( 'SQL syntax', $event->getResponse()->getContent() );
	}

	public function testLegacyInvalidArgument(): void {
		$event = $this->dispatch(
			'/api/pages/nope/edits',
			new InvalidArgumentException( 'Project nope is not a valid project or is unsupported.' )
		);

		static::assertSame( 400, $event->getResponse()->getStatusCode() );
		static::assertSame( 'invalid_param', self::decode( $event )['code'] );
	}

	public function testUnknownApiRoute(): void {
		$event = $this->dispatch( '/api/no/such/thing', new NotFoundHttpException() );

		static::assertSame( 404, $event->getResponse()->getStatusCode() );
		static::assertSame( 'not_found', self::decode( $event )['code'] );
	}

	public function testUnexpectedErrorsLeakNothing(): void {
		$event = $this->dispatch(
			'/api/metrics/pageviews/en.wikipedia',
			new RuntimeException( 'DB password is hunter2' )
		);

		static::assertSame( 500, $event->getResponse()->getStatusCode() );
		$error = self::decode( $event );
		static::assertSame( 'internal_error', $error['code'] );
		static::assertStringNotContainsString( 'hunter2', $event->getResponse()->getContent() );
	}
}
