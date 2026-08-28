<template>
	<CdxLookup
		ref="lookup"
		v-model:selected="selected"
		v-model:input-value="inputValue"
		class="app-page-input-row__input"
		:menu-items="menuItems"
		:menu-config="{ visibleItemLimit: 10 }"
		:clearable="true"
		:aria-label="$i18n( 'wikiproject' )"
		:placeholder="placeholder"
		@input="onInput"
		@keydown.enter="onEnter"
		@clear="emit( 'clear' )"
	/>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { CdxLookup } from '@wikimedia/codex';
import { getWikiprojects } from '../../lib/mwApi.js';

/**
 * The Massviews WikiProject source's target input: free text (the
 * name as PageAssessments stores it) with suggestions filtered
 * locally from the wiki's full list=projects list. Typing a name the
 * list doesn't know is still submittable — the suggestions are a
 * convenience, not validation.
 */
const target = defineModel( {
	type: String,
	required: true
} );

const props = defineProps( {
	// The wiki whose WikiProjects to suggest.
	project: {
		type: String,
		required: true
	},
	placeholder: {
		type: String,
		default: ''
	}
} );

const emit = defineEmits( [ 'submit', 'clear' ] );

const lookup = ref( null );
const selected = ref( null );
const menuItems = ref( [] );
/** @type {string[]} The wiki's WikiProject names, spaces. */
let projectList = [];

async function loadList( domain ) {
	menuItems.value = [];
	// A blanked project (e.g. a wiki the source can't use was cleared)
	// has nothing to suggest.
	if ( !domain ) {
		projectList = [];
		return;
	}
	const list = await getWikiprojects( domain );
	// The project may have changed while the list loaded.
	if ( domain === props.project ) {
		projectList = list;
	}
}

watch( () => props.project, loadList );
// Fire-and-forget: the list only feeds suggestions, nothing awaits it.
loadList( props.project );

// The typed text is the value; the store's target follows every
// keystroke (and menu selections, which Codex echoes into the input).
const inputValue = ref( target.value );
watch( inputValue, ( value ) => {
	target.value = value;
} );
// Store → component, e.g. URL-driven changes or a source switch
// clearing the target.
watch( target, ( value ) => {
	if ( value !== inputValue.value ) {
		inputValue.value = value;
	}
} );

/**
 * Case-insensitive substring filter over the wiki's WikiProject
 * names.
 *
 * @param {string} value
 */
function onInput( value ) {
	if ( !value ) {
		menuItems.value = [];
		return;
	}
	const needle = value.toLowerCase();
	menuItems.value = projectList
		.filter( ( name ) => name.toLowerCase().includes( needle ) )
		.slice( 0, 50 )
		.map( ( name ) => ( { value: name, label: name } ) );
}

/**
 * Enter submits the query. This handler runs BEFORE Codex's own on
 * the same keystroke (Vue calls the fallthrough listener first), so
 * wait out the event dispatch: a highlighted suggestion then sits in
 * the selection model (set synchronously during dispatch), while its
 * echo into the input text lags a further watcher flush — hence the
 * selection, when there is one, is the value to submit (typing that
 * no longer matches it nulls it right away). Dropping focus closes
 * the menu (it teleports to the body, so left open it would float
 * over the loading overlay and the results).
 */
async function onEnter() {
	await nextTick();
	target.value = selected.value ?? inputValue.value;
	lookup.value?.$el?.querySelector( 'input' )?.blur();
	emit( 'submit' );
}
</script>
