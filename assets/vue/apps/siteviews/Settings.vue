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
		<CdxField class="app-settings__metric">
			<template #label>
				{{ $i18n( 'metric' ) }}
			</template>
			<FaqHelpButton
				class="app-settings__metric-help"
				section="metric"
				:aria-label="$i18n( 'faq-source-title' )"
			/>
			<CdxSelect
				v-model:selected="source"
				:menu-items="sourceOptions"
				:aria-label="$i18n( 'metric' )"
			/>
		</CdxField>
		<PlatformInput v-model="platform" :options="platformOptions" />
		<AgentInput v-model="agent" :disabled="!store.isPageviews" />
		<CdxField class="app-settings__editor-type">
			<template #label>
				{{ $i18n( 'editor-type' ) }}
			</template>
			<CdxSelect
				v-model:selected="editorType"
				:menu-items="editorTypeOptions"
				:aria-label="$i18n( 'editor-type' )"
			/>
		</CdxField>
		<CdxField class="app-settings__page-type">
			<template #label>
				{{ $i18n( 'page-type' ) }}
			</template>
			<CdxSelect
				v-model:selected="pageType"
				:menu-items="pageTypeOptions"
				:aria-label="$i18n( 'page-type' )"
			/>
		</CdxField>
		<CdxField v-if="store.isPageviews" :is-fieldset="true">
			<template #label>
				{{ $i18n( 'query-for' ) }}
			</template>
			<CdxRadio
				v-for="option in queryForOptions"
				:key="option.value"
				v-model="allProjects"
				name="siteviews-query-for"
				:input-value="option.value"
			>
				{{ option.label }}
			</CdxRadio>
		</CdxField>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxField, CdxRadio, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import FaqHelpButton from '../../components/FaqHelpButton.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { DEFAULT_SITES, useSiteviewsStore } from '../../stores/siteviews.js';
import { useUiStore } from '../../stores/ui.js';
import { banana } from '../../i18n.js';

const store = useSiteviewsStore();
const ui = useUiStore();
const { source, platform, agent, editorType, pageType, sites } = storeToRefs( store );

const sourceOptions = computed( () => [
	{ value: 'pageviews', label: banana.i18n( 'pageviews' ) },
	{ value: 'unique-devices', label: banana.i18n( 'unique-devices' ) },
	{
		value: 'pagecounts',
		label: banana.i18n( 'pagecounts-legacy' ),
		// Grayed out when the selected dates fall outside the legacy
		// dataset's span.
		disabled: !store.pagecountsAvailable
	}
] );

const platformOptions = computed( () => store.isPageviews ?
	[
		{ value: 'all-access', label: banana.i18n( 'all' ) },
		{ value: 'desktop', label: banana.i18n( 'desktop' ) },
		{ value: 'mobile-app', label: banana.i18n( 'mobile-app' ) },
		{ value: 'mobile-web', label: banana.i18n( 'mobile-web' ) }
	] :
	[
		{ value: 'all-sites', label: banana.i18n( 'all' ) },
		{ value: 'desktop-site', label: banana.i18n( 'desktop' ) },
		{ value: 'mobile-site', label: banana.i18n( 'mobile' ) }
	]
);

// Vocabularies of the AQS edits data, feeding the Revisions figures.
const editorTypeOptions = [
	{ value: 'all-editor-types', label: banana.i18n( 'all' ) },
	{ value: 'anonymous', label: banana.i18n( 'anonymous' ) },
	{ value: 'group-bot', label: banana.i18n( 'group-bot' ) },
	{ value: 'name-bot', label: banana.i18n( 'name-bot' ) },
	{ value: 'user', label: banana.i18n( 'user' ) }
];

const pageTypeOptions = [
	{ value: 'all-page-types', label: banana.i18n( 'all' ) },
	{ value: 'content', label: banana.i18n( 'content' ) },
	{ value: 'non-content', label: banana.i18n( 'non-content' ) }
];

const queryForOptions = [
	{ value: 'individual', label: banana.i18n( 'individual-projects' ) },
	{ value: 'all', label: banana.i18n( 'all-projects' ) }
];

// The all-projects mode is expressed through the sites list itself
// (legacy URL contract: ?sites=all-projects).
const allProjects = computed( {
	get: () => store.isAllProjects ? 'all' : 'individual',
	set: ( value ) => {
		if ( value === 'all' ) {
			sites.value = [ 'all-projects' ];
		} else if ( store.isAllProjects ) {
			sites.value = [ ...DEFAULT_SITES ];
		}
	}
} );
</script>

<style scoped lang="less">
// Flush right, inline with the field's label.
.app-settings__metric {
	position: relative;
}

.app-settings__metric-help {
	position: absolute;
	right: 0;
	top: -5px;
}
</style>
