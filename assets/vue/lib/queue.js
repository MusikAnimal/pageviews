/**
 * A bounded-concurrency promise pool for API fan-outs, replacing the
 * legacy tool's sequential_promise_queue + HackTimer throttling.
 */

/**
 * Run a worker over every item with bounded concurrency, preserving
 * result order. A worker rejection aborts the pool and propagates;
 * workers that should tolerate failure must catch their own errors.
 *
 * @param {Array} items
 * @param {Function} worker async ( item, index ) => result
 * @param {Object} [options]
 * @param {number} [options.concurrency]
 * @param {Function} [options.onProgress] ( done, total ), called after
 *   each item settles — drives the progress bar in list apps.
 * @return {Promise<Array>} Results in the same order as items.
 */
export async function promisePool( items, worker, { concurrency = 3, onProgress } = {} ) {
	const results = new Array( items.length );
	let nextIndex = 0;
	let done = 0;

	async function run() {
		while ( nextIndex < items.length ) {
			const index = nextIndex++;
			results[ index ] = await worker( items[ index ], index );
			done++;
			if ( onProgress ) {
				onProgress( done, items.length );
			}
		}
	}

	const workers = Array.from(
		{ length: Math.min( concurrency, items.length ) },
		() => run()
	);
	await Promise.all( workers );
	return results;
}
