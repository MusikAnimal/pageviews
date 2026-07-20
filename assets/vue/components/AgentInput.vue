<template>
	<cdx-field class="app-settings__agent">
		<template #label>
			{{ $i18n( 'agent' ) }}
		</template>
		<cdx-select
			v-model:selected='agent'
			:menu-items="agentOptions"
			:aria-label="$i18n( 'agent' )"
		/>
	</cdx-field>
</template>

<script setup>
import { CdxField, CdxSelect } from "@wikimedia/codex";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings.js";
import { banana } from "../i18n.js";

const store = useSettingsStore();
const { agent } = storeToRefs( store );

const agentOptions = [
	{ value: 'all', label: banana.i18n( 'all' ) },
	{ value: 'user', label: banana.i18n( 'user' ) },
	{ value: 'spider', label: banana.i18n( 'spider' ) },
	{ value: 'automated', label: banana.i18n( 'automated' ) },
];
</script>
