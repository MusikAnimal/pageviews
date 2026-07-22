<template>
	<template v-if="summary">
		<p class="app-page-summary">
			<template v-if="summary.assessment">
				<img
					v-if="summary.assessment.badge"
					class="app-page-summary__badge"
					:src="summary.assessment.badge"
					:alt="summary.assessment.class"
				>
				{{ summary.assessment.class }}
				·
			</template>
			<a :href="pageUrl( summary.title )" target="_blank">{{ summary.title }}</a>
			·
			<span class="app-page-summary__dates">{{ summary.dates }}</span>
			·
			<strong>{{ summary.views }}</strong>
		</p>
		<!-- eslint-disable vue/no-v-html -- built from i18n messages
			and our own URL; no user-controlled markup. -->
		<p
			v-if="rankHtml"
			class="app-page-summary__rank"
			v-html="rankHtml"
		/>
		<!-- eslint-enable vue/no-v-html -->
	</template>
	<table v-else-if="rows.length" class="app-stats">
		<thead>
			<tr>
				<th />
				<th
					v-for="column in columns"
					:key="column.key"
					:aria-sort="ariaSort( column.key )"
				>
					<button
						v-if="column.sortable"
						class="app-stats__sort"
						@click="sortBy( column.key )"
					>
						{{ column.label }}
					</button>
					<template v-else>
						{{ column.label }}
					</template>
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in rows" :key="row.title">
				<td>
					<span class="app-stats__color" :style="{ background: row.color }" />
				</td>
				<td>
					<a :href="pageUrl( row.title )" target="_blank">{{ row.title }}</a>
				</td>
				<td v-if="hasAssessment">
					<template v-if="row.assessment">
						<img
							v-if="row.assessment.badge"
							class="app-stats__badge"
							:src="row.assessment.badge"
							:alt="row.assessment.class"
						>
						{{ row.assessment.class }}
					</template>
				</td>
				<td class="app-stats__number">
					{{ number( row.views ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( row.average ) ) }}
				</td>
				<td class="app-stats__number">
					<a
						v-if="row.edits !== null"
						:href="historyUrl( row.title )"
						target="_blank"
					>{{ number( row.edits ) }}</a>
					<template v-else>
						?
					</template>
				</td>
				<td class="app-stats__number">
					{{ row.editors === null ? '?' : number( row.editors ) }}
				</td>
				<td class="app-stats__number">
					{{ row.size === null ? '?' : number( row.size ) }}
				</td>
				<td v-if="hasProtection">
					{{ row.protection === null ? '' : ( row.protection || $i18n( 'none' ) ) }}
				</td>
				<td class="app-stats__number">
					{{ watchersLabel( row.watchers ) }}
				</td>
				<td>
					<!-- Cross-app links land here later. -->
				</td>
			</tr>
		</tbody>
		<tfoot v-if="rows.length > 1 && store.totals">
			<tr>
				<td />
				<th>{{ $i18n( 'num-pages', number( rows.length ), rows.length ) }}</th>
				<td v-if="hasAssessment" />
				<td class="app-stats__number">
					{{ number( store.totals.total ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( store.totals.average ) ) }}
				</td>
				<td class="app-stats__number">
					{{ editTotals ? number( editTotals.num_edits ) : '?' }}
				</td>
				<td class="app-stats__number">
					{{ editTotals ? number( editTotals.num_users ) : '?' }}
				</td>
				<td class="app-stats__number">
					{{ sizeTotal === null ? '?' : number( sizeTotal ) }}
				</td>
				<td v-if="hasProtection">
					{{ $i18n( 'num-protections', number( protectionsTotal ), protectionsTotal ) }}
				</td>
				<td class="app-stats__number">
					{{ watchersTotal === null ? '?' : number( watchersTotal ) }}
				</td>
				<td />
			</tr>
		</tfoot>
	</table>
</template>

<script setup>
import { computed, ref } from 'vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';
import { editProtectionLevel } from '../../lib/mwApi.js';
import { seriesColor } from '../../charts/palette.js';
import { banana, rawI18n } from '../../i18n.js';

// WMF wikis hide the watcher count of pages watched by fewer than
// this many users ($wgUnwatchedPageThreshold).
const WATCHER_THRESHOLD = 30;

const store = usePageviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const sortKey = ref( 'views' );
const sortDescending = ref( true );

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

/**
 * The legacy-style single-page summary line, replacing the table when
 * only one page is queried:
 * [assessment] · Title · start – end · N pageviews
 */
const summary = computed( () => {
	if ( store.series.length !== 1 ) {
		return null;
	}
	const [ page ] = store.series;
	const monthly = settings.dateType === 'monthly';
	const range = [ settings.start, settings.end ]
		.map( ( date ) => formatDate(
			parseDate( date ),
			{ locale: banana.locale, monthly, localize: preferences.localizeDateFormat }
		) )
		.join( ' – ' );

	return {
		title: page.title,
		assessment: store.editData?.pages?.[ page.title ]?.assessment ?? null,
		dates: range,
		views: banana.i18n( 'num-pageviews', number( page.total ), page.total )
	};
} );

/**
 * "Ranked N of the most viewed pages for July 2026" under the
 * single-page summary, when the page made the month's top list. The
 * anchor goes through rawI18n (banana's sanitizer strips anchors from
 * message content, but parameters bypass it).
 */
const rankHtml = computed( () => {
	if ( !store.topRank ) {
		return null;
	}
	const { rank, date } = store.topRank;
	const monthLabel = new Intl.DateTimeFormat(
		banana.locale,
		{ month: 'long', year: 'numeric', timeZone: 'UTC' }
	).format( parseDate( date ) );
	const url = `/topviews?project=${ encodeURIComponent( store.project ) }` +
		`&platform=${ store.platform }&date=${ date }`;
	const link = `<a target="_blank" href="${ url }">` +
		`${ banana.i18n( 'most-viewed-pages' ).toLowerCase() }</a>`;
	return rawI18n( 'most-viewed-rank', number( rank ), link, monthLabel );
} );

const rows = computed( () => {
	const unsorted = store.series.map( ( page, index ) => {
		const edits = store.editData?.pages?.[ page.title ] ?? null;
		const info = store.pageInfo?.[ page.title ] ?? null;
		return {
			title: page.title,
			color: seriesColor( index ),
			assessment: edits?.assessment ?? null,
			views: page.total,
			average: page.average,
			edits: edits ? Number( edits.num_edits ) : null,
			editors: edits ? Number( edits.num_users ) : null,
			size: info ? info.length ?? 0 : null,
			// null = info unavailable; '' = loaded but unprotected.
			protection: info ? ( editProtectionLevel( info ) ?? '' ) : null,
			// null = info unavailable; undefined = hidden by the wiki
			// (below the unwatched-pages threshold).
			watchers: info ? info.watchers : null
		};
	} );

	const key = sortKey.value;
	const direction = sortDescending.value ? -1 : 1;
	// Assessments sort by their class name.
	const accessor = ( row ) => key === 'assessment' ?
		row.assessment?.class ?? '' :
		row[ key ];
	return unsorted.sort( ( a, b ) => {
		const [ x, y ] = [ accessor( a ), accessor( b ) ];
		if ( typeof x === 'string' || typeof y === 'string' ) {
			return direction * String( x ?? '' ).localeCompare( String( y ?? '' ) );
		}
		return direction * ( ( x ?? -1 ) - ( y ?? -1 ) );
	} );
} );

// Like the legacy tool, the Class and Protection columns only appear
// when at least one page has something to show there.
const hasAssessment = computed( () => rows.value.some( ( row ) => row.assessment ) );
const hasProtection = computed( () => rows.value.some( ( row ) => row.protection ) );

const columns = computed( () => [
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	...( hasAssessment.value ?
		[ { key: 'assessment', label: banana.i18n( 'class' ), sortable: true } ] :
		[]
	),
	{ key: 'views', label: banana.i18n( 'views' ), sortable: true },
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true
	},
	{ key: 'edits', label: banana.i18n( 'edits' ), sortable: true },
	{ key: 'editors', label: banana.i18n( 'editors' ), sortable: true },
	{ key: 'size', label: banana.i18n( 'size' ), sortable: true },
	...( hasProtection.value ?
		[ { key: 'protection', label: banana.i18n( 'protection' ), sortable: true } ] :
		[]
	),
	{ key: 'watchers', label: banana.i18n( 'watchers' ), sortable: true },
	{ key: 'links', label: banana.i18n( 'links' ), sortable: false }
] );

const editTotals = computed( () => store.editData?.totals ?? null );

const sizeTotal = computed( () => store.pageInfo ?
	rows.value.reduce( ( sum, row ) => sum + ( row.size || 0 ), 0 ) :
	null
);

const protectionsTotal = computed(
	() => rows.value.filter( ( row ) => row.protection ).length
);

// Hidden counts contribute 0, like the legacy tool.
const watchersTotal = computed( () => store.pageInfo ?
	rows.value.reduce( ( sum, row ) => sum + ( row.watchers || 0 ), 0 ) :
	null
);

function watchersLabel( watchers ) {
	if ( watchers === null ) {
		return '?';
	}
	if ( typeof watchers !== 'number' ) {
		return banana.i18n( 'fewer-than', number( WATCHER_THRESHOLD ) );
	}
	return number( watchers );
}

function sortBy( key ) {
	if ( sortKey.value === key ) {
		sortDescending.value = !sortDescending.value;
	} else {
		sortKey.value = key;
		// Numbers read best descending first; titles ascending.
		sortDescending.value = key !== 'title';
	}
}

function ariaSort( key ) {
	if ( sortKey.value !== key ) {
		return undefined;
	}
	return sortDescending.value ? 'descending' : 'ascending';
}

function pageUrl( title ) {
	return `https://${ store.project }/wiki/${ encodeURIComponent( title.replace( / /g, '_' ) ) }`;
}

function historyUrl( title ) {
	return `https://${ store.project }/w/index.php?title=` +
		`${ encodeURIComponent( title.replace( / /g, '_' ) ) }&action=history`;
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-stats {
	border-collapse: collapse;
	margin-top: @spacing-100;
	width: 100%;

	th,
	td {
		border-bottom: @border-width-base solid @border-color-subtle;
		padding: @spacing-35 @spacing-50;
		text-align: left;
	}

	&__number {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	&__color {
		border-radius: @border-radius-base;
		display: inline-block;
		height: @size-100;
		vertical-align: middle;
		width: @size-100;
	}

	&__badge {
		height: @size-100;
		margin-right: @spacing-25;
		vertical-align: text-bottom;
		width: @size-100;
	}

	&__sort {
		background: none;
		border: 0;
		color: inherit;
		cursor: pointer;
		font: inherit;
		font-weight: @font-weight-bold;
		padding: 0;
	}

	tfoot {
		font-weight: @font-weight-bold;
	}
}

.app-page-summary {
	margin: @spacing-100 0 0;
	text-align: center;

	&__badge {
		height: @size-100;
		margin-right: @spacing-25;
		vertical-align: text-bottom;
		width: @size-100;
	}

	&__dates {
		color: @color-subtle;
	}

	&__rank {
		font-size: @font-size-small;
		margin: @spacing-25 0 0;
		text-align: center;
	}
}
</style>
