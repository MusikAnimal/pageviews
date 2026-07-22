<template>
	<!-- Same markup as the Twig FOUC skeleton: centered in the
		.app-container both ways. -->
	<div v-if="store.status === 'loading'" class="app-progress-bar">
		<div>{{ $i18n( 'loading' ) }}</div>
		<CdxProgressBar :aria-label="$i18n( 'loading' )" />
	</div>
	<div class="app-workspace">
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
		</figure>
		<Totals />
	</div>
	<section class="app-breakdown">
		<StatsTable v-if="chartReady" />
	</section>
	<CdxToastContainer />
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import {
	CdxMessage,
	CdxProgressBar,
	CdxToastContainer,
	useToast
} from '@wikimedia/codex';
import { DEFAULT_SITES, useSiteviewsStore } from '../stores/siteviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { formatDate } from '../lib/format.js';
import { PAGECOUNTS_MAX_DATE, PAGECOUNTS_MIN_DATE, parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';
import SiteviewsSettings from '../apps/siteviews/Settings.vue';
import SiteInput from '../components/SiteInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/siteviews/Totals.vue';
import StatsTable from '../apps/siteviews/StatsTable.vue';

const store = useSiteviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
useQuerySync( store );

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
const toast = useToast();
watch( () => store.unsupportedSource, ( value ) => {
	if ( !value ) {
		return;
	}
	const bound = ( date ) => formatDate( parseDate( date ), { locale: banana.locale } );
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
</script>
