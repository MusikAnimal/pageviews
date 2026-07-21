<template>
	<CdxField
		class="app-settings__project"
		:status="status ? 'error' : 'default'"
	>
		<template #label>
			{{ $i18n( 'project' ) }}
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
			:aria-label="$i18n( 'project' )"
			:clearable="true"
			@input="onInput"
			@change="checkValidity"
			@clear="onClear"
			@update:selected="onSelect"
		/>
	</CdxField>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings.js';
import { CdxField, CdxLookup } from '@wikimedia/codex';
import { banana } from '../i18n.js';
import { getProjects } from '../projects.js';

const store = useSettingsStore();

const { project } = storeToRefs( store );

const lookup = ref( null );

/**
 * The project is required: when cleared, keep focus here so the user
 * fills it in (the pages input clears itself but must not steal focus).
 */
function onClear() {
	checkValidity();
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

/**
 * List of supported projects for the lookup component.
 *
 * @type {import( 'vue' ).Ref<string[]>}
 */
const supportedProjects = ref( [] );
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
	}
}

/**
 * Checks the validity of the project input field and updates the status message accordingly.
 */
async function checkValidity() {
	await nextTick();
	const input = document.querySelector( '.app-settings__project input' );
	const valid = input.checkValidity();

	const unsupported = supportedProjects.value.length &&
		!supportedProjects.value.includes( project.value );
	if ( !valid ) {
		status.value = input.validationMessage;
	} else if ( unsupported ) {
		const projectLink = document.createElement( 'a' );
		projectLink.href = `https://${ currentSearchTerm.value }`;
		projectLink.target = '_blank';
		projectLink.innerText = currentSearchTerm.value;
		const allowListLink = document.createElement( 'a' );
		allowListLink.href = 'https://gerrit.wikimedia.org/r/plugins/gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv';
		allowListLink.target = '_blank';
		allowListLink.innerText = banana.i18n( 'invalid-project-link' );
		status.value = banana.i18n( 'invalid-project', projectLink.outerHTML, allowListLink.outerHTML );
	} else {
		status.value = '';
	}
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
	supportedProjects.value = Object.keys( await getProjects() )
		.map( ( projectId ) => `${ projectId }.org` );
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

</style>
