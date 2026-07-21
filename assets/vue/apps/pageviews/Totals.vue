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
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'views' ) }}</dt>
					<dd>{{ number( store.totals.total ) }}</dd>
				</div>
				<div class="app-totals__stat">
					<dt>{{ averageLabel }}</dt>
					<dd>{{ number( Math.round( store.totals.average ) ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-if="editTotals">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'revisions' ) }}
			</h4>
			<dl class="app-totals__stats">
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'edits' ) }}</dt>
					<dd>{{ number( Number( editTotals.num_edits ) ) }}</dd>
				</div>
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'editors' ) }}</dt>
					<dd>{{ number( Number( editTotals.num_users ) ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-if="basicInfo">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'basic-information' ) }}
			</h4>
			<dl class="app-totals__stats">
				<div v-if="basicInfo.watchers !== null" class="app-totals__stat">
					<dt>{{ $i18n( 'watchers' ) }}</dt>
					<dd>{{ number( basicInfo.watchers ) }}</dd>
				</div>
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'size' ) }}</dt>
					<dd>{{ number( basicInfo.size ) }}</dd>
				</div>
			</dl>
		</template>
	</figure>
</template>

<script setup>
import { computed } from 'vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { banana } from '../../i18n.js';

const store = usePageviewsStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale );

const averageLabel = computed( () => banana.i18n(
	settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
) );

/**
 * Combined edit stats: the endpoint provides an exact combined row for
 * multi-page queries (distinct editors overlap, so summing per-page
 * numbers would overcount); a single page is its own total.
 */
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
		size: pages.reduce( ( sum, page ) => sum + ( page.length || 0 ), 0 )
	};
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-totals {
	&__stats {
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-75;
		margin: 0;
	}

	&__stat {
		dt {
			color: @color-subtle;
			font-size: @font-size-small;
		}

		dd {
			font-size: @font-size-x-large;
			font-weight: @font-weight-bold;
			margin: 0;
		}
	}

	&__subheading {
		border-top: @border-width-base solid @border-color-subtle;
		margin: @spacing-100 0 @spacing-50;
		padding-top: @spacing-75;

		&--first {
			border-top: 0;
			margin-top: 0;
			padding-top: 0;
		}
	}
}
</style>
