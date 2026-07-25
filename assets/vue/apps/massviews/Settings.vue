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
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
		<CdxCheckbox v-model="useSubjectPage">
			{{ $i18n( 'category-subject-toggle' ) }}
		</CdxCheckbox>
		<CdxCheckbox v-model="includeSubcategories">
			{{ $i18n( 'include-subcategories' ) }}
		</CdxCheckbox>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxCheckbox, CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useMassviewsStore } from '../../stores/massviews.js';
import { useUiStore } from '../../stores/ui.js';
import { banana } from '../../i18n.js';

const ui = useUiStore();
const store = useMassviewsStore();
const { source, platform, agent, subjectpage, subcategories } = storeToRefs( store );

// The remaining legacy sources land here as they are ported.
const sourceItems = [
	{ value: 'category', label: banana.i18n( 'category' ) }
];

const useSubjectPage = computed( {
	get: () => subjectpage.value === '1',
	set: ( value ) => {
		subjectpage.value = value ? '1' : '0';
	}
} );

const includeSubcategories = computed( {
	get: () => subcategories.value === '1',
	set: ( value ) => {
		subcategories.value = value ? '1' : '0';
	}
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-checkbox {
	margin-top: @spacing-100;
}
</style>
