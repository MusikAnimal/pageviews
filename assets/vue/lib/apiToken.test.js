import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module holds token state, so each test imports a fresh copy.
async function freshModule( bootstrapToken = 'boot-token' ) {
	vi.resetModules();
	document.body.dataset.appConfig = JSON.stringify( { apiToken: bootstrapToken } );
	return import( './apiToken.js' );
}

describe( 'apiToken', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
		delete document.body.dataset.appConfig;
	} );

	it( 'bootstraps the token from data-app-config', async () => {
		const { getToken } = await freshModule( 'from-shell' );
		expect( getToken() ).toBe( 'from-shell' );
	} );

	it( 'tolerates a missing config', async () => {
		vi.resetModules();
		delete document.body.dataset.appConfig;
		const { getToken } = await import( './apiToken.js' );
		expect( getToken() ).toBeNull();
	} );

	it( 'renews by posting the old token and swaps state', async () => {
		const { getToken, refreshToken } = await freshModule( 'old-token' );
		const impl = vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( { token: 'new-token' } )
		} ) );
		vi.stubGlobal( 'fetch', impl );

		await expect( refreshToken() ).resolves.toBe( 'new-token' );
		expect( impl ).toHaveBeenCalledWith( '/auth/token', expect.objectContaining( {
			method: 'POST',
			body: JSON.stringify( { token: 'old-token' } )
		} ) );
		expect( getToken() ).toBe( 'new-token' );
	} );

	it( 'shares one in-flight renewal between concurrent callers', async () => {
		const { refreshToken } = await freshModule();
		const impl = vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( { token: 'new-token' } )
		} ) );
		vi.stubGlobal( 'fetch', impl );

		await Promise.all( [ refreshToken(), refreshToken() ] );
		expect( impl ).toHaveBeenCalledOnce();
	} );

	it( 'rejects on a failed renewal and can retry after', async () => {
		const { refreshToken } = await freshModule();
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( { ok: false, status: 401 } ) ) );
		await expect( refreshToken() ).rejects.toThrow( '401' );

		// The single-flight slot is released for a later attempt.
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( { token: 'recovered' } )
		} ) ) );
		await expect( refreshToken() ).resolves.toBe( 'recovered' );
	} );
} );
