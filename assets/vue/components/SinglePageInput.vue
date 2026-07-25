<template>
	<CdxField class="app-pages">
		<template #label>
			{{ label || $i18n( 'page-title' ) }}
		</template>
		<CdxLookup
			ref="lookup"
			v-model:selected="selected"
			v-model:input-value="inputValue"
			:menu-items="menuItems"
			:clearable="true"
			:aria-label="label || $i18n( 'page-title' )"
			:placeholder="placeholder || $i18n( 'article-placeholder' )"
			@input="onInput"
			@update:selected="onSelect"
			@keydown.enter="onEnter"
			@clear="onClear"
		/>
	</CdxField>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
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
	},
	// Autocomplete usernames (Userviews) instead of page titles: the
	// prefixsearch runs in the User namespace and results are stripped
	// to the bare name (no prefix, no subpages).
	userSearch: {
		type: Boolean,
		default: false
	},
	// Label override (defaults to "Page title").
	label: {
		type: String,
		default: ''
	},
	placeholder: {
		type: String,
		default: ''
	}
} );

/**
 * submit: the user hit Enter — the parent should run the query.
 */
const emit = defineEmits( [ 'submit' ] );

const displayName = ( name ) => name.replace( /_/g, ' ' );

const selected = ref( page.value ? displayName( page.value ) : null );
const inputValue = ref( page.value ? displayName( page.value ) : '' );
const menuItems = ref( [] );
const lookup = ref( null );

// Submission-based tools put the cursor on the main input on page
// load (unless a URL-provided page is already being queried).
onMounted( () => {
	if ( !page.value ) {
		lookup.value?.$el?.querySelector( 'input' )?.focus();
	}
} );

let debounceTimer = null;
// Bumped to invalidate in-flight autocomplete responses (e.g. after
// Enter): a late response must not repopulate the menu.
let searchId = 0;

// Store → component, e.g. after URL-driven changes. When the input
// already shows the page (e.g. it was just submitted via Enter),
// leave the lookup alone — setting `selected` to a value that isn't
// among the menu items makes Codex clear the field.
watch( page, ( value ) => {
	const display = value ? displayName( value ) : '';
	if ( display !== inputValue.value ) {
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
	searchId++;
	// Let a Codex highlight-selection land first.
	await nextTick();
	if ( !selected.value && inputValue.value ) {
		// Submit without touching `selected`: a selection that isn't
		// among the menu items gets cleared by Codex once the menu
		// changes.
		menuItems.value = [];
		page.value = inputValue.value;
	}
	if ( page.value ) {
		// Blurring closes the suggestion menu in every case — clearing
		// menuItems can't be done when a selection landed (Codex drops
		// a selection that vanishes from the menu). The legacy tool
		// likewise blurred the active input when processing started.
		lookup.value?.$el?.querySelector( 'input' )?.blur();
		emit( 'submit' );
	}
}

/**
 * Keep focus here after the clear button, ready for the next entry
 * (Codex exposes no focus API, hence the DOM reach-in).
 */
function onClear() {
	lookup.value?.$el?.querySelector( 'input' )?.focus();
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
	const id = ++searchId;
	debounceTimer = setTimeout( async () => {
		try {
			const response = await mwApiGet( props.project, {
				action: 'query',
				list: 'prefixsearch',
				...( props.userSearch ?
					{ pssearch: `User:${ value }`, psnamespace: 2 } :
					{ pssearch: value, cirrusUseCompletionSuggester: 'yes' }
				),
				pslimit: 10
			} );
			if ( id !== searchId ) {
				// Superseded (newer keystroke or an Enter submission).
				return;
			}
			let titles = ( response.query?.prefixsearch || [] )
				.map( ( { title } ) => title );
			if ( props.userSearch ) {
				// User:Name/subpage → Name, deduplicated.
				titles = [ ...new Set( titles.map(
					( title ) => title.split( '/' )[ 0 ].slice( title.indexOf( ':' ) + 1 )
				) ) ];
			}
			menuItems.value = titles.map( ( title ) => ( { value: title, label: title } ) );
		} catch {
			// Autocomplete failures are non-fatal; just show no matches.
			if ( id === searchId ) {
				menuItems.value = [];
			}
		}
	}, DEBOUNCE_MS );
}
</script>
