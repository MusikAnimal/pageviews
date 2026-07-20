import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore( 'settings', () => {
	/**
	 * The Wikimedia project to query for data.
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const project = ref( 'en.wikipedia.org' );
	/**
	 * The start date for the data query, either in YYYY-MM-DD format (daily)
	 * or in YYYY-MM format (monthly).
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const start = ref( '' );
	/**
	 * The end date for the data query, either in YYYY-MM-DD format (daily)
	 * or in YYYY-MM format (monthly).
	 *
	 * @type {import( 'vue' ).Ref<string>}
	 */
	const end = ref( '' );
	/**
	 * The type of date range to query for, either 'daily' or 'monthly'.
	 *
	 * @type {import( 'vue' ).Ref<'daily'|'monthly'>}
	 */
	const dateType = ref( 'daily' );
	/**
	 * The platform to query for.
	 *
	 * @type {import( 'vue' ).Ref<'all'|'desktop'|'mobile app'|'mobile web'>}
	 */
	const platform = ref( 'all' );
	/**
	 * The agent to query for.
	 *
	 * @type {import( 'vue' ).Ref<'all'|'user'|'spider'|'automated'>}
	 */
	const agent = ref( 'user' );

	function setFromQuery( query ) {
		if ( query.project ) {
			project.value = query.project;
		}
		if ( query.start ) {

		}
	}

	return {
		project,
		start,
		end,
		dateType,
		platform,
		agent,
		setFromQuery
	};
} );
