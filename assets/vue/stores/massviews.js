import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { createLoadAborter } from '../lib/loadAborter.js';
import { useUiStore } from './ui.js';

// The legacy page-list sources (category, wikilinks, subpages,
// transclusions, …) land here as they are ported. (The Commons
// category source turned out to be a single-request aggregate and
// lives in Mediaviews instead.)
const SOURCES = [];

export const useMassviewsStore = defineStore( 'massviews', () => {
	/**
	 * The list source; empty until the sources are ported.
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const source = ref( '' );
	/**
	 * The source's input (underscored in the URL, like the legacy
	 * tool's target param).
	 *
	 * @type {import('vue').Ref<string>}
	 */
	const target = ref( '' );
	/**
	 * @type {import('vue').Ref<'list'|'chart'>}
	 */
	const view = ref( 'list' );
	/**
	 * @type {import('vue').Ref<'initial'|'loading'|'complete'|'error'>}
	 */
	const status = ref( 'initial' );
	/**
	 * The date axis, YYYY-MM-DD or YYYY-MM (monthly).
	 *
	 * @type {import('vue').Ref<string[]>}
	 */
	const dates = ref( [] );
	/**
	 * The combined counts across the resolved pages (the chart series).
	 *
	 * @type {import('vue').Ref<?{counts: number[], total: number, average: number}>}
	 */
	const totals = ref( null );

	// Cancels the previous cycle's requests whenever a new one starts.
	const aborter = createLoadAborter();

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 *
	 * @type {import('vue').ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		source: source.value || undefined,
		target: target.value.replace( / /g, '_' ) || undefined,
		view: view.value
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( SOURCES.includes( params.source ) ) {
			source.value = params.source;
		}
		if ( params.target !== undefined && params.target !== target.value ) {
			target.value = params.target;
		}
		if ( [ 'list', 'chart' ].includes( params.view ) ) {
			view.value = params.view;
		}
	}

	/**
	 * Resolve the target through the selected source and fan out over
	 * the batched pageviews endpoint. No sources are wired up yet.
	 */
	async function load() {
		if ( !SOURCES.includes( source.value ) ) {
			return;
		}
	}

	/**
	 * Cancel the in-flight load (the overlay's Abort button). Nothing
	 * runs yet without sources; the full machinery returns with them.
	 */
	function abort() {
		aborter.abort();
		status.value = 'initial';
		useUiStore().clearProgress();
	}

	return {
		source,
		target,
		view,
		status,
		dates,
		totals,
		query,
		setFromQuery,
		load,
		abort
	};
} );
