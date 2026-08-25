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
		<ProjectInput v-model="project" :label="$i18n( 'source-project' )" />
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
	</form>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import { useLangviewsStore } from '../../stores/langviews.js';

const { project, platform, agent } = storeToRefs( useLangviewsStore() );
</script>
