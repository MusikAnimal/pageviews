<template>
	<!-- Same markup as the Twig FOUC skeleton: centered in the
		.app-container both ways. -->
	<div v-if="store.status === 'loading'" class="app-progress-bar">
		<div>{{ $i18n( 'loading' ) }}</div>
		<CdxProgressBar :aria-label="$i18n( 'loading' )" />
	</div>
	<div v-show="!initialLoading" class="app-workspace">
		<SiteviewsSettings />
		<figure class="app-chart">
			<SiteInput :disabled="store.isAllProjects" />
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
				:aria-label="$i18n( 'siteviews-title' )"
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
	CdxProgressBar,
	CdxToastContainer
} from '@wikimedia/codex';
import { DEFAULT_SITES, useSiteviewsStore } from '../stores/siteviews.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { useIncompleteDataMessage } from '../composables/useIncompleteDataMessage.js';
import { useAppToast } from '../composables/useAppToast.js';
import { formatDate } from '../lib/format.js';
import { PAGECOUNTS_MAX_DATE, PAGECOUNTS_MIN_DATE, parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';
import { useRoute, useRouter } from 'vue-router';
import SiteviewsSettings from '../apps/siteviews/Settings.vue';
import FaqDialog from '../apps/siteviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/siteviews/UrlStructureDialog.vue';
import SiteInput from '../components/SiteInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/siteviews/Totals.vue';
import StatsTable from '../apps/siteviews/StatsTable.vue';

const store = useSiteviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
useQuerySync( store );
const {
	message: incompleteMessage,
	dismiss: dismissIncomplete
} = useIncompleteDataMessage( store );

// The /siteviews/faq and /siteviews/url_structure routes open dialogs
// over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/siteviews', query: route.query } );
	}
}

// Like the legacy tool, a bare visit compares two sizable Wikipedias.
onMounted( () => {
	if ( !store.sites.length ) {
		store.sites = [ ...DEFAULT_SITES ];
	}
} );

function retry( message ) {
	ui.dismiss( message.id );
	message.onRetry();
}

// A requested source that doesn't apply (e.g. ?source=pagecounts with
// dates outside the legacy dataset) falls back to pageviews; tell the
// user why via a toast. Immediate: the URL is parsed during setup,
// before this watcher registers.
const toast = useAppToast();
watch( () => store.unsupportedSource, ( value ) => {
	if ( !value ) {
		return;
	}
	const bound = ( date ) => formatDate( parseDate( date ), {
		locale: banana.locale,
		localize: preferences.localizeDateFormat
	} );
	toast.warning( banana.i18n(
		'source-unavailable',
		banana.i18n( 'pagecounts-legacy' ),
		bound( PAGECOUNTS_MIN_DATE ),
		bound( PAGECOUNTS_MAX_DATE ),
		banana.i18n( 'pageviews' )
	) );
	store.unsupportedSource = null;
}, { immediate: true } );

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
	() => `siteviews-${ settings.start }-${ settings.end }`
);

const chartSeries = computed( () => store.series.map( ( site ) => ( {
	label: site.site === 'all-projects' ?
		'all-projects' :
		site.site,
	counts: site.counts,
	total: site.total,
	average: site.average
} ) ) );

watch(
	() => [
		store.sites,
		store.source,
		store.platform,
		store.agent,
		settings.start,
		settings.end,
		settings.dateType
	],
	() => store.load(),
	{ immediate: true, deep: true }
);

// The editor/page type only feed the edits figures: refetch those
// alone, not the whole report.
watch( () => [ store.editorType, store.pageType ], () => store.loadEdits() );
</script>
