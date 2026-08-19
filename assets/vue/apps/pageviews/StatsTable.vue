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
			<a
				:href="pageUrl( summary.title )"
				class="app-page-summary__title"
				target="_blank"
			>{{ summary.title }}</a>
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
	<DataTable
		v-else-if="rows.length"
		:caption="$i18n( 'title' )"
		:columns="columns"
		:rows="rows"
		default-sort="views"
	>
		<template #item-color="{ item }">
			<span class="app-stats__color" :style="{ background: item }" />
		</template>
		<template #item-title="{ item }">
			<a :href="pageUrl( item )" target="_blank">{{ item }}</a>
		</template>
		<template #item-assessment="{ item }">
			<template v-if="item">
				<img
					v-if="item.badge"
					class="app-stats__badge"
					:src="item.badge"
					:alt="item.class"
				>
				{{ item.class }}
			</template>
		</template>
		<template #item-views="{ item }">
			{{ number( item ) }}
		</template>
		<template #item-average="{ item }">
			{{ number( Math.round( item ) ) }}
		</template>
		<template #item-edits="{ item, row }">
			<a
				v-if="item !== null"
				:href="historyUrl( row.title, item )"
				target="_blank"
			>{{ number( item ) }}</a>
			<template v-else>
				?
			</template>
		</template>
		<template #item-editors="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-size="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-protection="{ item }">
			{{ item === null ? '' : ( item || $i18n( 'none' ) ) }}
		</template>
		<template #item-watchers="{ item }">
			{{ watchersLabel( item ) }}
		</template>
		<template #item-links="{ row }">
			<a :href="crossAppUrl( 'langviews', row.title )" target="_blank">
				{{ $i18n( 'all-languages' ) }}
			</a>
			<span class="app-stats__muted">&nbsp;·&nbsp;</span>
			<a :href="crossAppUrl( 'redirectviews', row.title )" target="_blank">
				{{ $i18n( 'redirects' ) }}
			</a>
		</template>
		<template v-if="rows.length > 1 && store.totals" #tfoot>
			<tfoot>
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
						{{ $i18n(
							'num-protections', number( protectionsTotal ), protectionsTotal
						) }}
					</td>
					<td class="app-stats__number">
						{{ watchersTotal === null ? '?' : number( watchersTotal ) }}
					</td>
					<td />
				</tr>
			</tfoot>
		</template>
	</DataTable>
</template>

<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';
import { editProtectionLevel } from '../../lib/mwApi.js';
import { historyUrl as buildHistoryUrl } from '../../lib/wikiUrls.js';
import { seriesColor } from '../../charts/palette.js';
import { banana, rawI18n } from '../../i18n.js';

// WMF wikis hide the watcher count of pages watched by fewer than
// this many users ($wgUnwatchedPageThreshold).
const WATCHER_THRESHOLD = 30;

const store = usePageviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

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

const rows = computed( () => store.series.map( ( page, index ) => {
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
} ) );

// Like the legacy tool, the Class and Protection columns only appear
// when at least one page has something to show there.
const hasAssessment = computed( () => rows.value.some( ( row ) => row.assessment ) );
const hasProtection = computed( () => rows.value.some( ( row ) => row.protection ) );

const columns = computed( () => [
	{ key: 'color', label: '', sortable: false },
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	...( hasAssessment.value ?
		[ {
			key: 'assessment',
			label: banana.i18n( 'class' ),
			sortable: true,
			// Assessments sort by their class name.
			sortValue: ( row ) => row.assessment?.class ?? ''
		} ] :
		[]
	),
	{ key: 'views', label: banana.i18n( 'views' ), sortable: true, numeric: true },
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true,
		numeric: true
	},
	{ key: 'edits', label: banana.i18n( 'edits' ), sortable: true, numeric: true },
	{ key: 'editors', label: banana.i18n( 'editors' ), sortable: true, numeric: true },
	{ key: 'size', label: banana.i18n( 'size' ), sortable: true, numeric: true },
	...( hasProtection.value ?
		[ { key: 'protection', label: banana.i18n( 'protection' ), sortable: true } ] :
		[]
	),
	{ key: 'watchers', label: banana.i18n( 'watchers' ), sortable: true, numeric: true },
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

function pageUrl( title ) {
	return `https://${ store.project }/wiki/${ encodeURIComponent( title.replace( / /g, '_' ) ) }`;
}

function historyUrl( title, edits ) {
	return buildHistoryUrl( store.project, title, { end: settings.end, edits } );
}

/**
 * A cross-app link for one page, carrying the report params over.
 *
 * @param {string} app Route name, e.g. 'langviews'.
 * @param {string} title
 * @return {string}
 */
function crossAppUrl( app, title ) {
	const query = new URLSearchParams( {
		project: store.project,
		platform: store.platform,
		agent: store.agent,
		start: settings.start,
		end: settings.end,
		page: title.replace( / /g, '_' )
	} );
	return `/${ app }?${ query }`;
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-page-summary {
	font-size: @font-size-large;
	margin: @spacing-100 0;
	text-align: center;

	&__badge {
		height: @size-100;
		margin-right: @spacing-25;
		vertical-align: center;
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

	&__title {
		font-weight: @font-weight-bold;
	}
}
</style>
