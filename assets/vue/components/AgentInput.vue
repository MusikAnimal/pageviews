<template>
	<CdxField class="app-settings__agent">
		<template #label>
			{{ $i18n( 'agent' ) }}
		</template>
		<CdxButton
			class="app-settings__agent-help"
			weight="quiet"
			:aria-label="$i18n( 'faq-agents-title' )"
			@click="openFaq"
		>
			<CdxIcon :icon="cdxIconHelpNotice" />
		</CdxButton>
		<CdxSelect
			v-model:selected="agent"
			:menu-items="agentOptions"
			:aria-label="$i18n( 'agent' )"
		/>
	</CdxField>
</template>

<script setup>
import { CdxButton, CdxField, CdxIcon, CdxSelect } from '@wikimedia/codex';
import { cdxIconHelpNotice } from '@wikimedia/codex-icons';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore } from '../stores/settings.js';
import { banana } from '../i18n.js';

const store = useSettingsStore();
const { agent } = storeToRefs( store );
const route = useRoute();
const router = useRouter();

const agentOptions = [
	{ value: 'all', label: banana.i18n( 'all' ) },
	{ value: 'user', label: banana.i18n( 'user' ) },
	{ value: 'spider', label: banana.i18n( 'spider' ) },
	{ value: 'automated', label: banana.i18n( 'automated' ) }
];

/**
 * Open the FAQ dialog scrolled to the Agents section.
 */
function openFaq() {
	router.push( { path: '/faq', hash: '#agents', query: route.query } );
}
</script>

<style scoped lang="less">
// Flush right, inline with the field's label.
.app-settings__agent {
	position: relative;
}

.app-settings__agent-help {
	position: absolute;
	right: 0;
	top: -34px;
}
</style>
