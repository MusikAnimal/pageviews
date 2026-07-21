<template>
	<CdxField
		class="app-settings__dates"
		:is-fieldset="true"
	>
		<template #label>
			{{ $i18n( 'dates' ) }}
		</template>

		<CdxMenuButton
			:selected="specialRange"
			class="app-settings__dates-presets"
			weight="quiet"
			:menu-items="presetItems"
			:aria-label="$i18n( 'presets' )"
			@update:selected="( value ) => value && store.setSpecialRange( value )"
		>
			<CdxIcon :icon="cdxIconDownTriangle" />
			{{ $i18n( 'presets' ) }}
		</CdxMenuButton>

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
import {
	CdxField,
	CdxIcon,
	CdxMenuButton,
	CdxSelect,
	CdxTextInput
} from '@wikimedia/codex';
import { cdxIconDownTriangle } from '@wikimedia/codex-icons';
import { banana } from '../i18n.js';
import { useSettingsStore } from '../stores/settings.js';

const store = useSettingsStore();
const { start, end, dateType, specialRange } = storeToRefs( store );

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) }
];

// Same range names as the legacy tool's ?range= URL param.
const presetItems = [
	...[ 7, 30, 60, 90 ].map( ( days ) => ( {
		value: `latest-${ days }`,
		label: banana.i18n( 'latest-days', String( days ) )
	} ) ),
	...[ 'this-week', 'this-month', 'last-month', 'this-year', 'last-year', 'all-time' ]
		.map( ( range ) => ( { value: range, label: banana.i18n( range ) } ) )
];
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

// Inline with the "Dates" legend, floated to the right of the field.
.app-settings__dates {
	position: relative;
}

.app-settings__dates-presets {
	position: absolute;
	right: 0;
	// Vertically aligns the quiet button with the field's legend.
	top: -30px;
}

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
