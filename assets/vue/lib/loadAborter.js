/**
 * Tracks the AbortController behind a store's load cycle. Starting a
 * new cycle aborts the previous one's in-flight requests (so a re-fired
 * query, or a cleared form, never leaves stale requests running), and
 * abort() cancels the current cycle outright — the stores' loadId
 * guards keep any already-settled responses from landing.
 *
 * @return {{ next: () => AbortSignal, abort: () => void }}
 */
export function createLoadAborter() {
	let controller = null;
	return {
		/**
		 * Abort the previous cycle and begin a new one.
		 *
		 * @return {AbortSignal} Signal for the new cycle's requests.
		 */
		next() {
			controller?.abort();
			controller = new AbortController();
			return controller.signal;
		},
		/**
		 * Cancel the current cycle.
		 */
		abort() {
			controller?.abort();
			controller = null;
		}
	};
}
