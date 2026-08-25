import { describe, expect, it } from 'vitest';
import { promisePool } from './queue.js';

describe( 'promisePool', () => {
	it( 'preserves result order regardless of completion order', async () => {
		const results = await promisePool(
			[ 30, 10, 20 ],
			( ms ) => new Promise( ( resolve ) => {
				setTimeout( () => resolve( ms ), ms );
			} ),
			{ concurrency: 3 }
		);
		expect( results ).toEqual( [ 30, 10, 20 ] );
	} );

	it( 'never exceeds the concurrency limit', async () => {
		let running = 0;
		let peak = 0;
		await promisePool(
			Array.from( { length: 10 }, ( _, i ) => i ),
			async () => {
				running++;
				peak = Math.max( peak, running );
				await new Promise( ( resolve ) => {
					setTimeout( resolve, 5 );
				} );
				running--;
			},
			{ concurrency: 3 }
		);
		expect( peak ).toBeLessThanOrEqual( 3 );
	} );

	it( 'reports progress after each item', async () => {
		const progress = [];
		await promisePool(
			[ 'a', 'b', 'c' ],
			async ( item ) => item,
			{ concurrency: 2, onProgress: ( done, total ) => progress.push( [ done, total ] ) }
		);
		expect( progress ).toEqual( [ [ 1, 3 ], [ 2, 3 ], [ 3, 3 ] ] );
	} );

	it( 'stops starting items after a rejection', async () => {
		const started = [];
		await expect( promisePool(
			[ 0, 1, 2, 3, 4, 5 ],
			( item ) => {
				started.push( item );
				return item === 0 ?
					Promise.reject( new Error( 'boom' ) ) :
					new Promise( ( resolve ) => {
						setTimeout( () => resolve( item ), 5 );
					} );
			},
			{ concurrency: 2 }
		) ).rejects.toThrow( 'boom' );
		// Worker A failed on item 0; worker B was already running item
		// 1 and may finish it, but nothing further starts.
		expect( started ).toEqual( [ 0, 1 ] );
	} );

	it( 'propagates worker rejections', async () => {
		await expect( promisePool(
			[ 1, 2 ],
			async ( item ) => {
				if ( item === 2 ) {
					throw new Error( 'boom' );
				}
				return item;
			}
		) ).rejects.toThrow( 'boom' );
	} );

	it( 'handles empty input', async () => {
		expect( await promisePool( [], async () => {} ) ).toEqual( [] );
	} );
} );
