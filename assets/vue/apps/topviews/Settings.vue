<template>
	<!-- Codex buttons default to type=submit; nothing here should
		trigger a native form submission. -->
	<form
		class="app-settings"
		:aria-label="$i18n( 'options' )"
		@submit.prevent
	>
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<CdxField class="app-setting__dates-type">
			<template #label>
				{{ $i18n( 'date-type' ) }}
			</template>
			<CdxSelect
				v-model:selected="dateTypeModel"
				:menu-items="dateTypeOptions"
				:aria-label="$i18n( 'date-type' )"
			/>
		</CdxField>
		<CdxField>
			<template #label>
				{{ $i18n( 'date' ) }}
			</template>
			<CdxSelect
				v-if="store.dateType === 'yearly'"
				v-model:selected="date"
				:menu-items="yearOptions"
				:aria-label="$i18n( 'date' )"
			/>
			<CdxTextInput
				v-else
				:key="store.dateType"
				v-model="date"
				:input-type="store.dateType === 'monthly' ? 'month' : 'date'"
				:min="store.dateType === 'monthly' ?
					PAGEVIEWS_MIN_DATE.slice( 0, 7 ) : PAGEVIEWS_MIN_DATE"
				:max="maxDate"
				:aria-label="$i18n( 'date' )"
			/>
		</CdxField>
		<ProjectInput v-model="project" />
		<PlatformInput
			v-model="platform"
			:disabled="store.dateType === 'yearly'"
		/>
		<CdxField class="app-settings__excludes">
			<template #label>
				{{ $i18n( 'excluded-pages' ) }}
			</template>
			<template #description>
				{{ $i18n( 'hover-to-exclude' ) }}
			</template>
			<CdxChipInput
				v-model:input-chips="excludeChips"
				:aria-label="$i18n( 'excluded-pages' )"
			/>
		</CdxField>
		<CdxCheckbox
			v-model="mainspace"
			:disabled="store.dateType === 'yearly'"
		>
			{{ $i18n( 'mainspace-only-option' ) }}
		</CdxCheckbox>
		<CdxCheckbox
			v-if="platform === 'all-access' || store.dateType === 'yearly'"
			v-model="showMobileModel"
			:disabled="store.dateType === 'yearly'"
		>
			{{ $i18n( 'show-mobile-percentages' ) }}
		</CdxCheckbox>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
	CdxCheckbox,
	CdxChipInput,
	CdxField,
	CdxSelect,
	CdxTextInput
} from '@wikimedia/codex';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useTopviewsStore } from '../../stores/topviews.js';
import { useUiStore } from '../../stores/ui.js';
import {
	formatYm,
	formatYmd,
	lastCompleteMonthUtc,
	PAGEVIEWS_MIN_DATE,
	yesterdayUtc
} from '../../lib/dates.js';
import { banana } from '../../i18n.js';

const ui = useUiStore();
const store = useTopviewsStore();
const { project, platform, date, excludes, mainspace } = storeToRefs( store );

const dateTypeOptions = [
	{ value: 'daily', label: banana.i18n( 'daily' ) },
	{ value: 'monthly', label: banana.i18n( 'monthly' ) },
	{ value: 'yearly', label: banana.i18n( 'yearly' ) }
];

// The date type is derived from the date's shape; switching types
// resets to that type's default date (legacy behavior).
const dateTypeModel = computed( {
	get: () => store.dateType,
	set: ( type ) => {
		if ( type === store.dateType ) {
			return;
		}
		if ( type === 'daily' ) {
			date.value = formatYmd( yesterdayUtc() );
		} else if ( type === 'monthly' ) {
			date.value = formatYm( lastCompleteMonthUtc() );
		} else {
			date.value = String( new Date().getUTCFullYear() - 1 );
		}
	}
} );

const maxDate = computed( () => store.dateType === 'monthly' ?
	formatYm( lastCompleteMonthUtc() ) :
	formatYmd( yesterdayUtc() ) );

// The yearly datasets exist from the first full year of data through
// the last complete year.
const yearOptions = computed( () => {
	const years = [];
	for ( let year = new Date().getUTCFullYear() - 1; year >= 2016; year-- ) {
		years.push( { value: String( year ), label: String( year ) } );
	}
	return years;
} );

// Yearly data is all-access only, with the baked-in mobile column.
watch( () => store.dateType, ( type ) => {
	if ( type === 'yearly' ) {
		platform.value = 'all-access';
		mainspace.value = true;
	}
} );

const excludeChips = computed( {
	get: () => excludes.value.map( ( title ) => ( { value: title } ) ),
	set: ( chips ) => {
		excludes.value = chips.map( ( chip ) => String( chip.value ) );
	}
} );

// Forced on for yearly without persisting the choice.
const showMobileModel = computed( {
	get: () => store.dateType === 'yearly' ? true : store.showMobile,
	set: ( value ) => {
		store.showMobile = value;
	}
} );
</script>
