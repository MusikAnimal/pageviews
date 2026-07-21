<template>
	<CdxField class="app-settings__agent">
		<template #label>
			{{ $i18n( 'agent' ) }}
		</template>
		<FaqHelpButton
			class="app-settings__agent-help"
			section="agents"
			:aria-label="$i18n( 'faq-agents-title' )"
		/>
		<CdxSelect
			v-model:selected="agent"
			:menu-items="agentOptions"
			:aria-label="$i18n( 'agent' )"
		/>
	</CdxField>
</template>

<script setup>
import { CdxField, CdxSelect } from '@wikimedia/codex';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings.js';
import { banana } from '../i18n.js';
import FaqHelpButton from './FaqHelpButton.vue';

const store = useSettingsStore();
const { agent } = storeToRefs( store );

const agentOptions = [
	{ value: 'all', label: banana.i18n( 'all' ) },
	{ value: 'user', label: banana.i18n( 'user' ) },
	{ value: 'spider', label: banana.i18n( 'spider' ) },
	{ value: 'automated', label: banana.i18n( 'automated' ) }
];
</script>

<style scoped lang="less">
// Flush right, inline with the field's label.
.app-settings__agent {
	position: relative;
}

.app-settings__agent-help {
	position: absolute;
	right: 0;
	top: -5px;
}
</style>
