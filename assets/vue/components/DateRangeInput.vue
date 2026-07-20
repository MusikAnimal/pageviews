<template>
	<cdx-field
		class="app-settings__dates"
		:is-fieldset="true"
	>
		<template #label>
			{{ $i18n( 'dates' ) }}
		</template>

		<cdx-field class='app-settings__date-inputs'>
			<cdx-text-input
				v-model='startDate'
				aria-label='Start date'
				input-type='date'
			></cdx-text-input>
			<cdx-text-input
				v-model='endDate'
				aria-label='End date'
				input-type='date'
			></cdx-text-input>
		</cdx-field>
	</cdx-field>
	<cdx-field class="app-setting__date-type">
		<template #label>
			{{ $i18n( 'date-type' ) }}
		</template>
		<cdx-select
			v-model:selected='dateType'
			:menu-items="dateTypeOptions"
			aria-label='Date type'
		/>
	</cdx-field>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex';
import { useSettingsStore } from "../stores/settings.js";

const store = useSettingsStore();
const { startDate, endDate, dateType } = storeToRefs( store );

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) },
];
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';


</style>
