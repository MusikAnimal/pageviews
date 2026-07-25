<template>
	<p v-if="summary" class="app-page-summary">
		<a
			v-if="summary.url"
			:href="summary.url"
			target="_blank"
		>{{ summary.label }}</a>
		<template v-else>
			{{ summary.label }}
		</template>
		·
		<span class="app-page-summary__dates">{{ summary.dates }}</span>
		·
		<strong>{{ summary.views }}</strong>
	</p>
	<DataTable
		v-else-if="rows.length"
		:caption="$i18n( 'siteviews-title' )"
		:columns="columns"
		:rows="rows"
		default-sort="views"
	>
		<template #item-color="{ item }">
			<span class="app-stats__color" :style="{ background: item }" />
		</template>
		<template #item-site="{ item }">
			<a :href="`https://${ item }`" target="_blank">{{ item }}</a>
		</template>
		<template #item-views="{ item }">
			{{ number( item ) }}
		</template>
		<template #item-average="{ item }">
			{{ number( Math.round( item ) ) }}
		</template>
		<template #item-edits="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-editors="{ item }">
			{{ item === null ? '?' : number( Math.round( item ) ) }}
		</template>
		<template #item-editedPages="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-newPages="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-netBytes="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-links="{ row }">
			<a :href="topviewsUrl( row.site )" target="_blank">
				{{ $i18n( 'most-viewed-pages' ) }}
			</a>
		</template>
		<template v-if="rows.length > 1 && store.totals" #tfoot>
			<tfoot>
				<tr>
					<td />
					<th>{{ $i18n( 'num-projects', number( rows.length ), rows.length ) }}</th>
					<td v-if="showSum" class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
					<td class="app-stats__number">
						{{ number( Math.round( store.totals.average ) ) }}
					</td>
					<td class="app-stats__number">
						{{ editsTotal( 'edits' ) === null ? '?' : number( editsTotal( 'edits' ) ) }}
					</td>
					<td class="app-stats__number">
						{{ editsTotal( 'editors' ) === null ?
							'?' : number( Math.round( editsTotal( 'editors' ) ) ) }}
					</td>
					<td class="app-stats__number">
						{{ editsTotal( 'editedPages' ) === null ?
							'?' : number( editsTotal( 'editedPages' ) ) }}
					</td>
					<td class="app-stats__number">
						{{ editsTotal( 'newPages' ) === null ?
							'?' : number( editsTotal( 'newPages' ) ) }}
					</td>
					<td class="app-stats__number">
						{{ editsTotal( 'netBytes' ) === null ?
							'?' : number( editsTotal( 'netBytes' ) ) }}
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
import { useSiteviewsStore } from '../../stores/siteviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../../lib/dates.js';
import { seriesColor } from '../../charts/palette.js';
import { banana } from '../../i18n.js';

const store = useSiteviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

// Unique devices are not additive across days: no sum column (legacy).
const showSum = computed( () => store.source !== 'unique-devices' );

const columns = computed( () => [
	{ key: 'color', label: '', sortable: false },
	{ key: 'site', label: banana.i18n( 'project' ), sortable: true },
	...( showSum.value ?
		[ {
			key: 'views',
			label: banana.i18n( store.source === 'pagecounts' ? 'counts' : 'views' ),
			sortable: true,
			numeric: true
		} ] :
		[]
	),
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true,
		numeric: true
	},
	{ key: 'edits', label: banana.i18n( 'edits' ), sortable: true, numeric: true },
	{
		key: 'editors',
		label: `${ banana.i18n( 'editors' ) } (${ banana.i18n(
			settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
		).toLowerCase() })`,
		sortable: true,
		numeric: true
	},
	{ key: 'editedPages', label: banana.i18n( 'pages-edited' ), sortable: true, numeric: true },
	{ key: 'newPages', label: banana.i18n( 'pages-created' ), sortable: true, numeric: true },
	{ key: 'netBytes', label: banana.i18n( 'net-bytes' ), sortable: true, numeric: true },
	{ key: 'links', label: banana.i18n( 'links' ), sortable: false }
] );

/**
 * The single-site summary line, replacing the table:
 * site · start – end · N pageviews/devices/counts
 */
const summary = computed( () => {
	if ( store.series.length !== 1 ) {
		return null;
	}
	const [ site ] = store.series;
	const monthly = settings.dateType === 'monthly';
	const range = [ settings.start, settings.end ]
		.map( ( date ) => formatDate(
			parseDate( date ),
			{ locale: banana.locale, monthly, localize: preferences.localizeDateFormat }
		) )
		.join( ' – ' );
	const countMessage = {
		pageviews: 'num-pageviews',
		'unique-devices': 'num-unique-devices',
		pagecounts: 'num-pagecounts'
	}[ store.source ];

	return {
		label: store.isAllProjects ? banana.i18n( 'all-of-wikimedia' ) : site.site,
		url: store.isAllProjects ? 'https://www.wikimedia.org/' : `https://${ site.site }`,
		dates: range,
		views: banana.i18n( countMessage, number( site.total ), site.total )
	};
} );

const rows = computed( () => store.series.map( ( site, index ) => ( {
	site: site.site,
	color: seriesColor( index ),
	views: site.total,
	average: site.average,
	// null = the edits fetch is pending, failed or had no data.
	// Distinct editors are not additive across days: their
	// per-day/month average is shown instead of a total.
	edits: editStat( site.site, 'edits' ),
	editors: editStat( site.site, 'editors', 'average' ),
	editedPages: editStat( site.site, 'editedPages' ),
	newPages: editStat( site.site, 'newPages' ),
	netBytes: editStat( site.site, 'netBytes' )
} ) ) );

function editStat( site, metric, field = 'total' ) {
	return store.editsData && !store.editsData.noData ?
		store.editsData.sites[ site ]?.[ metric ]?.[ field ] ?? null :
		null;
}

function editsTotal( metric ) {
	if ( !store.editsData || store.editsData.noData ) {
		return null;
	}
	const totals = store.editsData.totals[ metric ];
	return totals ? ( metric === 'editors' ? totals.average : totals.total ) : null;
}

function topviewsUrl( site ) {
	const endMonth = startOfMonth( parseDate( settings.end ) );
	const max = lastCompleteMonthUtc();
	const date = formatYm( endMonth > max ? max : endMonth );
	return `/topviews?project=${ encodeURIComponent( site ) }&platform=all-access&date=${ date }`;
}
</script>
