import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors.js';
import {
	apiUrl,
	editProtectionLevel,
	getPageInfo,
	getWikilinks,
	getWikiprojects,
	mwApiGet,
	mwApiQueryAll
} from './mwApi.js';

function stubFetch( responses ) {
	let call = 0;
	const impl = vi.fn( () => Promise.resolve( {
		ok: true,
		json: () => Promise.resolve( responses[ Math.min( call++, responses.length - 1 ) ] )
	} ) );
	vi.stubGlobal( 'fetch', impl );
	return impl;
}

afterEach( () => {
	vi.unstubAllGlobals();
} );

describe( 'apiUrl', () => {
	it( 'normalizes the project domain', () => {
		expect( apiUrl( 'en.wikipedia.org' ) ).toBe( 'https://en.wikipedia.org/w/api.php' );
		expect( apiUrl( 'en.wikipedia' ) ).toBe( 'https://en.wikipedia.org/w/api.php' );
	} );
} );

describe( 'mwApiGet', () => {
	it( 'requests anonymous CORS JSON with piped arrays', async () => {
		const impl = stubFetch( [ { query: {} } ] );
		await mwApiGet( 'en.wikipedia.org', {
			action: 'query',
			titles: [ 'Cat', 'Dog' ]
		} );

		const url = new URL( impl.mock.calls[ 0 ][ 0 ] );
		expect( url.origin + url.pathname ).toBe( 'https://en.wikipedia.org/w/api.php' );
		expect( url.searchParams.get( 'origin' ) ).toBe( '*' );
		expect( url.searchParams.get( 'format' ) ).toBe( 'json' );
		expect( url.searchParams.get( 'formatversion' ) ).toBe( '2' );
		expect( url.searchParams.get( 'titles' ) ).toBe( 'Cat|Dog' );
	} );

	it( 'throws ApiError on an Action API error response', async () => {
		stubFetch( [ { error: { code: 'badtitle', info: 'Bad title.' } } ] );
		await expect( mwApiGet( 'en.wikipedia.org', {} ) )
			.rejects.toMatchObject( { name: 'ApiError', code: 'badtitle', upstream: 'mediawiki' } );
	} );

	it( 'throws ApiError on HTTP failure', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( { ok: false, status: 503 } ) ) );
		await expect( mwApiGet( 'en.wikipedia.org', {} ) )
			.rejects.toSatisfy( ( e ) => e instanceof ApiError && e.retryable );
	} );
} );

describe( 'getPageInfo', () => {
	it( 'requests watchers and protection, keyed by title', async () => {
		const impl = stubFetch( [ {
			query: { pages: [ { title: 'Cat', length: 5, watchers: 10, protection: [] } ] }
		} ] );

		const info = await getPageInfo( 'en.wikipedia.org', [ 'Cat' ] );

		const url = new URL( impl.mock.calls[ 0 ][ 0 ] );
		expect( url.searchParams.get( 'prop' ) ).toBe( 'info' );
		expect( url.searchParams.get( 'inprop' ) ).toBe( 'watchers|protection' );
		expect( info.Cat.length ).toBe( 5 );
	} );
} );

describe( 'editProtectionLevel', () => {
	it( 'extracts the edit-protection level', () => {
		expect( editProtectionLevel( {
			protection: [
				{ type: 'move', level: 'sysop' },
				{ type: 'edit', level: 'autoconfirmed' }
			]
		} ) ).toBe( 'autoconfirmed' );
	} );

	it( 'returns null when unprotected or unknown', () => {
		expect( editProtectionLevel( { protection: [] } ) ).toBeNull();
		expect( editProtectionLevel( { protection: [ { type: 'move', level: 'sysop' } ] } ) )
			.toBeNull();
		expect( editProtectionLevel( undefined ) ).toBeNull();
	} );
} );

describe( 'mwApiQueryAll', () => {
	it( 'follows continuation and concatenates extracted items', async () => {
		const impl = stubFetch( [
			{ query: { pages: [ 1, 2 ] }, continue: { rdcontinue: 'x', continue: '||' } },
			{ query: { pages: [ 3 ] } }
		] );

		const items = await mwApiQueryAll(
			'en.wikipedia.org',
			{ action: 'query' },
			( response ) => response.query.pages
		);

		expect( items ).toEqual( [ 1, 2, 3 ] );
		expect( impl ).toHaveBeenCalledTimes( 2 );
		// The second request must carry the continuation params.
		const url = new URL( impl.mock.calls[ 1 ][ 0 ] );
		expect( url.searchParams.get( 'rdcontinue' ) ).toBe( 'x' );
	} );

	it( 'stops at the item limit', async () => {
		const impl = stubFetch( [
			{ query: { pages: [ 1, 2, 3 ] }, continue: { c: '1' } }
		] );
		const items = await mwApiQueryAll(
			'en.wikipedia.org', {}, ( r ) => r.query.pages, 2
		);
		expect( items ).toEqual( [ 1, 2 ] );
		expect( impl ).toHaveBeenCalledOnce();
	} );
} );

describe( 'getWikilinks', () => {
	it( 'combines local links and URL-parsed interwiki links', async () => {
		const impl = stubFetch( [ { query: { pages: [ {
			title: 'Cat',
			links: [ { ns: 0, title: 'Dog' }, { ns: 0, title: 'Fox' } ],
			iwlinks: [
				// Parsed from the URL, so no prefix map is needed.
				{ prefix: 'wikt', url: 'https://en.wiktionary.org/wiki/cat', title: 'cat' },
				{ prefix: 'fr', url: 'https://fr.wikipedia.org/w/index.php?title=Chat', title: 'Chat' },
				// Bare prefix links carry no page.
				{ prefix: 'd', url: 'https://www.wikidata.org/wiki/', title: '' },
				// Underscores and percent-encoding normalize to spaces.
				{ prefix: 'de', url: 'https://de.wikipedia.org/wiki/Hauskatze_%28Tier%29', title: 'x' }
			]
		} ] } } ] );

		const links = await getWikilinks( 'en.wikipedia.org', 'Cat' );

		expect( links ).toEqual( [
			{ project: 'en.wikipedia.org', title: 'Dog' },
			{ project: 'en.wikipedia.org', title: 'Fox' },
			{ project: 'en.wiktionary.org', title: 'cat' },
			{ project: 'fr.wikipedia.org', title: 'Chat' },
			{ project: 'de.wikipedia.org', title: 'Hauskatze (Tier)' }
		] );
		expect( impl.mock.calls[ 0 ][ 0 ] ).toContain( 'iwprop=url' );
	} );

	it( 'returns null for a missing page', async () => {
		stubFetch( [ { query: { pages: [ { title: 'Nope', missing: true } ] } } ] );
		expect( await getWikilinks( 'en.wikipedia.org', 'Nope' ) ).toBeNull();
	} );
} );

describe( 'getWikiprojects', () => {
	it( 'fetches the list once per wiki and memoizes it', async () => {
		const impl = stubFetch( [ { query: { projects: [ 'Volcanoes', 'Military history' ] } } ] );

		const first = await getWikiprojects( 'test-memo.wikipedia.org' );
		const second = await getWikiprojects( 'test-memo.wikipedia.org' );

		expect( first ).toEqual( [ 'Volcanoes', 'Military history' ] );
		expect( second ).toBe( first );
		expect( impl ).toHaveBeenCalledTimes( 1 );
		expect( String( impl.mock.calls[ 0 ][ 0 ] ) ).toContain( 'list=projects' );
	} );

	it( 'degrades to no suggestions on failure, without memoizing it', async () => {
		// A wiki without PageAssessments rejects the list parameter.
		stubFetch( [ { error: { code: 'badvalue', info: 'Unrecognized value' } } ] );

		expect( await getWikiprojects( 'test-fail.wikipedia.org' ) ).toEqual( [] );

		// A later attempt fetches again rather than reusing the failure.
		const impl = stubFetch( [ { query: { projects: [ 'Volcanoes' ] } } ] );
		expect( await getWikiprojects( 'test-fail.wikipedia.org' ) ).toEqual( [ 'Volcanoes' ] );
		expect( impl ).toHaveBeenCalledTimes( 1 );
	} );
} );
