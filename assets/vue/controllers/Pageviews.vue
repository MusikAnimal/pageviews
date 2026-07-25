<template>
	<LoadingOverlay v-if="store.status === 'loading'" />
	<div v-show="!initialLoading" class="app-workspace">
		<PageviewsSettings />
		<figure class="app-chart">
			<PageInput />
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
			<ChartPanel
				v-if="chartReady"
				:dates="store.dates"
				:series="chartSeries"
				:monthly="settings.dateType === 'monthly'"
				:filename="exportFilename"
				:no-autolog="!store.autolog"
				:aria-label="$i18n( 'pageviews' )"
			/>
			<CdxMessage
				v-if="incompleteMessage"
				type="warning"
				allow-user-dismiss
				@user-dismissed="dismissIncomplete"
			>
				{{ incompleteMessage }}
			</CdxMessage>
		</figure>
		<Totals />
	</div>
	<section v-show="!initialLoading" class="app-breakdown">
		<StatsTable v-if="chartReady" />
	</section>
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
import { computed, onMounted, watch } from 'vue';
import {
	CdxMessage,
	CdxToastContainer
} from '@wikimedia/codex';
import { usePageviewsStore } from '../stores/pageviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { useIncompleteDataMessage } from '../composables/useIncompleteDataMessage.js';
import { getDefaultPages } from '../lib/defaultPages.js';
import { useRoute, useRouter } from 'vue-router';
import PageviewsSettings from '../apps/pageviews/Settings.vue';
import FaqDialog from '../apps/pageviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/pageviews/UrlStructureDialog.vue';
import PageInput from '../components/PageInput.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/pageviews/Totals.vue';
import StatsTable from '../apps/pageviews/StatsTable.vue';

const store = usePageviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
useQuerySync( store );
const {
	message: incompleteMessage,
	dismiss: dismissIncomplete
} = useIncompleteDataMessage( store );

// The /faq and /url_structure routes open dialogs over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

// A bare visit to / or /pageviews shows Cat|Dog (localized via
// Wikidata) rather than an empty app, like the legacy tool. Dialog
// routes are excluded.
onMounted( applyDefaultPages );
async function applyDefaultPages() {
	if ( store.pages.length || activeDialog.value ) {
		return;
	}
	const defaults = await getDefaultPages( store.project );
	// The user may have picked pages while the lookups ran.
	if ( !store.pages.length && defaults.length ) {
		store.pages = defaults;
	}
}

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/', query: route.query } );
	}
}

function retry( message ) {
	ui.dismiss( message.id );
	message.onRetry();
}

const chartReady = computed(
	() => store.status === 'complete' && store.dates.length > 0
);

// The very first load shows nothing but the progress bar (like the
// Twig FOUC skeleton); later loads keep the workspace up, with the
// bar overlaying it.
const initialLoading = computed(
	() => store.status === 'loading' && !store.dates.length
);

const exportFilename = computed(
	() => `pageviews-${ settings.start }-${ settings.end }`
);

const chartSeries = computed( () => store.series.map( ( page ) => ( {
	label: page.title,
	counts: page.counts,
	total: page.total,
	average: page.average
} ) ) );

watch(
	() => [
		store.project,
		settings.start,
		settings.end,
		store.platform,
		store.agent,
		settings.dateType,
		store.pages,
		store.redirects
	],
	() => store.load(),
	{ immediate: true, deep: true }
);
</script>
