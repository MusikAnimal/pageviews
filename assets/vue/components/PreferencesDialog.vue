<template>
	<CdxDialog
		:open="open"
		:title="banana.i18n( 'settings' )"
		:use-close-button="true"
		:primary-action="{ label: banana.i18n( 'save' ), actionType: 'progressive' }"
		:default-action="{ label: banana.i18n( 'cancel' ) }"
		class="app-preferences"
		@update:open="( value ) => emit( 'update:open', value )"
		@primary="save"
		@default="emit( 'update:open', false )"
	>
		<p class="app-preferences__notice">
			{{ $i18n( 'settings-notice' ) }}
		</p>

		<template v-if="!hidePageOptions">
			<CdxField>
				<CdxCheckbox v-model="staged.alwaysRedirects">
					{{ $i18n( 'always-include-redirects' ) }}
				</CdxCheckbox>
			</CdxField>

			<CdxField :is-fieldset="true">
				<template #label>
					{{ $i18n( 'search-method' ) }}
				</template>
				<CdxRadio
					v-for="mode in autocompleteModes"
					:key="mode.value"
					v-model="staged.autocomplete"
					name="autocomplete-mode"
					:input-value="mode.value"
				>
					{{ mode.label }}
				</CdxRadio>
			</CdxField>
		</template>

		<CdxField :is-fieldset="true">
			<template #label>
				{{ $i18n( 'localization' ) }}
			</template>
			<CdxCheckbox v-model="staged.numericalFormatting">
				{{ $i18n( 'format-numbers' ) }}
			</CdxCheckbox>
			<CdxCheckbox v-model="staged.localizeDateFormat">
				{{ $i18n( 'localize-dates' ) }}
			</CdxCheckbox>
		</CdxField>

		<CdxField :is-fieldset="true">
			<template #label>
				{{ $i18n( 'chart-preferences' ) }}
			</template>
			<CdxCheckbox v-model="staged.autoLogDetection">
				{{ $i18n( 'autolog-option' ) }}
			</CdxCheckbox>
			<CdxCheckbox v-model="staged.beginAtZero">
				{{ $i18n( 'begin-at-zero-option' ) }}
			</CdxCheckbox>
			<CdxCheckbox v-model="staged.rememberChart">
				{{ $i18n( 'remember-chart-option' ) }}
			</CdxCheckbox>
			<CdxCheckbox v-model="staged.bezierCurve">
				{{ $i18n( 'bezier-curve-option' ) }}
			</CdxCheckbox>
		</CdxField>
	</CdxDialog>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { CdxCheckbox, CdxDialog, CdxField, CdxRadio } from '@wikimedia/codex';
import { usePreferencesStore } from '../stores/preferences.js';
import { banana } from '../i18n.js';

const props = defineProps( {
	open: {
		type: Boolean,
		default: false
	},
	/**
	 * Set by apps without a page search (e.g. Siteviews) to hide the
	 * redirects and search-method preferences.
	 */
	hidePageOptions: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const preferences = usePreferencesStore();

// Legacy 'no_autocomplete' is not offered: the Codex lookup only adds
// pages picked from the menu, so suggestions must stay on.
const autocompleteModes = [
	{ value: 'autocomplete', label: banana.i18n( 'autocompletion' ) },
	{ value: 'autocomplete_redirects', label: banana.i18n( 'autocompletion-redirects' ) }
];

// Edits are staged and only committed on Save, per the legacy modal.
const staged = reactive( {} );

watch( () => props.open, ( open ) => {
	if ( open ) {
		Object.assign( staged, preferences.$state );
	}
}, { immediate: true } );

function save() {
	preferences.$patch( { ...staged } );
	emit( 'update:open', false );
}
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-preferences__notice {
	color: @color-subtle;
	font-size: @font-size-small;
	margin-top: 0;
}
</style>
