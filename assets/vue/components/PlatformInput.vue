<template>
	<CdxField class="app-settings__platform">
		<template #label>
			{{ $i18n( 'platform' ) }}
		</template>
		<CdxSelect
			v-model:selected="platform"
			:menu-items="options"
			:aria-label="$i18n( 'platform' )"
		/>
	</CdxField>
</template>

<script setup>
import { CdxField, CdxSelect } from '@wikimedia/codex';
import { banana } from '../i18n.js';

/**
 * Prop-driven: apps bind their own store's platform ref, and may
 * override the options (e.g. Siteviews' unique-devices vocabulary).
 */
const platform = defineModel( {
	type: String,
	required: true
} );

defineProps( {
	options: {
		type: Array,
		default: () => [
			{ value: 'all-access', label: banana.i18n( 'all' ) },
			{ value: 'desktop', label: banana.i18n( 'desktop' ) },
			{ value: 'mobile-app', label: banana.i18n( 'mobile-app' ) },
			{ value: 'mobile-web', label: banana.i18n( 'mobile-web' ) }
		]
	}
} );
</script>
