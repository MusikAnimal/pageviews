<template>
	<LoadingOverlay v-if="store.status === 'loading'" @abort="store.abort()" />
	<div class="app-workspace">
		<MediaviewsSettings />
		<figure class="app-chart">
			<FileInput v-if="store.source !== 'categories'" />
			<CategoryInput v-else />
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
	<section class="app-breakdown">
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
import { computed, watch } from 'vue';
import {
	CdxMessage,
	CdxToastContainer
} from '@wikimedia/codex';
import { useMediaviewsStore } from '../stores/mediaviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { useIncompleteDataMessage } from '../composables/useIncompleteDataMessage.js';
import { useRoute, useRouter } from 'vue-router';
import MediaviewsSettings from '../apps/mediaviews/Settings.vue';
import FaqDialog from '../apps/mediaviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/mediaviews/UrlStructureDialog.vue';
import FileInput from '../components/FileInput.vue';
import CategoryInput from '../apps/mediaviews/CategoryInput.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/mediaviews/Totals.vue';
import StatsTable from '../apps/mediaviews/StatsTable.vue';

const store = useMediaviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
useQuerySync( store );
const {
	message: incompleteMessage,
	dismiss: dismissIncomplete
} = useIncompleteDataMessage( store );

// The /mediaviews/faq and /mediaviews/url_structure routes open
// dialogs over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/mediaviews', query: route.query } );
	}
}

// A bare visit — or switching sources with nothing picked — shows a
// couple of well-known examples rather than an empty app (the
// default dates come from ensureDefaultDates).
watch( () => store.source, ( source ) => {
	if ( source === 'files' && !store.files.length ) {
		store.files = [ 'Example.jpg', 'Example.ogg' ];
	} else if ( source === 'categories' && !store.categories.length ) {
		store.categories = [
			'Content_produced_by_UNESCO',
			'Content_produced_by_Food_and_Agriculture_Organization_of_the_United_Nations'
		];
	}
}, { immediate: true } );

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
		store.source,
		store.files,
		store.project,
		store.referer,
		store.agent,
		store.categories,
		store.scope,
		store.wiki,
		settings.start,
		settings.end,
		settings.dateType
	],
	() => store.load(),
	{ immediate: true, deep: true }
);
</script>
