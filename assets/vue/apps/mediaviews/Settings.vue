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
		<ProjectInput v-model="project" />
		<CdxField class="app-settings__referer">
			<template #label>
				{{ $i18n( 'referer' ) }}
			</template>
			<CdxSelect
				v-model:selected="referer"
				:menu-items="refererOptions"
				:aria-label="$i18n( 'referer' )"
			/>
		</CdxField>
		<AgentInput v-model="agent" :options="agentOptions" />
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useMediaviewsStore } from '../../stores/mediaviews.js';
import { useUiStore } from '../../stores/ui.js';
import { banana } from '../../i18n.js';

const store = useMediaviewsStore();
const ui = useUiStore();
const { project, referer, agent } = storeToRefs( store );

const refererOptions = [
	{ value: 'all-referers', label: banana.i18n( 'referer-all-referers' ) },
	{ value: 'internal', label: banana.i18n( 'referer-internal' ) },
	{ value: 'external', label: banana.i18n( 'referer-external' ) },
	{ value: 'search-engine', label: banana.i18n( 'referer-search-engine' ) },
	{ value: 'unknown', label: banana.i18n( 'unknown' ) },
	{ value: 'none', label: banana.i18n( 'none' ) }
];

// The mediarequests data has no 'automated' agent breakdown.
const agentOptions = [
	{ value: 'all-agents', label: banana.i18n( 'all' ) },
	{ value: 'user', label: banana.i18n( 'user' ) },
	{ value: 'spider', label: banana.i18n( 'spider' ) }
];
</script>
