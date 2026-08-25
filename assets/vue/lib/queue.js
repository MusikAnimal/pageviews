/**
 * A bounded-concurrency promise pool for API fan-outs, replacing the
 * legacy tool's sequential_promise_queue + HackTimer throttling.
 */

/**
 * Run a worker over every item with bounded concurrency, preserving
 * result order. A worker rejection fails fast: no further items are
 * started, and the first error propagates (the caller decides whether
 * to also abort what is still in flight). Workers that should
 * tolerate failure must catch their own errors.
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
	let failed = false;

	async function run() {
		while ( nextIndex < items.length && !failed ) {
			const index = nextIndex++;
			try {
				results[ index ] = await worker( items[ index ], index );
			} catch ( error ) {
				failed = true;
				throw error;
			}
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
