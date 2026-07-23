<template>
	<CdxField class="app-pages">
		<template #label>
			{{ $i18n( 'page-title' ) }}
		</template>
		<CdxLookup
			v-model:selected="selected"
			v-model:input-value="inputValue"
			:menu-items="menuItems"
			:clearable="true"
			:aria-label="$i18n( 'page-title' )"
			:placeholder="$i18n( 'article-placeholder' )"
			@input="onInput"
			@update:selected="onSelect"
			@keydown.enter="onEnter"
		/>
	</CdxField>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { CdxField, CdxLookup } from '@wikimedia/codex';
import { mwApiGet } from '../lib/mwApi.js';

const DEBOUNCE_MS = 200;

/**
 * Single-page selector with prefixsearch autocomplete, for the
 * list apps (Langviews, Redirectviews). Prop-driven: v-model is the
 * page title (spaces), `project` scopes the search.
 */
const page = defineModel( {
	type: String,
	required: true
} );

const props = defineProps( {
	project: {
		type: String,
		required: true
	}
} );

const displayName = ( name ) => name.replace( /_/g, ' ' );

const selected = ref( page.value ? displayName( page.value ) : null );
const inputValue = ref( page.value ? displayName( page.value ) : '' );
const menuItems = ref( [] );

let debounceTimer = null;

// Store → component, e.g. after URL-driven changes.
watch( page, ( value ) => {
	const display = value ? displayName( value ) : '';
	if ( display !== ( selected.value ?? '' ) ) {
		selected.value = display || null;
		inputValue.value = display;
	}
} );

// A new project invalidates the page.
watch( () => props.project, () => {
	selected.value = null;
	inputValue.value = '';
	menuItems.value = [];
	page.value = '';
} );

/**
 * Enter submits exactly what was typed. The suggestions lag behind
 * the keystrokes (debounced), so consulting them here could submit a
 * stale prefix hit — a highlighted menu item is still honored, since
 * Codex selects it before this runs.
 */
async function onEnter() {
	clearTimeout( debounceTimer );
	// Let a Codex highlight-selection land first.
	await nextTick();
	if ( selected.value || !inputValue.value ) {
		return;
	}
	menuItems.value = [];
	selected.value = inputValue.value;
	page.value = inputValue.value;
}

function onSelect( value ) {
	if ( value ) {
		inputValue.value = value;
		page.value = value;
	} else if ( selected.value === null && !inputValue.value ) {
		// Cleared.
		page.value = '';
	}
}

/**
 * Debounced prefixsearch autocomplete against the current project.
 *
 * @param {string} value
 */
function onInput( value ) {
	clearTimeout( debounceTimer );
	if ( !value ) {
		menuItems.value = [];
		page.value = '';
		return;
	}
	debounceTimer = setTimeout( async () => {
		try {
			const response = await mwApiGet( props.project, {
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
