<template>
	<!-- Same markup as the Twig FOUC skeleton: centered in the
		.app-container both ways. -->
	<div v-if="store.status === 'loading'" class="app-progress-bar">
		<div>{{ $i18n( 'loading' ) }}</div>
		<CdxProgressBar :aria-label="$i18n( 'loading' )" />
	</div>
	<div class="app-workspace">
		<MediaviewsSettings />
		<figure class="app-chart">
			<FileInput />
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
				:aria-label="$i18n( 'mediaviews-title' )"
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
import { computed, watch } from 'vue';
import {
	CdxMessage,
	CdxProgressBar,
	CdxToastContainer
} from '@wikimedia/codex';
import { useMediaviewsStore } from '../stores/mediaviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { useIncompleteDataToast } from '../composables/useIncompleteDataToast.js';
import MediaviewsSettings from '../apps/mediaviews/Settings.vue';
import FileInput from '../components/FileInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/mediaviews/Totals.vue';
import StatsTable from '../apps/mediaviews/StatsTable.vue';

const store = useMediaviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
useQuerySync( store );
useIncompleteDataToast( store );

function retry( message ) {
	ui.dismiss( message.id );
	message.onRetry();
}

const chartReady = computed(
	() => store.status === 'complete' && store.dates.length > 0
);

const exportFilename = computed(
	() => `mediaviews-${ settings.start }-${ settings.end }`
);

const chartSeries = computed( () => store.series.map( ( entry ) => ( {
	label: entry.name,
	counts: entry.counts,
	total: entry.total,
	average: entry.average
} ) ) );

watch(
	() => [
		store.files,
		store.project,
		store.referer,
		store.agent,
		settings.start,
		settings.end,
		settings.dateType
	],
	() => store.load(),
	{ immediate: true, deep: true }
);
</script>
