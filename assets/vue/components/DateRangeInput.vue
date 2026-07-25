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
				<!-- Keyed on the type: switching a native input between
					date and month sanitizes the value against the old
					type (blanking it), so remount instead. -->
				<CdxTextInput
					:key="inputType"
					v-model="start"
					:aria-label="$i18n( 'start-date' )"
					:input-type="inputType"
					:min="minDate"
					:max="maxDate"
				/>
			</CdxField>
			<CdxField class="app-settings__dates-inputs__end">
				<CdxTextInput
					:key="inputType"
					v-model="end"
					:aria-label="$i18n( 'end-date' )"
					:input-type="inputType"
					:min="minDate"
					:max="maxDate"
				/>
			</CdxField>
		</div>
	</CdxField>
	<CdxField v-if="!monthlyOnly" class="app-setting__dates-type">
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
import { computed } from 'vue';
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
import {
	formatYm,
	formatYmd,
	lastCompleteMonthUtc,
	PAGEVIEWS_MIN_DATE,
	yesterdayUtc
} from '../lib/dates.js';

const props = defineProps( {
	// Sources limited to monthly data (Massviews' Commons category)
	// hide the date-type selector; the owning Settings component
	// forces the settings store's dateType to monthly.
	monthlyOnly: {
		type: Boolean,
		default: false
	},
	// Earliest selectable date override, for datasets that begin later
	// than the pageviews data (e.g. Commons Impact Metrics: 2023-01).
	min: {
		type: String,
		default: ''
	}
} );

const store = useSettingsStore();
const { start, end, dateType, specialRange } = storeToRefs( store );

const monthly = computed( () => dateType.value === 'monthly' );
const inputType = computed( () => monthly.value ? 'month' : 'date' );
// Data exists from July 2015 up to yesterday (or, in monthly mode,
// the last complete month).
const minDate = computed(
	() => props.min ||
		( monthly.value ? PAGEVIEWS_MIN_DATE.slice( 0, 7 ) : PAGEVIEWS_MIN_DATE )
);
const maxDate = computed(
	() => monthly.value ? formatYm( lastCompleteMonthUtc() ) : formatYmd( yesterdayUtc() )
);

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) }
];

// Same range names as the legacy tool's ?range= URL param. Ranges
// shorter than a month make no sense in monthly mode.
const presetItems = computed( () => {
	if ( monthly.value ) {
		// With a dataset-specific minimum, "all time" would resolve to
		// dates before the dataset begins.
		return [ 'last-month', 'this-year', 'last-year', ...( props.min ? [] : [ 'all-time' ] ) ]
			.map( ( range ) => ( { value: range, label: banana.i18n( range ) } ) );
	}
	return [
		...[ 7, 30, 60, 90 ].map( ( days ) => ( {
			value: `latest-${ days }`,
			label: banana.i18n( 'latest-days', String( days ) )
		} ) ),
		...[ 'this-week', 'this-month', 'last-month', 'this-year', 'last-year', 'all-time' ]
			.map( ( range ) => ( { value: range, label: banana.i18n( range ) } ) )
	];
} );
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
	gap: @spacing-50;

	// Start and end always share the line, at equal widths filling it
	// (the native date inputs' intrinsic minimum would otherwise keep
	// them from shrinking evenly on narrow screens).
	.cdx-field {
		flex: 1;
		margin-top: 0;
		min-width: 0;
	}

	.cdx-text-input {
		min-width: 0;
	}
}
</style>
