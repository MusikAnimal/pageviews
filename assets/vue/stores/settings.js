import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore( 'main', () => {
	const project = ref( 'en.wikipedia.org' );

	function setFromQuery( query ) {
		if ( query.project ) {
			project.value = query.project;
		}
	}

	return {
		project,
		setFromQuery
	};
} );
