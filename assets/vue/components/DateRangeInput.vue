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
					v-model="startModel"
					:aria-label="$i18n( 'start-date' )"
					:input-type="inputType"
					:min="minDate"
					:max="maxDate"
					:placeholder="nativeInput ? undefined : minDate"
					@change="commit( 'start', $event )"
					@blur="commit( 'start', $event )"
				/>
			</CdxField>
			<CdxField class="app-settings__dates-inputs__end">
				<CdxTextInput
					:key="inputType"
					v-model="endModel"
					:aria-label="$i18n( 'end-date' )"
					:input-type="inputType"
					:min="minDate"
					:max="maxDate"
					:placeholder="nativeInput ? undefined : maxDate"
					@change="commit( 'end', $event )"
					@blur="commit( 'end', $event )"
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
import { computed, ref, watch } from 'vue';
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
	isYm,
	isYmd,
	lastCompleteMonthUtc,
	PAGEVIEWS_MIN_DATE,
	parseDate,
	yesterdayUtc
} from '../lib/dates.js';
import { supportsInputType } from '../lib/browser.js';

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
const nativeType = computed( () => monthly.value ? 'month' : 'date' );
// Data exists from July 2015 up to yesterday (or, in monthly mode,
// the last complete month).
const minDate = computed(
	() => props.min ||
		( monthly.value ? PAGEVIEWS_MIN_DATE.slice( 0, 7 ) : PAGEVIEWS_MIN_DATE )
);
const maxDate = computed(
	() => monthly.value ? formatYm( lastCompleteMonthUtc() ) : formatYmd( yesterdayUtc() )
);

// Without a native widget for the type (desktop Firefox has none for
// type=month) the input is a plain text field, so writing through on
// every keystroke would stream invalid dates into the store — and
// the reactive apps' queries. Buffer edits locally instead, and only
// commit on change/blur; native inputs can only emit valid values
// and keep writing straight through.
const nativeInput = computed( () => supportsInputType( nativeType.value ) );
// Degrade all the way to text rather than keep the unsupported type:
// partial implementations sanitize values mid-edit, plain text does
// not, and the placeholder can then show the expected format.
const inputType = computed( () => nativeInput.value ? nativeType.value : 'text' );

const drafts = { start: ref( null ), end: ref( null ) };
// Ref access for commit(): the template would unwrap these to plain
// strings if passed as arguments.
const sources = { start, end };
// The inputs remount on a type switch; stale buffers go with them.
watch( inputType, () => {
	drafts.start.value = null;
	drafts.end.value = null;
} );

const lazyModel = ( key, source ) => computed( {
	get: () => drafts[ key ].value ?? source.value,
	set: ( value ) => {
		if ( nativeInput.value ) {
			source.value = value;
		} else {
			drafts[ key ].value = value;
		}
	}
} );
const startModel = lazyModel( 'start', start );
const endModel = lazyModel( 'end', end );

/**
 * Validate a buffered edit and commit it, clamped to the allowed
 * range. An invalid value is dropped: clearing the buffer snaps the
 * input back to the last valid store value (or, should the store be
 * empty, the latest allowed date).
 *
 * @param {'start'|'end'} key
 * @param {Event} event The change/blur event, for the input element.
 */
function commit( key, event ) {
	const draft = drafts[ key ];
	const source = sources[ key ];
	if ( draft.value === null ) {
		return;
	}
	const value = draft.value.trim();
	draft.value = null;
	const wellFormed = monthly.value ? isYm( value ) : isYmd( value );
	if ( wellFormed && parseDate( value ) ) {
		source.value = value < minDate.value ? minDate.value :
			( value > maxDate.value ? maxDate.value : value );
	} else if ( !source.value ) {
		source.value = maxDate.value;
	}
	// Align the visible text with what was committed (the rejected or
	// clamped text otherwise lingers: the model reverting to its
	// previous value does not reliably reach the DOM).
	if ( event?.target && event.target.value !== source.value ) {
		event.target.value = source.value;
	}
}

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) }
];

// Same range names as the legacy tool's ?range= URL param. Ranges
// shorter than a month make no sense in monthly mode.
const presetItems = computed( () => {
	if ( monthly.value ) {
		return [
			{ value: 'last-month', label: banana.i18n( 'last-month' ) },
			...[ 3, 6 ].map( ( months ) => ( {
				value: `last-${ months }-months`,
				label: banana.i18n( 'last-num-months', String( months ) )
			} ) ),
			// With a dataset-specific minimum, "all time" would resolve
			// to dates before the dataset begins.
			...[ 'this-year', 'last-year', ...( props.min ? [] : [ 'all-time' ] ) ]
				.map( ( range ) => ( { value: range, label: banana.i18n( range ) } ) )
		];
	}
	return [
		...[ 7, 30, 60, 90, 365 ].map( ( days ) => ( {
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
	inset-inline-end: 0;
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
