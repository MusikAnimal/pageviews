<template>
	<LoadingOverlay v-if="store.status === 'loading'" @abort="store.abort()" />
	<div class="app-workspace">
		<!-- List apps fan out many queries, so nothing fires reactively:
			the form submits explicitly, and the results state replaces
			it until "Do another query". -->
		<template v-if="!ready">
			<MassviewsSettings />
			<figure class="app-chart">
				<div class="app-page-input-row">
					<CdxField class="app-pages">
						<template #label>
							{{ $i18n( 'category' ) }}
						</template>
						<CdxTextInput
							ref="targetInput"
							v-model="target"
							:clearable="true"
							:aria-label="$i18n( 'category' )"
							placeholder="https://en.wikipedia.org/wiki/Category:Hip-hop_groups_from_New_York_City"
							@keydown.enter="submit"
						/>
					</CdxField>
					<CdxButton
						action="progressive"
						weight="primary"
						:disabled="!store.target || store.status === 'loading'"
						@click="submit"
					>
						{{ $i18n( 'submit' ) }}
					</CdxButton>
				</div>
				<CdxMessage
					v-for="message in ui.messages"
					:key="message.id"
					:type="message.type"
					allow-user-dismiss
					@user-dismissed="ui.dismiss( message.id )"
				>
					{{ message.text }}
					<a
						v-if="message.onRetry"
						href="#"
						@click.prevent="retry( message )"
					>{{ $i18n( 'try-again' ) }}</a>
				</CdxMessage>
			</figure>
		</template>
		<figure v-else class="app-chart">
			<header class="app-output-header">
				<a
					class="app-output-header__another-query"
					href="#"
					@click.prevent="anotherQuery"
				>
					<CdxIcon :icon="cdxIconArrowPrevious" size="small" />
					{{ $i18n( 'another-query' ) }}
				</a>
				<div class="app-output-header__heading">
					<h2 class="app-output-header__title">
						<a :href="store.target" target="_blank">{{ categoryDisplay }}</a>
						<span class="app-output-header__dates">{{ dateRange }}</span>
					</h2>
					<CdxToggleButtonGroup
						v-model="viewModel"
						:buttons="viewButtons"
					/>
				</div>
			</header>
			<CdxMessage
				v-for="message in ui.messages"
				:key="message.id"
				:type="message.type"
				allow-user-dismiss
				@user-dismissed="ui.dismiss( message.id )"
			>
				{{ message.text }}
			</CdxMessage>
			<ChartPanel
				v-if="store.view === 'chart'"
				:dates="store.dates"
				:series="chartSeries"
				:monthly="settings.dateType === 'monthly'"
				:filename="exportFilename"
				:no-autolog="!store.autolog"
				:no-range-select="true"
				:aria-label="$i18n( 'massviews-title' )"
			/>
			<ResultsTable v-else />
		</figure>
	</div>
	<CdxToastContainer />
	<FaqDialog
		:open="activeDialog === 'faq'"
		@update:open="onDialogToggle"
	/>
	<UrlStructureDialog
		:open="activeDialog === 'url-structure'"
		@update:open="onDialogToggle"
	/>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
	CdxButton,
	CdxField,
	CdxIcon,
	CdxMessage,
	CdxTextInput,
	CdxToastContainer,
	CdxToggleButtonGroup
} from '@wikimedia/codex';
import {
	cdxIconArrowPrevious,
	cdxIconChart,
	cdxIconListBullet
} from '@wikimedia/codex-icons';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useMassviewsStore } from '../stores/massviews.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { formatDate } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';
import MassviewsSettings from '../apps/massviews/Settings.vue';
import FaqDialog from '../apps/massviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/massviews/UrlStructureDialog.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ChartPanel from '../components/ChartPanel.vue';
import ResultsTable from '../apps/massviews/ResultsTable.vue';

const store = useMassviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
const { target } = storeToRefs( store );
useQuerySync( store );

// The /massviews/faq and /massviews/url_structure routes open dialogs
// over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/massviews', query: route.query } );
	}
}

function retry( message ) {
	ui.dismiss( message.id );
	message.onRetry();
}

const ready = computed(
	() => store.status === 'complete' && store.dates.length > 0
);

/**
 * Back to the form, keeping all the parameters — nothing re-fires
 * until the next explicit submission.
 */
function anotherQuery() {
	store.status = 'initial';
}

function submit() {
	if ( store.target && store.status !== 'loading' ) {
		store.load();
	}
}

const viewButtons = [
	{ value: 'list', label: banana.i18n( 'list' ), icon: cdxIconListBullet },
	{ value: 'chart', label: banana.i18n( 'chart' ), icon: cdxIconChart }
];
const viewModel = computed( {
	get: () => store.view,
	set: ( value ) => {
		if ( value ) {
			store.view = value;
		}
	}
} );

const categoryDisplay = computed( () => store.category.replace( /_/g, ' ' ) );

// The queried date range, shown next to the category name.
const dateRange = computed( () => {
	const options = {
		locale: banana.locale,
		monthly: settings.dateType === 'monthly',
		localize: preferences.localizeDateFormat
	};
	return `${ formatDate( parseDate( settings.start ), options ) } – ${
		formatDate( parseDate( settings.end ), options ) }`;
} );

const exportFilename = computed(
	() => `massviews-${ settings.start }-${ settings.end }`
);

// The chart shows the combined views across all category members.
const chartSeries = computed( () => store.totals ? [ {
	label: categoryDisplay.value,
	counts: store.totals.counts,
	total: store.totals.total,
	average: store.totals.average
} ] : [] );

const targetInput = ref( null );

// Submission-based tools put the cursor on the main input on page
// load; only the initial URL-provided target loads automatically.
onMounted( () => {
	if ( store.target ) {
		store.load();
	} else {
		targetInput.value?.$el?.querySelector( 'input' )?.focus();
	}
} );
</script>
