<template>
	<!-- Codex buttons default to type=submit; nothing here should
		trigger a native form submission. -->
	<form
		class="app-settings"
		:aria-label="$i18n( 'options' )"
		@submit.prevent
	>
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<DateRangeInput />
		<!-- Quarry results, link searches, text searches and
			WikiProjects don't carry a project in the target, so it's
			chosen here. -->
		<ProjectInput
			v-if="PROJECT_SOURCES.includes( source )"
			v-model="project"
			:projects="projectsAllowList"
			:invalid-html="source === 'wikiproject' ? wikiprojectInvalidHtml : null"
		/>
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
		<!-- Filters the results to one namespace; the IDs also apply
			to the multi-wiki sources (hashtag, interwiki links) since
			the core namespaces share IDs across wikis. -->
		<NamespaceInput v-model="namespace" :project="project" />
		<CdxField class="app-settings__redirects">
			<!-- The help button is a sibling of the checkbox, not inside
				its label, so clicking it can't toggle the checkbox (and
				its 32px hit area doesn't inflate the label line). -->
			<div class="app-settings__redirects-row">
				<CdxCheckbox v-model="redirects">
					{{ $i18n( 'include-redirects' ) }}
				</CdxCheckbox>
				<FaqHelpButton
					section="redirects"
					:aria-label="$i18n( 'faq-redirects-title' )"
				/>
			</div>
		</CdxField>
	</form>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxCheckbox, CdxField } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import FaqHelpButton from '../../components/FaqHelpButton.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import NamespaceInput from '../../components/NamespaceInput.vue';
import { PROJECT_SOURCES, useMassviewsStore } from '../../stores/massviews.js';
import { getAssessmentWikis } from '../../projects.js';
import { banana } from '../../i18n.js';

const store = useMassviewsStore();
const { source, project, platform, agent, namespace, redirects } = storeToRefs( store );

// The wikis running PageAssessments — the only projects the
// WikiProject source can query, so the project input restricts its
// suggestions and validation to them.
const assessmentProjects = ref( [] );
loadAssessmentProjects(); // fire-and-forget: only feeds the input
async function loadAssessmentProjects() {
	assessmentProjects.value = ( await getAssessmentWikis() )
		.map( ( wiki ) => `${ wiki }.org` );
}

// Null until loaded (or on fetch failure): the input falls back to
// the full allow-list rather than rejecting everything.
const projectsAllowList = computed( () => (
	source.value === 'wikiproject' && assessmentProjects.value.length ?
		assessmentProjects.value :
		null
) );

// Switching to the WikiProject source keeps the project when it can;
// a wiki without PageAssessments is blanked instead, putting the
// input in its fill-me-out error state. (A project arriving via the
// URL is left alone — the submission error explains it.)
watch( source, ( value ) => {
	if (
		value === 'wikiproject' &&
		assessmentProjects.value.length &&
		project.value &&
		!assessmentProjects.value.includes( project.value )
	) {
		project.value = '';
	}
} );

/**
 * The WikiProject source's project-input error: the wiki is valid,
 * just not running the PageAssessments extension.
 *
 * @param {string} domain As typed.
 * @return {string} HTML.
 */
function wikiprojectInvalidHtml( domain ) {
	const projectLink = document.createElement( 'a' );
	projectLink.href = `https://${ domain }`;
	projectLink.target = '_blank';
	projectLink.innerText = domain;
	const extensionLink = document.createElement( 'a' );
	extensionLink.href = 'https://www.mediawiki.org/wiki/Special:MyLanguage/Extension:PageAssessments';
	extensionLink.target = '_blank';
	extensionLink.innerText = banana.i18n( 'massviews-wikiproject-unsupported-link' );
	return banana.i18n(
		'massviews-wikiproject-unsupported',
		projectLink.outerHTML,
		extensionLink.outerHTML
	);
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-settings__redirects-row {
	align-items: center;
	display: flex;
	gap: @spacing-25;

	// Mirrors Codex's own margin selector so this outranks it on
	// specificity, not on stylesheet load order (which differs
	// between the dev server and the build).
	.cdx-checkbox:not( .cdx-checkbox--inline ) {
		margin-bottom: 0;
	}
}
</style>
