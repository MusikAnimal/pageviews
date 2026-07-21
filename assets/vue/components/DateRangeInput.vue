<template>
	<CdxField
		class="app-settings__dates"
		:is-fieldset="true"
	>
		<template #label>
			{{ $i18n( 'dates' ) }}
		</template>

		<div class="app-settings__dates-inputs">
			<CdxField class="app-settings__dates-inputs__start">
				<CdxTextInput
					v-model="start"
					:aria-label="$i18n( 'start-date' )"
					input-type="date"
				/>
			</CdxField>
			<CdxField class="app-settings__dates-inputs__end">
				<CdxTextInput
					v-model="end"
					:aria-label="$i18n( 'end-date' )"
					input-type="date"
				/>
			</CdxField>
		</div>
	</CdxField>
	<CdxField class="app-setting__dates-type">
		<template #label>
			{{ $i18n( 'date-type' ) }}
		</template>
		<CdxSelect
			v-model:selected="dateType"
			:menu-items="dateTypeOptions"
			:aria-label="$i18n( 'date-type' )"
		/>
	</CdxField>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex';
import { banana } from '../i18n.js';
import { useSettingsStore } from '../stores/settings.js';

const store = useSettingsStore();
const { start, end, dateType } = storeToRefs( store );

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) }
];
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-settings__dates-inputs {
	display: flex;
	flex-direction: column;
	gap: @spacing-50;

	@media screen and ( min-width: @min-width-breakpoint-mobile ) {
		flex-direction: row;
	}

	.cdx-field {
		margin-top: 0;
	}

	.cdx-text-input {
		min-width: 150px;
	}
}
</style>
