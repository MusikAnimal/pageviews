<template>
	<CdxField class="app-pages">
		<template #label>
			{{ $i18n( 'category' ) }}
		</template>
		<CdxLookup
			ref="lookup"
			v-model:selected="selected"
			v-model:input-value="inputValue"
			:menu-items="menuItems"
			:menu-config="{ visibleItemLimit: 10 }"
			:clearable="true"
			:aria-label="$i18n( 'category' )"
			placeholder="UNESCO"
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
import { getCommonsCategories } from '../../projects.js';

/**
 * Commons category selector for the Massviews commons-category
 * source. Unlike the API-backed lookups, the suggestions filter the
 * Commons Impact Metrics allow-list locally (~1800 entries, fetched
 * once) — only listed categories have data. Free text still submits
 * as typed, since the list can lag behind newly added categories.
 * v-model is the category name (spaces, no namespace prefix).
 */
const category = defineModel( {
	type: String,
	required: true
} );

/**
 * submit: the user hit Enter — the parent should run the query.
 */
const emit = defineEmits( [ 'submit' ] );

const displayName = ( name ) => name.replace( /_/g, ' ' );

const selected = ref( category.value ? displayName( category.value ) : null );
const inputValue = ref( category.value ? displayName( category.value ) : '' );
const menuItems = ref( [] );
const lookup = ref( null );
/** @type {string[]} Display-form allow-list entries. */
let categories = [];

// Submission-based tools put the cursor on the main input on page
// load (unless a URL-provided category is already being queried).
onMounted( async () => {
	if ( !category.value ) {
		lookup.value?.$el?.querySelector( 'input' )?.focus();
	}
	categories = ( await getCommonsCategories() ).map( displayName );
} );

// Store → component, e.g. after URL-driven changes. When the input
// already shows the category, leave the lookup alone — setting
// `selected` to a value that isn't among the menu items makes Codex
// clear the field.
watch( category, ( value ) => {
	const display = value ? displayName( value ) : '';
	if ( display !== inputValue.value ) {
		selected.value = display || null;
		inputValue.value = display;
	}
} );

/**
 * Enter submits exactly what was typed (the allow-list may lag behind
 * a newly added category) — a highlighted menu item is still honored,
 * since Codex selects it before this runs.
 */
async function onEnter() {
	// Let a Codex highlight-selection land first.
	await nextTick();
	if ( !selected.value && inputValue.value ) {
		// Submit without touching `selected`: a selection that isn't
		// among the menu items gets cleared by Codex once the menu
		// changes.
		menuItems.value = [];
		category.value = inputValue.value;
	}
	if ( category.value ) {
		// Blurring closes the suggestion menu in every case (see
		// SinglePageInput).
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
		category.value = value;
	} else if ( selected.value === null && !inputValue.value ) {
		// Cleared.
		category.value = '';
	}
}

/**
 * Case-insensitive substring filter over the allow-list.
 *
 * @param {string} value
 */
function onInput( value ) {
	if ( !value ) {
		menuItems.value = [];
		category.value = '';
		return;
	}
	const needle = value.toLowerCase();
	menuItems.value = categories
		.filter( ( name ) => name.toLowerCase().includes( needle ) )
		.slice( 0, 50 )
		.map( ( name ) => ( { value: name, label: name } ) );
}
</script>
