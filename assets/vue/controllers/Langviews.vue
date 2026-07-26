<template>
	<LoadingOverlay v-if="store.status === 'loading'" @abort="store.abort()" />
	<div class="app-workspace">
		<!-- List apps fan out many queries, so nothing fires reactively:
			the form submits explicitly, and the results state replaces
			it until "Do another query". -->
		<template v-if="!ready">
			<LangviewsSettings />
			<figure class="app-chart">
				<div class="app-page-input-row">
					<SinglePageInput
						v-model="page"
						:project="store.project"
						@submit="store.load()"
					/>
					<CdxButton
						action="progressive"
						weight="primary"
						:disabled="!store.page || store.status === 'loading'"
						@click="store.load()"
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
						<a :href="pageUrl" target="_blank">{{ pageDisplay }}</a>
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
				:aria-label="$i18n( 'langviews-title' )"
			/>
			<template v-else>
				<div class="app-chart__toolbar">
					<ExportMenu
						:filename="exportFilename"
						:get-csv-rows="listCsvRows"
						:get-json="() => store.langData"
					/>
				</div>
				<ResultsTable />
			</template>
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
import { computed, onMounted } from 'vue';
import {
	CdxButton,
	CdxIcon,
	CdxMessage,
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
import { useLangviewsStore } from '../stores/langviews.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { formatDate } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';
import LangviewsSettings from '../apps/langviews/Settings.vue';
import FaqDialog from '../apps/langviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/langviews/UrlStructureDialog.vue';
import SinglePageInput from '../components/SinglePageInput.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ChartPanel from '../components/ChartPanel.vue';
import ExportMenu from '../components/ExportMenu.vue';
import ResultsTable from '../apps/langviews/ResultsTable.vue';
import { BADGES } from '../lib/wikidata.js';

const store = useLangviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
const { page } = storeToRefs( store );
useQuerySync( store );

// The /langviews/faq and /langviews/url_structure routes open dialogs
// over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/langviews', query: route.query } );
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

const pageDisplay = computed( () => store.page.replace( /_/g, ' ' ) );
const pageUrl = computed(
	() => `https://${ store.project }/wiki/` +
		encodeURIComponent( store.page.replace( / /g, '_' ) )
);

// The queried date range, shown next to the page title.
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
	() => `langviews-${ settings.start }-${ settings.end }`
);

// The list export is one row per language with the daily counts
// (legacy shape), unlike the chart export's combined series.
function listCsvRows() {
	return [
		[ 'Language', 'Title', 'Badges', ...store.dates ],
		...store.langData.map( ( row ) => [
			row.lang,
			row.title,
			row.badges.map(
				( badge ) => BADGES[ badge ] ? banana.i18n( BADGES[ badge ].name ) : badge
			).join( ', ' ),
			...row.counts
		] )
	];
}

// The chart shows the combined views across all languages.
const chartSeries = computed( () => store.totals ? [ {
	label: pageDisplay.value,
	counts: store.totals.counts,
	total: store.totals.total,
	average: store.totals.average
} ] : [] );

// Unlike the chart apps, params never fire reactively (the fan-out is
// expensive): only the initial URL-provided page loads automatically.
onMounted( () => {
	if ( store.page ) {
		store.load();
	}
} );
</script>
