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
		<!-- The commons-category source only has monthly data. -->
		<DateRangeInput
			:monthly-only="true"
			:min="COMMONS_METRICS_MIN_MONTH"
		/>
		<CdxField class="app-settings__source">
			<template #label>
				{{ $i18n( 'source' ) }}
			</template>
			<CdxSelect
				v-model:selected="source"
				:menu-items="sourceItems"
			/>
		</CdxField>
		<CdxCheckbox v-model="allWikis">
			{{ $i18n( 'all-projects' ) }}
		</CdxCheckbox>
		<ProjectInput v-if="!allWikis" v-model="projectDomain" />
		<CdxCheckbox v-model="subcategories">
			{{ $i18n( 'include-subcategories' ) }}
		</CdxCheckbox>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxCheckbox, CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { COMMONS_METRICS_MIN_MONTH, useMassviewsStore } from '../../stores/massviews.js';
import { useUiStore } from '../../stores/ui.js';
import { banana } from '../../i18n.js';

const ui = useUiStore();
const store = useMassviewsStore();
const { source, scope } = storeToRefs( store );

const sourceItems = [
	{ value: 'commons-category', label: banana.i18n( 'commons-category' ) }
];

const subcategories = computed( {
	get: () => scope.value === 'deep',
	set: ( value ) => {
		scope.value = value ? 'deep' : 'shallow';
	}
} );

// 'all-wikis' lives in the same project param; the checkbox swaps
// between it and a concrete (default) domain.
const allWikis = computed( {
	get: () => store.project === 'all-wikis',
	set: ( value ) => {
		store.project = value ? 'all-wikis' : 'en.wikipedia.org';
	}
} );

const projectDomain = computed( {
	get: () => store.project === 'all-wikis' ? '' : store.project,
	set: ( value ) => {
		if ( value ) {
			store.project = value;
		}
	}
} );

// The month pickers need the store's dateType in monthly form before
// the user interacts with them.
onMounted( store.ensureMonthlyDefaults );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-checkbox {
	margin-top: @spacing-100;
}
</style>
