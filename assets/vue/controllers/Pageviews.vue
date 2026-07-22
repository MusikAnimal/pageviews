<template>
	<!-- Same markup as the Twig FOUC skeleton: centered in the
		.app-container both ways. -->
	<div v-if="store.status === 'loading'" class="app-progress-bar">
		<div>{{ $i18n( 'loading' ) }}</div>
		<CdxProgressBar :aria-label="$i18n( 'loading' )" />
	</div>
	<div class="app-workspace">
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
				:autolog="store.autolog"
				:aria-label="$i18n( 'pageviews' )"
			/>
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
import { computed, onMounted, watch } from 'vue';
import {
	CdxMessage,
	CdxProgressBar,
	CdxToastContainer
} from '@wikimedia/codex';
import { usePageviewsStore } from '../stores/pageviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { getDefaultPages } from '../lib/defaultPages.js';
import { useRoute, useRouter } from 'vue-router';
import PageviewsSettings from '../apps/pageviews/Settings.vue';
import FaqDialog from '../apps/pageviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/pageviews/UrlStructureDialog.vue';
import PageInput from '../components/PageInput.vue';
import ChartPanel from '../components/ChartPanel.vue';
import Totals from '../apps/pageviews/Totals.vue';
import StatsTable from '../apps/pageviews/StatsTable.vue';

const store = usePageviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
useQuerySync( store );

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

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

@form-basis: @size-1600;
@viz-basis: @size-3200;
@totals-basis: @size-1600;
@layout-gap: @size-100;
// In column layouts the inter-column spacing comes from the columns'
// own padding rather than the flex gap, so the separator borders sit
// exactly midway between a sidebar and the chart.
@column-space: calc( @spacing-50 + ( @layout-gap / 2 ) );

// A generous ceiling on the stretched workspace, for portrait
// monitors — past this the leftover space stays empty above the
// footer instead.
@workspace-max-height: 64rem;

.app-workspace {
	align-items: flex-start;
	display: flex;
	// Stretches to fill .app-container (which fills the viewport below
	// the header, above the footer), leaving the stats table its
	// natural room directly below the columns.
	flex: 1;
	flex-wrap: wrap;
	gap: @layout-gap;

	&__heading {
		text-align: center;
	}

	@container ( min-width: calc( @form-basis + @viz-basis + @layout-gap ) ) {
		& {
			column-gap: 0;
			// Only capped in the column layout: stacked layouts are
			// content-driven and must never clip.
			max-height: @workspace-max-height;
		}
	}
}

// The sidebars carry a single separator edge toward the chart (no
// top/bottom borders), and only once the layout is wide enough for
// them to render as columns.
.app-settings {
	flex: 1 1 @size-1600;
	padding: @spacing-50;

	@container ( min-width: calc( @form-basis + @viz-basis + @layout-gap ) ) {
		& {
			border-right: @border-width-base solid @border-color-base;
			padding-right: @column-space;
		}
	}
}

.app-chart {
	// Stretch to the workspace's full height (the sidebars stay
	// top-aligned) and lay out as a column, so the chart canvas can
	// grow into the leftover space.
	align-self: stretch;
	display: flex;
	flex: 999 1 @size-3200;
	flex-direction: column;
	margin: 0;
	min-height: 100px;
	min-width: 0;
	padding: @spacing-50;

	@container ( min-width: calc( @form-basis + @viz-basis + @layout-gap ) ) {
		& {
			padding-left: @column-space;
		}
	}

	@container ( min-width: calc( @form-basis + @viz-basis + @totals-basis + 2 * @layout-gap ) ) {
		& {
			padding-right: @column-space;
		}
	}

	&__toolbar {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-50;
		margin-bottom: @spacing-50;

		// The flex gap provides the spacing; the inline checkboxes'
		// own trailing margin would double it up.
		.cdx-checkbox--inline {
			margin-right: 0;
		}
	}

	&__show-values {
		margin-left: auto;
	}
}

.app-totals {
	flex: 1 1 @size-1600;
	padding: @spacing-50;

	@container ( min-width: calc( @form-basis + @viz-basis + @totals-basis + 2 * @layout-gap ) ) {
		& {
			border-left: @border-width-base solid @border-color-base;
			padding-left: @column-space;
		}
	}
}

</style>
