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
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
		<!-- Resets to Main on a project change (legacy behavior). -->
		<NamespaceInput
			v-model="namespace"
			:project="project"
			reset-to="0"
		/>
		<CdxField class="app-settings__redirects">
			<template #label>
				{{ $i18n( 'redirects' ) }}
			</template>
			<CdxSelect
				v-model:selected="redirects"
				:menu-items="redirectItems"
			/>
		</CdxField>
	</form>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import NamespaceInput from '../../components/NamespaceInput.vue';
import { useUserviewsStore } from '../../stores/userviews.js';
import { banana } from '../../i18n.js';

const store = useUserviewsStore();
const { project, platform, agent, namespace, redirects } = storeToRefs( store );

const redirectItems = [
	{ value: '0', label: banana.i18n( 'exclude-redirects' ) },
	{ value: '1', label: banana.i18n( 'only-redirects' ) },
	{ value: '2', label: banana.i18n( 'redirects-and-non-redirects' ) }
];

</script>
