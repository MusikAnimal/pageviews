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
		<!-- List apps fan out many queries, so nothing fires reactively:
			the form submits explicitly, and the results state replaces
			it until "Do another query". -->
		<template v-if="!ready">
			<LangviewsSettings />
			<figure class="app-chart">
				<SinglePageInput
					v-model="page"
					:project="store.project"
					@submit="store.load()"
				/>
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
				<CdxButton
					action="progressive"
					weight="primary"
					:disabled="!store.page || store.status === 'loading'"
					@click="store.load()"
				>
					{{ $i18n( 'submit' ) }}
				</CdxButton>
			</figure>
		</template>
		<figure v-else class="app-chart">
			<div class="app-chart__toolbar">
				<CdxToggleButtonGroup
					v-model="viewModel"
					:buttons="viewButtons"
				/>
				<a
					class="app-chart__another-query"
					href="#"
					@click.prevent="anotherQuery"
				>{{ $i18n( 'another-query' ) }}</a>
			</div>
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
import { computed, onMounted } from 'vue';
import {
	CdxButton,
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

/**
 * Back to the form, keeping all the parameters — nothing re-fires
 * until the next explicit submission.
 */
function anotherQuery() {
	store.status = 'initial';
}

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

// Unlike the chart apps, params never fire reactively (the fan-out is
// expensive): only the initial URL-provided page loads automatically.
onMounted( () => {
	if ( store.page ) {
		store.load();
	}
} );
</script>

<style lang="less">
.app-chart__another-query {
	margin-left: auto;
}
</style>
