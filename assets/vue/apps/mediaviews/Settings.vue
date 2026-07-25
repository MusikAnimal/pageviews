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
		<CdxField class="app-settings__source">
			<template #label>
				{{ $i18n( 'source' ) }}
			</template>
			<CdxSelect
				v-model:selected="source"
				:menu-items="sourceItems"
				:aria-label="$i18n( 'source' )"
			/>
		</CdxField>
		<!-- The categories source (Commons Impact Metrics) only has
			monthly data, no referer/agent breakdowns, and counts the
			pageviews of a chosen wiki (or all of them). -->
		<template v-if="categoriesSource">
			<DateRangeInput
				:monthly-only="true"
				:min="COMMONS_METRICS_MIN_MONTH"
			/>
			<CdxCheckbox v-model="allWikis">
				{{ $i18n( 'all-projects' ) }}
			</CdxCheckbox>
			<ProjectInput v-if="!allWikis" v-model="wikiDomain" />
			<CdxCheckbox v-model="subcategories">
				{{ $i18n( 'include-subcategories' ) }}
			</CdxCheckbox>
		</template>
		<template v-else>
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
		</template>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxCheckbox, CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { COMMONS_METRICS_MIN_MONTH, useMediaviewsStore } from '../../stores/mediaviews.js';
import { useUiStore } from '../../stores/ui.js';
import { banana } from '../../i18n.js';

const store = useMediaviewsStore();
const ui = useUiStore();
const { source, project, referer, agent, scope } = storeToRefs( store );

const categoriesSource = computed( () => source.value === 'categories' );

const sourceItems = [
	{ value: 'files', label: banana.i18n( 'files' ) },
	{ value: 'categories', label: banana.i18n( 'categories' ) }
];

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

const subcategories = computed( {
	get: () => scope.value === 'deep',
	set: ( value ) => {
		scope.value = value ? 'deep' : 'shallow';
	}
} );

// 'all-wikis' lives in the same wiki param; the checkbox swaps
// between it and a concrete (default) domain.
const allWikis = computed( {
	get: () => store.wiki === 'all-wikis',
	set: ( value ) => {
		store.wiki = value ? 'all-wikis' : 'en.wikipedia.org';
	}
} );

const wikiDomain = computed( {
	get: () => store.wiki === 'all-wikis' ? '' : store.wiki,
	set: ( value ) => {
		if ( value ) {
			store.wiki = value;
		}
	}
} );

// The month pickers need the store's dateType in monthly form before
// the user interacts with them. Immediate: the source may already be
// 'categories' from the URL.
watch( categoriesSource, ( isCategories ) => {
	if ( isCategories ) {
		store.ensureMonthlyDefaults();
	}
}, { immediate: true } );
</script>
