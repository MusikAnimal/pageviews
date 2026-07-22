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
			<tr v-for="row in rows" :key="row.site">
				<td>
					<span class="app-stats__color" :style="{ background: row.color }" />
				</td>
				<td>
					<a :href="`https://${ row.site }`" target="_blank">{{ row.site }}</a>
				</td>
				<td v-if="showSum" class="app-stats__number">
					{{ number( row.views ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( row.average ) ) }}
				</td>
				<td
					v-for="key in STAT_KEYS"
					:key="key"
					class="app-stats__number"
				>
					{{ row.stats ? number( row.stats[ key ] || 0 ) : '?' }}
				</td>
				<td>
					<a :href="topviewsUrl( row.site )" target="_blank">
						{{ $i18n( 'most-viewed-pages' ) }}
					</a>
				</td>
			</tr>
		</tbody>
		<tfoot v-if="rows.length > 1 && store.totals">
			<tr>
				<td />
				<th>{{ $i18n( 'num-projects', number( rows.length ), rows.length ) }}</th>
				<td v-if="showSum" class="app-stats__number">
					{{ number( store.totals.total ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( store.totals.average ) ) }}
				</td>
				<td
					v-for="key in STAT_KEYS"
					:key="key"
					class="app-stats__number"
				>
					{{ statTotal( key ) === null ? '?' : number( statTotal( key ) ) }}
				</td>
				<td />
			</tr>
		</tfoot>
	</table>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useSiteviewsStore } from '../../stores/siteviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../../lib/dates.js';
import { seriesColor } from '../../charts/palette.js';
import { banana } from '../../i18n.js';

// Column order matches the legacy table.
const STAT_KEYS = [ 'pages', 'edits', 'images', 'users', 'activeusers', 'admins' ];
const STAT_MESSAGES = {
	pages: 'pages',
	edits: 'edits',
	images: 'images',
	users: 'users',
	activeusers: 'active-users',
	admins: 'admins'
};

const store = useSiteviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const sortKey = ref( 'views' );
const sortDescending = ref( true );

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

// Unique devices are not additive across days: no sum column (legacy).
const showSum = computed( () => store.source !== 'unique-devices' );

const columns = computed( () => [
	{ key: 'site', label: banana.i18n( 'project' ), sortable: true },
	...( showSum.value ?
		[ {
			key: 'views',
			label: banana.i18n( store.source === 'pagecounts' ? 'counts' : 'views' ),
			sortable: true
		} ] :
		[]
	),
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true
	},
	...STAT_KEYS.map( ( key ) => ( {
		key,
		label: banana.i18n( STAT_MESSAGES[ key ] ),
		sortable: true
	} ) ),
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

const rows = computed( () => {
	const unsorted = store.series.map( ( site, index ) => {
		const stats = store.siteStats[ site.site ] ?? null;
		return {
			site: site.site,
			color: seriesColor( index ),
			views: site.total,
			average: site.average,
			stats,
			// Spread for sorting on the statistic columns.
			...stats
		};
	} );

	const key = sortKey.value;
	const direction = sortDescending.value ? -1 : 1;
	return unsorted.sort( ( a, b ) => {
		const [ x, y ] = [ a[ key ], b[ key ] ];
		if ( typeof x === 'string' || typeof y === 'string' ) {
			return direction * String( x ?? '' ).localeCompare( String( y ?? '' ) );
		}
		return direction * ( ( x ?? -1 ) - ( y ?? -1 ) );
	} );
} );

function statTotal( key ) {
	if ( rows.value.some( ( row ) => !row.stats ) ) {
		return null;
	}
	return rows.value.reduce( ( sum, row ) => sum + ( row.stats[ key ] || 0 ), 0 );
}

function sortBy( key ) {
	if ( sortKey.value === key ) {
		sortDescending.value = !sortDescending.value;
	} else {
		sortKey.value = key;
		// Numbers read best descending first; site names ascending.
		sortDescending.value = key !== 'site';
	}
}

function ariaSort( key ) {
	if ( sortKey.value !== key ) {
		return undefined;
	}
	return sortDescending.value ? 'descending' : 'ascending';
}

function topviewsUrl( site ) {
	const endMonth = startOfMonth( parseDate( settings.end ) );
	const max = lastCompleteMonthUtc();
	const date = formatYm( endMonth > max ? max : endMonth );
	return `/topviews?project=${ encodeURIComponent( site ) }&platform=all-access&date=${ date }`;
}
</script>
