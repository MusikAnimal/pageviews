<template>
	<figure class="app-totals" :aria-label="$i18n( 'totals' )">
		<figcaption class="app-workspace__heading">
			<h3>{{ $i18n( 'totals' ) }}</h3>
		</figcaption>
		<template v-if="store.totals">
			<h4 class="app-totals__subheading app-totals__subheading--first">
				{{ $i18n( 'pageviews' ) }}
			</h4>
			<dl class="app-totals__stats">
				<div class="app-totals__stat app-totals__stat--strong">
					<dt>{{ $i18n( 'views' ) }}</dt>
					<dd>{{ number( store.totals.total ) }}</dd>
				</div>
				<div v-if="median !== null" class="app-totals__stat app-totals__stat--strong">
					<dt>{{ $i18n( 'median' ) }}</dt>
					<dd>{{ number( median ) }}</dd>
				</div>
				<div class="app-totals__stat app-totals__stat--strong">
					<dt>{{ averageLabel }}</dt>
					<dd>{{ number( Math.round( store.totals.average ) ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-if="editTotals || editDataFailed">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'revisions' ) }}
			</h4>
			<dl v-if="editTotals" class="app-totals__stats">
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'edits' ) }}</dt>
					<dd>
						<a
							v-if="historyUrl"
							:href="historyUrl"
							target="_blank"
						>{{ number( Number( editTotals.num_edits ) ) }}</a>
						<template v-else>
							{{ number( Number( editTotals.num_edits ) ) }}
						</template>
					</dd>
				</div>
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'editors' ) }}</dt>
					<dd>{{ number( Number( editTotals.num_users ) ) }}</dd>
				</div>
			</dl>
			<p v-else class="app-totals__unavailable">
				{{ $i18n( 'data-unavailable' ) }}
			</p>
		</template>
		<template v-if="basicInfo">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'basic-information' ) }}
			</h4>
			<dl class="app-totals__stats">
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'watchers' ) }}</dt>
					<dd>
						{{ basicInfo.watchers === null ?
							$i18n( 'fewer-than', number( WATCHER_THRESHOLD ) ) :
							number( basicInfo.watchers ) }}
					</dd>
				</div>
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'size' ) }}</dt>
					<dd>{{ number( basicInfo.size ) }}</dd>
				</div>
				<div v-if="basicInfo.protection !== undefined" class="app-totals__stat">
					<dt>{{ $i18n( 'protection' ) }}</dt>
					<dd class="app-totals__protection">
						{{ basicInfo.protection ?? $i18n( 'none' ) }}
					</dd>
				</div>
			</dl>
		</template>
		<!-- Cross-app links for the single queried page (comparisons
			get them per-row in the stats table instead). -->
		<nav v-if="crossAppUrls" class="app-totals__links">
			<a :href="crossAppUrls.langviews" target="_blank">
				{{ $i18n( 'all-languages' ) }}
			</a>
			<span class="app-stats__muted">&nbsp;·&nbsp;</span>
			<a :href="crossAppUrls.redirectviews" target="_blank">
				{{ $i18n( 'redirects' ) }}
			</a>
		</nav>
	</figure>
</template>

<script setup>
import { computed } from 'vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { editProtectionLevel } from '../../lib/mwApi.js';
import { historyUrl as buildHistoryUrl } from '../../lib/wikiUrls.js';
import { shouldUseLogScale } from '../../charts/logScale.js';
import { banana } from '../../i18n.js';

// WMF wikis hide the watcher count of pages watched by fewer than
// this many users ($wgUnwatchedPageThreshold).
const WATCHER_THRESHOLD = 30;

const store = usePageviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const averageLabel = computed( () => banana.i18n(
	settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
) );

/**
 * The median of the combined daily counts, shown only when there is a
 * spike in pageviews (the same heuristic that flips on the log scale)
 * — the average is misleading then, like the legacy tool noted.
 */
const median = computed( () => {
	const counts = store.totals?.counts;
	if ( !counts?.length ||
		!shouldUseLogScale( store.series.map( ( page ) => page.counts ) )
	) {
		return null;
	}
	const sorted = counts.map( ( value ) => value || 0 ).sort( ( a, b ) => a - b );
	const half = Math.floor( sorted.length / 2 );
	return sorted.length % 2 ? sorted[ half ] : ( sorted[ half - 1 ] + sorted[ half ] ) / 2;
} );

/**
 * Combined edit stats: the endpoint provides an exact combined row for
 * multi-page queries (distinct editors overlap, so summing per-page
 * numbers would overcount); a single page is its own total.
 */
const editDataFailed = computed( () => store.editData?.failed ?? false );

const editTotals = computed( () => {
	if ( !store.editData ) {
		return null;
	}
	if ( store.editData.totals ) {
		return store.editData.totals;
	}
	// A single page is its own total (the endpoint only computes the
	// combined row for multi-page queries).
	const entries = Object.values( store.editData.pages ?? {} );
	return entries.length === 1 ? entries[ 0 ] : null;
} );

/**
 * For a single page the edit count links to the revision history;
 * multi-page numbers are combined and link nowhere.
 */
const historyUrl = computed( () => {
	if ( store.series.length !== 1 ) {
		return null;
	}
	return buildHistoryUrl( store.project, store.series[ 0 ].title, {
		end: settings.end,
		edits: editTotals.value ? Number( editTotals.value.num_edits ) : null
	} );
} );

/**
 * Langviews and Redirect Views for the single queried page, carrying
 * the same report parameters over.
 */
const crossAppUrls = computed( () => {
	if ( store.series.length !== 1 ) {
		return null;
	}
	const query = new URLSearchParams( {
		project: store.project,
		platform: store.platform,
		agent: store.agent,
		start: settings.start,
		end: settings.end,
		page: store.series[ 0 ].title.replace( / /g, '_' )
	} );
	return {
		langviews: `/langviews?${ query }`,
		redirectviews: `/redirectviews?${ query }`
	};
} );

/**
 * Watchers and byte size summed across pages. Watchers are hidden by
 * the API below the unwatched-pages threshold; null when no page
 * reported a count.
 */
const basicInfo = computed( () => {
	if ( !store.pageInfo ) {
		return null;
	}
	const pages = Object.values( store.pageInfo ).filter( ( page ) => !page.missing );
	if ( !pages.length ) {
		return null;
	}
	const watcherCounts = pages
		.map( ( page ) => page.watchers )
		.filter( ( watchers ) => typeof watchers === 'number' );
	return {
		watchers: watcherCounts.length ?
			watcherCounts.reduce( ( a, b ) => a + b, 0 ) :
			null,
		size: pages.reduce( ( sum, page ) => sum + ( page.length || 0 ), 0 ),
		// Protection is per-page, so only shown for single-page queries
		// (the stats table has a column for comparisons).
		...( pages.length === 1 ?
			{ protection: editProtectionLevel( pages[ 0 ] ) } :
			{}
		)
	};
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-totals__stats {
	line-height: @line-height-small;
}
</style>
