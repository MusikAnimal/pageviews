<template>
	<CdxField class="app-settings__agent" :disabled="disabled">
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
			:menu-items="options"
			:disabled="disabled"
			:aria-label="$i18n( 'agent' )"
		/>
	</CdxField>
</template>

<script setup>
import { CdxField, CdxSelect } from '@wikimedia/codex';
import { banana } from '../i18n.js';
import FaqHelpButton from './FaqHelpButton.vue';

/**
 * Prop-driven: apps bind their own store's agent ref.
 */
const agent = defineModel( {
	type: String,
	required: true
} );

defineProps( {
	// Some metrics have no agent breakdown (e.g. Siteviews' unique
	// devices); the field disables rather than hides, like legacy.
	disabled: {
		type: Boolean,
		default: false
	},
	// Apps may override (e.g. mediarequests has no 'automated').
	options: {
		type: Array,
		default: () => [
			{ value: 'all-agents', label: banana.i18n( 'all' ) },
			{ value: 'user', label: banana.i18n( 'user' ) },
			{ value: 'spider', label: banana.i18n( 'spider' ) },
			{ value: 'automated', label: banana.i18n( 'automated' ) }
		]
	}
} );
</script>

<style scoped lang="less">
// Flush right, inline with the field's label.
.app-settings__agent {
	position: relative;
}

.app-settings__agent-help {
	position: absolute;
	inset-inline-end: 0;
	top: -5px;
}
</style>
