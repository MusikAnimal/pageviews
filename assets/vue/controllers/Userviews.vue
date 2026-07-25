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
			<UserviewsSettings />
			<figure class="app-chart">
				<SinglePageInput
					v-model="user"
					:project="store.project"
					:user-search="true"
					:label="$i18n( 'user' )"
					placeholder="Jimbo Wales"
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
					:disabled="!store.user || store.status === 'loading'"
					@click="store.load()"
				>
					{{ $i18n( 'submit' ) }}
				</CdxButton>
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
						<a :href="userUrl" target="_blank">{{ userDisplay }}</a>
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
				:aria-label="$i18n( 'userviews-title' )"
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
import { computed, onMounted, watch } from 'vue';
import {
	CdxButton,
	CdxIcon,
	CdxMessage,
	CdxProgressBar,
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
import { useUserviewsStore } from '../stores/userviews.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { useAppToast } from '../composables/useAppToast.js';
import { formatDate, formatNumber } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana } from '../i18n.js';
import UserviewsSettings from '../apps/userviews/Settings.vue';
import FaqDialog from '../apps/userviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/userviews/UrlStructureDialog.vue';
import SinglePageInput from '../components/SinglePageInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import ResultsTable from '../apps/userviews/ResultsTable.vue';

const store = useUserviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();
const ui = useUiStore();
const toast = useAppToast();
const route = useRoute();
const router = useRouter();
const { user } = storeToRefs( store );
useQuerySync( store );

// The /userviews/faq and /userviews/url_structure routes open dialogs
// over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/userviews', query: route.query } );
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

// A very active user means the replica query can take a while: give
// a heads-up while the progress bar runs (one-shot store signal).
watch( () => store.editCountWarning, ( warning ) => {
	if ( warning ) {
		toast.info( banana.i18n(
			'userviews-edit-count-warning',
			warning.user,
			formatNumber( warning.count, banana.locale, preferences.numericalFormatting )
		) );
		store.editCountWarning = null;
	}
} );

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

const userDisplay = computed( () => store.user.replace( /_/g, ' ' ) );
const userUrl = computed(
	() => `https://${ store.project }/wiki/User:` +
		encodeURIComponent( store.user.replace( / /g, '_' ) )
);

// The queried date range, shown next to the user name.
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
	() => `userviews-${ settings.start }-${ settings.end }`
);

// The chart shows the combined views across all created pages.
const chartSeries = computed( () => store.totals ? [ {
	label: userDisplay.value,
	counts: store.totals.counts,
	total: store.totals.total,
	average: store.totals.average
} ] : [] );

// Unlike the chart apps, params never fire reactively (the fan-out is
// expensive): only the initial URL-provided user loads automatically.
onMounted( () => {
	if ( store.user ) {
		store.load();
	}
} );
</script>
