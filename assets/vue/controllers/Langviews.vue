<template>
	<!-- Same markup as the Twig FOUC skeleton: centered in the
		.app-container both ways. -->
	<div v-if="store.status === 'loading'" class="app-progress-bar">
		<div>{{ $i18n( 'loading' ) }}</div>
		<CdxProgressBar :aria-label="$i18n( 'loading' )" />
		<div v-if="ui.progress" class="app-progress-bar__counts">
			{{ $i18n( 'processing', `${ ui.progress.done } / ${ ui.progress.total }` ) }}
		</div>
	</div>
	<div class="app-workspace">
		<LangviewsSettings />
		<figure class="app-chart">
			<SinglePageInput v-model="page" :project="store.project" />
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
			<template v-if="ready">
				<div class="app-chart__toolbar">
					<CdxToggleButtonGroup
						v-model="viewModel"
						:buttons="viewButtons"
					/>
				</div>
				<ChartPanel
					v-if="store.view === 'chart'"
					:dates="store.dates"
					:series="chartSeries"
					:monthly="settings.dateType === 'monthly'"
					:filename="exportFilename"
					:no-autolog="!store.autolog"
					:aria-label="$i18n( 'langviews-title' )"
				/>
				<ResultsTable v-else />
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
import { computed, watch } from 'vue';
import {
	CdxMessage,
	CdxProgressBar,
	CdxToastContainer,
	CdxToggleButtonGroup
} from '@wikimedia/codex';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useLangviewsStore } from '../stores/langviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { banana } from '../i18n.js';
import LangviewsSettings from '../apps/langviews/Settings.vue';
import FaqDialog from '../apps/langviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/langviews/UrlStructureDialog.vue';
import SinglePageInput from '../components/SinglePageInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import ResultsTable from '../apps/langviews/ResultsTable.vue';

const store = useLangviewsStore();
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

const viewButtons = [
	{ value: 'list', label: banana.i18n( 'list' ) },
	{ value: 'chart', label: banana.i18n( 'chart' ) }
];
const viewModel = computed( {
	get: () => store.view,
	set: ( value ) => {
		if ( value ) {
			store.view = value;
		}
	}
} );

const exportFilename = computed(
	() => `langviews-${ settings.start }-${ settings.end }`
);

// The chart shows the combined views across all languages.
const chartSeries = computed( () => store.totals ? [ {
	label: store.page.replace( /_/g, ' ' ),
	counts: store.totals.counts,
	total: store.totals.total,
	average: store.totals.average
} ] : [] );

watch(
	() => [
		store.page,
		store.project,
		store.platform,
		store.agent,
		settings.start,
		settings.end,
		settings.dateType
	],
	() => store.load(),
	{ immediate: true, deep: true }
);
</script>
