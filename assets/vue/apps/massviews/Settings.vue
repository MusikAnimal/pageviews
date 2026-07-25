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
		<!-- Quarry results, link searches and text searches don't carry
			a project in the target, so it's chosen here. -->
		<ProjectInput
			v-if="[ 'quarry', 'external-link', 'search' ].includes( source )"
			v-model="project"
		/>
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useMassviewsStore } from '../../stores/massviews.js';
import { useUiStore } from '../../stores/ui.js';

const ui = useUiStore();
const store = useMassviewsStore();
const { source, project, platform, agent } = storeToRefs( store );
</script>
