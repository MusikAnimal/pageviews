<template>
	<p v-if="summary" class="app-page-summary">
		<a :href="fileUrl( summary.name )" target="_blank">{{ summary.name }}</a>
		·
		<span class="app-page-summary__dates">{{ summary.dates }}</span>
		·
		<strong>{{ summary.requests }}</strong>
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
			<tr v-for="row in rows" :key="row.name">
				<td>
					<span class="app-stats__color" :style="{ background: row.color }" />
				</td>
				<td>
					<a :href="fileUrl( row.name )" target="_blank">{{ row.name }}</a>
				</td>
				<td class="app-stats__number">
					{{ number( row.requests ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( row.average ) ) }}
				</td>
				<td v-if="hasDuration" class="app-stats__number">
					{{ row.duration ? number( Math.round( row.duration ) ) : '–' }}
				</td>
				<td class="app-stats__number">
					{{ row.size === null ? '?' : number( row.size ) }}
				</td>
				<td>
					{{ row.date ?? '' }}
				</td>
				<td>
					{{ row.mediatype ? row.mediatype.toLowerCase() : '' }}
				</td>
			</tr>
		</tbody>
		<tfoot v-if="rows.length > 1 && store.totals">
			<tr>
				<td />
				<th>{{ $i18n( 'num-files', number( rows.length ), rows.length ) }}</th>
				<td class="app-stats__number">
					{{ number( store.totals.total ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( store.totals.average ) ) }}
				</td>
				<td v-if="hasDuration" class="app-stats__number">
					{{ number( Math.round( sumOf( 'duration' ) ) ) }}
				</td>
				<td class="app-stats__number">
					{{ number( sumOf( 'size' ) ) }}
				</td>
				<td />
				<td />
			</tr>
		</tfoot>
	</table>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMediaviewsStore } from '../../stores/mediaviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';
import { seriesColor } from '../../charts/palette.js';
import { banana } from '../../i18n.js';

const store = useMediaviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const sortKey = ref( 'requests' );
const sortDescending = ref( true );

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const rows = computed( () => {
	const unsorted = store.series.map( ( entry, index ) => {
		const info = store.fileInfo?.[ entry.name ] ?? null;
		return {
			name: entry.name,
			color: seriesColor( index ),
			requests: entry.total,
			average: entry.average,
			duration: info?.duration ?? 0,
			size: info ? info.size ?? 0 : null,
			date: info?.timestamp ?
				formatDate( parseDate( info.timestamp.slice( 0, 10 ) ), {
					locale: banana.locale,
					localize: preferences.localizeDateFormat
				} ) :
				null,
			timestamp: info?.timestamp ?? '',
			mediatype: info?.mediatype ?? null
		};
	} );

	const key = sortKey.value === 'date' ? 'timestamp' : sortKey.value;
	const direction = sortDescending.value ? -1 : 1;
	return unsorted.sort( ( a, b ) => {
		const [ x, y ] = [ a[ key ], b[ key ] ];
		if ( typeof x === 'string' || typeof y === 'string' ) {
			return direction * String( x ?? '' ).localeCompare( String( y ?? '' ) );
		}
		return direction * ( ( x ?? -1 ) - ( y ?? -1 ) );
	} );
} );

// Hidden when no file has a duration (nothing is audio/video), like
// the legacy table.
const hasDuration = computed( () => rows.value.some( ( row ) => row.duration ) );

const columns = computed( () => [
	{ key: 'name', label: banana.i18n( 'file' ), sortable: true },
	{ key: 'requests', label: banana.i18n( 'requests' ), sortable: true },
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true
	},
	...( hasDuration.value ?
		[ { key: 'duration', label: banana.i18n( 'duration' ), sortable: true } ] :
		[]
	),
	{ key: 'size', label: banana.i18n( 'size' ), sortable: true },
	{ key: 'date', label: banana.i18n( 'date' ), sortable: true },
	{ key: 'mediatype', label: banana.i18n( 'file-type' ), sortable: true }
] );

/**
 * The single-file summary line, replacing the table:
 * file · start – end · N requests
 */
const summary = computed( () => {
	if ( store.series.length !== 1 ) {
		return null;
	}
	const [ entry ] = store.series;
	const monthly = settings.dateType === 'monthly';
	const range = [ settings.start, settings.end ]
		.map( ( date ) => formatDate(
			parseDate( date ),
			{ locale: banana.locale, monthly, localize: preferences.localizeDateFormat }
		) )
		.join( ' – ' );

	return {
		name: entry.name,
		dates: range,
		requests: banana.i18n( 'num-requests', number( entry.total ), entry.total )
	};
} );

function sumOf( key ) {
	return rows.value.reduce( ( sum, row ) => sum + ( row[ key ] || 0 ), 0 );
}

function sortBy( key ) {
	if ( sortKey.value === key ) {
		sortDescending.value = !sortDescending.value;
	} else {
		sortKey.value = key;
		// Numbers read best descending first; file names ascending.
		sortDescending.value = key !== 'name';
	}
}

function ariaSort( key ) {
	if ( sortKey.value !== key ) {
		return undefined;
	}
	return sortDescending.value ? 'descending' : 'ascending';
}

function fileUrl( name ) {
	return `https://${ store.project }/wiki/File:` +
		encodeURIComponent( name.replace( / /g, '_' ) );
}
</script>
