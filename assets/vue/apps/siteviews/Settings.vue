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
			<CdxSelect
				v-model:selected="source"
				:menu-items="sourceOptions"
				:aria-label="$i18n( 'metric' )"
			/>
		</CdxField>
		<PlatformInput v-model="platform" :options="platformOptions" />
		<AgentInput v-model="agent" :disabled="!store.isPageviews" />
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
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxField, CdxRadio, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import { DEFAULT_SITES, useSiteviewsStore } from '../../stores/siteviews.js';
import { banana } from '../../i18n.js';

const store = useSiteviewsStore();
const { source, platform, agent, sites } = storeToRefs( store );

const sourceOptions = [
	{ value: 'pageviews', label: banana.i18n( 'pageviews' ) },
	{ value: 'unique-devices', label: banana.i18n( 'unique-devices' ) },
	{ value: 'pagecounts', label: banana.i18n( 'pagecounts-legacy' ) }
];

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
