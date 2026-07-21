<template>
	<CdxField class="app-settings__pages">
		<template #label>
			{{ $i18n( 'pages' ) }}
		</template>
		<template #help-text>
			{{ $i18n( 'num-pages-info', String( MAX_PAGES ) ) }}
		</template>
		<CdxMultiselectLookup
			v-model:input-chips="chips"
			v-model:selected="selected"
			:menu-items="menuItems"
			:aria-label="$i18n( 'pages' )"
			:placeholder="$i18n( 'article-placeholder' )"
			@input="onInput"
		/>
	</CdxField>
</template>

<script setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxField, CdxMultiselectLookup } from '@wikimedia/codex';
import { usePageviewsStore } from '../stores/pageviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { mwApiGet } from '../lib/mwApi.js';
import { banana } from '../i18n.js';

const MAX_PAGES = 10;
const DEBOUNCE_MS = 200;

const store = usePageviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
const { pages } = storeToRefs( store );

const chips = ref( pages.value.map( ( title ) => ( { value: title } ) ) );
const selected = ref( [ ...pages.value ] );
const menuItems = ref( [] );

let debounceTimer = null;
let warnedAboutMax = false;

// Store → component, e.g. after URL-driven changes.
watch( pages, ( titles ) => {
	if ( titles.join( '|' ) !== selected.value.join( '|' ) ) {
		selected.value = [ ...titles ];
		chips.value = titles.map( ( title ) => ( { value: title } ) );
	}
} );

// Component → store. The chips are the canonical user selection (the
// selected v-model follows them), enforcing the page cap — legacy
// suggests Massviews for larger sets.
watch( chips, ( chipList ) => {
	let titles = chipList.map( ( chip ) => String( chip.value ) );
	if ( titles.length > MAX_PAGES ) {
		titles = titles.slice( 0, MAX_PAGES );
		chips.value = titles.map( ( title ) => ( { value: title } ) );
		selected.value = titles;
		if ( !warnedAboutMax ) {
			warnedAboutMax = true;
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-notice', String( MAX_PAGES ), 'Massviews' )
			} );
		}
		return;
	}
	if ( titles.join( '|' ) !== pages.value.join( '|' ) ) {
		pages.value = titles;
	}
} );

/**
 * Debounced prefixsearch autocomplete against the current project.
 *
 * @param {string} value
 */
function onInput( value ) {
	clearTimeout( debounceTimer );
	if ( !value ) {
		menuItems.value = [];
		return;
	}
	debounceTimer = setTimeout( async () => {
		try {
			const response = await mwApiGet( settings.project, {
				action: 'query',
				list: 'prefixsearch',
				pssearch: value,
				pslimit: 10,
				cirrusUseCompletionSuggester: 'yes'
			} );
			menuItems.value = ( response.query?.prefixsearch || [] )
				.map( ( { title } ) => ( { value: title, label: title } ) );
		} catch {
			// Autocomplete failures are non-fatal; just show no matches.
			menuItems.value = [];
		}
	}, DEBOUNCE_MS );
}
</script>
