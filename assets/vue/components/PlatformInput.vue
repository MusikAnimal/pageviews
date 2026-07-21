<template>
	<CdxField class="app-settings__platform">
		<template #label>
			{{ $i18n( 'platform' ) }}
		</template>
		<CdxSelect
			v-model:selected="platform"
			:menu-items="platformOptions"
			:aria-label="$i18n( 'platform' )"
		/>
	</CdxField>
</template>

<script setup>
import { CdxField, CdxSelect } from '@wikimedia/codex';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings.js';
import { banana } from '../i18n.js';

const store = useSettingsStore();

const { platform } = storeToRefs( store );

const platformOptions = [
	{ value: 'all-access', label: banana.i18n( 'all' ) },
	{ value: 'desktop', label: banana.i18n( 'desktop' ) },
	{ value: 'mobile-app', label: banana.i18n( 'mobile-app' ) },
	{ value: 'mobile-web', label: banana.i18n( 'mobile-web' ) }
];
</script>
