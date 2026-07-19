import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const usePageviewsStore = defineStore( 'pageviews', () => {
	const pages = ref( [] );

	const query = computed( () => ( {
		pages: pages.value.join( '|' ) || undefined,
	} ) );

	function setFromQuery( query ) {
		if ( query.pages ) {
			pages.value = query.pages.split( ',' );
		}
	}

	return {
		pages,
		query,
		setFromQuery
	};
} );
