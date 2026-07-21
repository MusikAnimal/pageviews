import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const usePageviewsStore = defineStore( 'pageviews', () => {
	/**
	 * The pages to query for.
	 *
	 * @type {import( 'vue' ).Ref<string[]>}
	 */
	const pages = ref( [] );
	/**
	 * Whether pageviews of redirects to the given pages should be included.
	 *
	 * @type {import( 'vue' ).Ref<boolean>}
	 */
	const redirects = ref( false );

	/**
	 * The canonical serialized form of the app params, for the URL query string.
	 * Pages are pipe-delimited, matching the legacy tool's URL structure.
	 *
	 * @type {import( 'vue' ).ComputedRef<Object>}
	 */
	const query = computed( () => ( {
		pages: pages.value.join( '|' ) || undefined,
		redirects: redirects.value ? '1' : undefined
	} ) );

	/**
	 * Populate the store from URL query params.
	 *
	 * @param {Object} params Parsed query string (from vue-router route.query).
	 */
	function setFromQuery( params ) {
		if ( params.pages ) {
			pages.value = params.pages.split( '|' ).filter( ( page ) => page !== '' );
		}
		redirects.value = params.redirects === '1';
	}

	return {
		pages,
		redirects,
		query,
		setFromQuery
	};
} );
