<template>
	<LoadingOverlay
		v-if="store.status === 'loading'"
		abort-label-key="cancel"
		:show-timer="true"
		@abort="store.abort()"
	/>
	<div class="app-workspace">
		<!-- List apps fan out many queries, so nothing fires reactively:
			the form submits explicitly, and the results state replaces
			it until "Do another query". -->
		<template v-if="!ready">
			<MassviewsSettings />
			<figure class="app-chart">
				<CdxField class="app-pages">
					<template #label>
						{{ $i18n( 'source' ) }}
					</template>
					<div class="app-page-input-row">
						<CdxSelect
							v-model:selected="source"
							:menu-items="sourceItems"
							:aria-label="$i18n( 'source' )"
							@update:selected="onSourceSelect"
						/>
						<!-- The data-* attributes stop password managers from
							offering credentials here (see SinglePageInput). -->
						<CdxTextInput
							ref="targetInput"
							v-model="target"
							class="app-page-input-row__input"
							autocomplete="on"
							min="1"
							data-1p-ignore
							data-lpignore="true"
							data-bwignore
							data-form-type="other"
							:input-type="source === 'quarry' ? 'number' : 'text'"
							:clearable="true"
							:aria-label="targetLabel"
							:placeholder="targetPlaceholder"
							@keydown.enter="submit"
							@clear="onTargetClear"
						/>
						<!-- In the stacked (mobile) layout the help text
							follows DOM order, right under the input; in the
							row layout it wraps onto its own line below. -->
						<!-- eslint-disable vue/no-v-html -- built from i18n
							messages and our own help URLs; no
							user-controlled markup. -->
						<p class="app-page-input-row__description" v-html="sourceDescription" />
						<!-- eslint-enable vue/no-v-html -->
						<div v-if="source === 'category'" class="app-source-options">
							<CdxCheckbox v-model="useSubjectPage" :inline="true">
								{{ $i18n( 'category-subject-toggle' ) }}
							</CdxCheckbox>
							<CdxCheckbox v-model="includeSubcategories" :inline="true">
								{{ $i18n( 'include-subcategories' ) }}
							</CdxCheckbox>
						</div>
						<CdxButton
							action="progressive"
							weight="primary"
							:disabled="!store.target || store.status === 'loading'"
							@click="submit"
						>
							{{ $i18n( 'submit' ) }}
						</CdxButton>
					</div>
				</CdxField>
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
						<a :href="store.targetUrl" target="_blank">{{ targetDisplay }}</a>
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
			<template v-else>
				<div class="app-chart__toolbar">
					<ExportMenu
						:filename="exportFilename"
						:get-csv-rows="listCsvRows"
						:get-json="() => store.pagesData"
					/>
				</div>
				<ResultsTable />
			</template>
			<div class="app-output-footer">
				<CdxMessage
					v-if="incompleteMessage"
					type="warning"
					:inline="true"
				>
					{{ incompleteMessage }}
				</CdxMessage>
				<span v-if="store.elapsedTime !== null" class="app-elapsed-time">
					{{ $i18n( 'elapsed-time', store.elapsedTime.toFixed( 2 ) ) }}
				</span>
			</div>
		</figure>
	</div>
	<CdxToastContainer />
	<!-- Mounted here, not in the Settings sidebar: the results state
		replaces the sidebar entirely, and the nav's Settings button
		must keep working there. -->
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
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
import { computed, nextTick, onMounted, ref } from 'vue';
import {
	CdxButton,
	CdxCheckbox,
	CdxField,
	CdxIcon,
	CdxMessage,
	CdxSelect,
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
import { useIncompleteDataMessage } from '../composables/useIncompleteDataMessage.js';
import { formatDate } from '../lib/format.js';
import { parseDate } from '../lib/dates.js';
import { banana, rawI18n } from '../i18n.js';
import MassviewsSettings from '../apps/massviews/Settings.vue';
import FaqDialog from '../apps/massviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/massviews/UrlStructureDialog.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import PreferencesDialog from '../components/PreferencesDialog.vue';
import ChartPanel from '../components/ChartPanel.vue';
import ExportMenu from '../components/ExportMenu.vue';
import ResultsTable from '../apps/massviews/ResultsTable.vue';

const store = useMassviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
const { source, target, subjectpage, subcategories } = storeToRefs( store );
useQuerySync( store );
const { message: incompleteMessage } = useIncompleteDataMessage( store );

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

const useSubjectPage = computed( {
	get: () => subjectpage.value === '1',
	set: ( value ) => {
		subjectpage.value = value ? '1' : '0';
	}
} );

const includeSubcategories = computed( {
	get: () => subcategories.value === '1',
	set: ( value ) => {
		subcategories.value = value ? '1' : '0';
	}
} );

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

// The full title with its namespace prefix, as the URL spelled it
// (localized prefixes included).
const targetDisplay = computed( () => store.targetTitle.replace( /_/g, ' ' ) );

// Quarry is a proper noun.
const sourceItems = [
	{ value: 'category', label: banana.i18n( 'category' ) },
	{ value: 'wikilinks', label: banana.i18n( 'wikilinks' ) },
	{ value: 'subpages', label: banana.i18n( 'subpages' ) },
	{ value: 'transclusions', label: banana.i18n( 'transclusions' ) },
	{ value: 'quarry', label: 'Quarry' },
	{ value: 'hashtag', label: banana.i18n( 'hashtag' ) },
	{ value: 'external-link', label: banana.i18n( 'external-link' ) },
	{ value: 'search', label: banana.i18n( 'search' ) }
];

// The target input's accessible name and example, per source (legacy
// placeholders).
const PLACEHOLDERS = {
	category: 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups_from_New_York_City',
	wikilinks: 'https://en.wikipedia.org/wiki/Wikipedia:Articles_for_improvement/Articles/List',
	subpages: 'https://en.wikipedia.org/wiki/User:Example',
	transclusions: 'https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games',
	quarry: '1',
	hashtag: '#editathon',
	'external-link': '*.nycgo.com',
	search: 'insource:"UNESCO Science Report"'
};
const targetLabel = computed( () => store.source === 'quarry' ?
	'Quarry' :
	banana.i18n( {
		category: 'category',
		wikilinks: 'page',
		subpages: 'page',
		transclusions: 'template',
		hashtag: 'hashtag',
		'external-link': 'external-link',
		search: 'search'
	}[ store.source ] ) );
const targetPlaceholder = computed( () => PLACEHOLDERS[ store.source ] );

/**
 * Subtle helper line under the input describing the selected source,
 * like the legacy tool. The wikilinks/transclusions messages embed
 * their help anchor in the content (rawI18n bypasses banana's
 * sanitizer); the others take it as a parameter.
 */
const sourceDescription = computed( () => {
	const help = ( page, text ) => `<a target="_blank" href="https://www.mediawiki.org/wiki/Special:MyLanguage/${ page }">${ text }</a>`;
	switch ( store.source ) {
		case 'wikilinks':
			return rawI18n(
				'massviews-wikilinks-description',
				'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikilinks'
			);
		case 'subpages':
			return banana.i18n(
				'massviews-subpages-description',
				help( 'Help:Subpages', banana.i18n( 'subpages' ).toLowerCase() )
			);
		case 'transclusions':
			return rawI18n(
				'massviews-transclusions-description',
				'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Transclusion'
			);
		case 'quarry':
			return banana.i18n(
				'massviews-quarry-description',
				'<a target="_blank" href="https://quarry.wmcloud.org">Quarry</a>'
			);
		case 'hashtag':
			return banana.i18n(
				'massviews-hashtag-description',
				banana.i18n(
					'hashtag-credits',
					'<a target="_blank" href="https://hashtags.wmcloud.org">' +
						'Wikimedia hashtag search</a>'
				),
				'<a target="_blank" href="https://hashtags.wmcloud.org/docs/">' +
					`${ banana.i18n( 'hashtag' ).toLowerCase() }</a>`
			);
		case 'external-link':
			return banana.i18n(
				'massviews-external-link-description',
				'<a target="_blank" href="https://www.mediawiki.org/wiki/Help:Links#External_links">' +
					`${ banana.i18n( 'external-link' ).toLowerCase() }</a>`
			);
		case 'search':
			return banana.i18n(
				'massviews-search-description',
				'<a target="_blank" href="https://www.mediawiki.org/wiki/Help:CirrusSearch">CirrusSearch</a>'
			);
		default:
			return banana.i18n(
				'massviews-category-description',
				help( 'Help:Categories', banana.i18n( 'category' ).toLowerCase() )
			);
	}
} );

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

// The list export is one row per page with the daily counts (legacy
// shape), unlike the chart export's combined series.
function listCsvRows() {
	return [
		[ 'Title', ...store.dates ],
		...store.pagesData.map( ( row ) => [ row.title, ...row.counts ] )
	];
}

// The chart shows the combined views across all category members.
const chartSeries = computed( () => store.totals ? [ {
	label: targetDisplay.value,
	counts: store.totals.counts,
	total: store.totals.total,
	average: store.totals.average
} ] : [] );

const targetInput = ref( null );

/**
 * Keep focus on the input after the clear button, ready for the next
 * entry (Codex exposes no focus API, hence the DOM reach-in).
 */
function focusTarget() {
	targetInput.value?.$el?.querySelector( 'input' )?.focus();
}

/**
 * Picking a source readies the input for its target: the previous
 * source's value (and any errors it caused) no longer applies, so
 * both clear, and focus moves there once the menu has closed.
 */
async function onSourceSelect() {
	target.value = '';
	ui.clearMessages();
	await nextTick();
	focusTarget();
}

/**
 * A cleared input also clears lingering errors (e.g. a failed
 * previous query).
 */
function onTargetClear() {
	ui.clearMessages();
	focusTarget();
}

// Submission-based tools put the cursor on the main input on page
// load; only the initial URL-provided target loads automatically.
onMounted( () => {
	if ( store.target ) {
		store.load();
	} else {
		focusTarget();
	}
} );
</script>
