<template>
	<CdxField
		class="app-settings__project"
		:status="status ? 'error' : 'default'"
	>
		<template #label>
			{{ label || $i18n( 'project' ) }}
		</template>
		<template #error>
			<!-- The status message can contain anchors built from i18n messages. -->
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span v-html="status" />
		</template>

		<CdxLookup
			ref="lookup"
			v-model:selected="project"
			v-model:input-value="currentSearchTerm"
			required
			:menu-items="menuItems"
			:menu-config="menuConfig"
			:aria-label="label || $i18n( 'project' )"
			:clearable="true"
			:disabled="allProjectsToggle && allProjects"
			@input="onInput"
			@change="checkValidity"
			@clear="onClear"
			@update:selected="onSelect"
		/>
		<!-- On the lookup, not the field: a disabled field would also
			disable this checkbox, making it impossible to uncheck. -->
		<CdxCheckbox
			v-if="allProjectsToggle"
			v-model="allProjects"
			class="app-settings__project-all"
		>
			{{ $i18n( 'all-projects' ) }}
		</CdxCheckbox>
	</CdxField>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { CdxCheckbox, CdxField, CdxLookup } from '@wikimedia/codex';
import { banana } from '../i18n.js';
import { getProjects } from '../projects.js';

/**
 * Prop-driven: apps bind their own store's project ref.
 */
const project = defineModel( {
	type: [ String, null ],
	required: true
} );

const props = defineProps( {
	// Label override (defaults to "Project"), e.g. Langviews'
	// "Source project".
	label: {
		type: String,
		default: ''
	},
	// Offer an "All projects" checkbox below the lookup (Mediaviews'
	// categories source, where Commons Impact Metrics can count one
	// wiki or all of them); checking it disables the lookup. Bind the
	// state with v-model:all-projects.
	allProjectsToggle: {
		type: Boolean,
		default: false
	},
	// Restrict the input to these domains (with the .org suffix)
	// instead of the full pageviews allow-list — both the suggestions
	// and the validation (e.g. Massviews' WikiProject source only
	// works on wikis running PageAssessments).
	projects: {
		type: Array,
		default: null
	},
	// Builds the error HTML for a project outside the restricted
	// list, given the typed domain. Without it, the generic
	// invalid-project message is used — misleading when the wiki is
	// valid but unsupported for the caller's purpose.
	invalidHtml: {
		type: Function,
		default: null
	}
} );

const allProjects = defineModel( 'allProjects', {
	type: Boolean,
	default: false
} );

const lookup = ref( null );

/**
 * The full pageviews allow-list, fetched on mount.
 *
 * @type {import( 'vue' ).Ref<string[]>}
 */
const fetchedProjects = ref( [] );
/**
 * What the lookup suggests and validates against: the caller's
 * restricted list when given, the full allow-list otherwise.
 *
 * @type {import( 'vue' ).ComputedRef<string[]>}
 */
const supportedProjects = computed( () => props.projects ?? fetchedProjects.value );
/**
 * Validation status for the project input field.
 *
 * @type {import( 'vue' ).Ref<string>}
 */
const status = ref( '' );
/**
 * List of menu items for the lookup component, derived from the supported projects.
 *
 * @type {import( 'vue' ).Ref<import( '@wikimedia/codex' ).MenuItemData[]>}
 */
const menuItems = ref( supportedProjects.value.map( ( projectId ) => ( {
	value: projectId,
	label: projectId
} ) ) );
/**
 * Current input value for the lookup component.
 *
 * @type {import( 'vue' ).Ref<string>}
 */
const currentSearchTerm = ref( project.value );

const menuConfig = { visibleItemLimit: 10 };

// Checking "All projects" disables the lookup: the text and
// whatever error it had no longer apply.
watch( allProjects, ( checked ) => {
	if ( checked ) {
		currentSearchTerm.value = '';
		status.value = '';
	}
} );

// The list can change underneath (the fetch landing, or the caller
// swapping in a restricted list, e.g. when the Massviews source
// changes): refresh the menu and re-judge the current text.
watch( supportedProjects, ( list ) => {
	menuItems.value = list.map( ( projectId ) => ( {
		value: projectId,
		label: projectId
	} ) );
	checkValidity();
} );

// The parent can swap the project from outside (e.g. unchecking All
// projects restores the default wiki): sync the visible text and
// re-validate. An empty string is an explicit clear (e.g. Massviews
// blanking a wiki the WikiProject source can't use) and empties the
// field, leaving the required-input error; null is ignored — the
// lookup also nulls the selection whenever the typed text matches
// nothing, which must not wipe the text (or its error) mid-edit.
watch( project, ( value ) => {
	if ( value === '' && currentSearchTerm.value ) {
		currentSearchTerm.value = '';
		checkValidity();
		return;
	}
	if ( !value || value === currentSearchTerm.value ) {
		return;
	}
	currentSearchTerm.value = value;
	checkValidity();
} );

/**
 * The project is required: when cleared, keep focus here so the user
 * fills it in (the pages input clears itself but must not steal focus).
 * The visible text is ours to reset — Codex clears only the selection,
 * not a bound input-value model.
 */
function onClear() {
	currentSearchTerm.value = '';
	checkValidity();
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

/**
 * Handles input events from the lookup component, filtering the supported projects
 * based on the input value and updating the menu items accordingly.
 *
 * @param {string} value
 */
function onInput( value ) {
	if ( value ) {
		currentSearchTerm.value = value;

		menuItems.value = supportedProjects.value
			.filter( ( item ) => item.includes( value ) )
			.map( ( projectId ) => ( {
				value: projectId,
				label: projectId
			} ) );
	} else {
		// An emptied input (the X button, select-all + delete) puts
		// the lookup in its pending state until the menu items change:
		// hand it a fresh list so it doesn't stay loading forever.
		menuItems.value = [];
	}
}

/**
 * Checks the validity of the project input field and updates the status message accordingly.
 */
async function checkValidity() {
	await nextTick();
	const input = lookup.value?.$el?.querySelector( 'input' );
	if ( !input ) {
		return;
	}
	const valid = input.checkValidity();

	// Judged on the visible text, not the selection model: typing an
	// unknown project never produces a selection, and some parents
	// keep the previous (valid) value in that case.
	const unsupported = supportedProjects.value.length &&
		currentSearchTerm.value &&
		!supportedProjects.value.includes( currentSearchTerm.value );
	if ( !valid ) {
		status.value = input.validationMessage;
	} else if ( unsupported ) {
		status.value = props.invalidHtml ?
			props.invalidHtml( currentSearchTerm.value ) :
			defaultInvalidHtml( currentSearchTerm.value );
	} else {
		status.value = '';
	}
}

/**
 * The generic not-on-the-allow-list error, linking the project and
 * the allow-list.
 *
 * @param {string} domain
 * @return {string}
 */
function defaultInvalidHtml( domain ) {
	const projectLink = document.createElement( 'a' );
	projectLink.href = `https://${ domain }`;
	projectLink.target = '_blank';
	projectLink.innerText = domain;
	const allowListLink = document.createElement( 'a' );
	allowListLink.href = 'https://gerrit.wikimedia.org/r/plugins/gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv';
	allowListLink.target = '_blank';
	allowListLink.innerText = banana.i18n( 'invalid-project-link' );
	return banana.i18n( 'invalid-project', projectLink.outerHTML, allowListLink.outerHTML );
}

/**
 * Handles selection events from the lookup component, updating the current search term
 * and checking the validity of the input field.
 */
function onSelect() {
	if ( project.value !== null ) {
		currentSearchTerm.value = project.value;
	}
	checkValidity();
}

onMounted( async () => {
	// The supportedProjects watcher populates the menu (the initial
	// mapping ran before the list loaded) so programmatic selections
	// resolve.
	fetchedProjects.value = Object.keys( await getProjects() )
		.map( ( projectId ) => `${ projectId }.org` );
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-settings__project-all {
	margin-top: @spacing-50;
}
</style>
