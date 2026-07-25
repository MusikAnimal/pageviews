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
			<!-- Empty until the page-list sources are ported. -->
			<CdxSelect
				v-model:selected="source"
				:menu-items="sourceItems"
			/>
		</CdxField>
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
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useMassviewsStore } from '../../stores/massviews.js';
import { useUiStore } from '../../stores/ui.js';

const ui = useUiStore();
const { source } = storeToRefs( useMassviewsStore() );

// The legacy page-list sources land here as they are ported.
const sourceItems = [];
</script>
