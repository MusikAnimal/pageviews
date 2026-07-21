import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDefaultPages } from './defaultPages.js';
import { mwApiGet } from './mwApi.js';

vi.mock( './mwApi.js', () => ( {
	mwApiGet: vi.fn()
} ) );
vi.mock( '../projects.js', () => ( {
	getProjects: vi.fn( () => Promise.resolve( {
		'de.wikipedia': 'dewiki',
		'xx.wikipedia': 'xxwiki'
	} ) )
} ) );

afterEach( () => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
} );

describe( 'getDefaultPages', () => {
	it( 'returns Cat and Dog for English Wikipedia without lookups', async () => {
		expect( await getDefaultPages( 'en.wikipedia.org' ) ).toEqual( [ 'Cat', 'Dog' ] );
		expect( mwApiGet ).not.toHaveBeenCalled();
	} );

	it( 'localizes via Wikidata sitelinks elsewhere', async () => {
		mwApiGet.mockResolvedValue( {
			entities: {
				Q146: { sitelinks: { dewiki: { title: 'Hauskatze' } } },
				Q144: { sitelinks: { dewiki: { title: 'Haushund' } } }
			}
		} );

		expect( await getDefaultPages( 'de.wikipedia.org' ) )
			.toEqual( [ 'Hauskatze', 'Haushund' ] );
		expect( mwApiGet ).toHaveBeenCalledWith( 'www.wikidata.org', expect.objectContaining( {
			action: 'wbgetentities',
			sitefilter: 'dewiki'
		} ) );
	} );

	it( 'falls back to the main page when no sitelinks exist', async () => {
		mwApiGet.mockResolvedValue( { entities: {} } );
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( {
			json: () => Promise.resolve( { general: { mainpage: 'Hoofdpagina' } } )
		} ) ) );

		expect( await getDefaultPages( 'xx.wikipedia.org' ) ).toEqual( [ 'Hoofdpagina' ] );
		expect( fetch ).toHaveBeenCalledWith( '/siteinfo/xx.wikipedia' );
	} );

	it( 'returns empty on failure', async () => {
		mwApiGet.mockRejectedValue( new Error( 'wikidata down' ) );
		expect( await getDefaultPages( 'de.wikipedia.org' ) ).toEqual( [] );
	} );
} );
