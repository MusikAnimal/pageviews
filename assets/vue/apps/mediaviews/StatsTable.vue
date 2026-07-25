<template>
	<p v-if="summary" class="app-page-summary">
		<a :href="summary.url" target="_blank">{{ summary.name }}</a>
		·
		<span class="app-page-summary__dates">{{ summary.dates }}</span>
		·
		<strong>{{ summary.requests }}</strong>
	</p>
	<DataTable
		v-else-if="rows.length"
		:caption="$i18n( 'mediaviews-title' )"
		:columns="columns"
		:rows="rows"
		default-sort="requests"
	>
		<template #item-color="{ item }">
			<span class="app-stats__color" :style="{ background: item }" />
		</template>
		<template #item-name="{ item }">
			<a :href="nameUrl( item )" target="_blank">{{ item }}</a>
		</template>
		<template #item-requests="{ item }">
			{{ number( item ) }}
		</template>
		<template #item-average="{ item }">
			{{ number( Math.round( item ) ) }}
		</template>
		<template #item-duration="{ item }">
			{{ item ? number( Math.round( item ) ) : '–' }}
		</template>
		<template #item-size="{ item }">
			{{ item === null ? '?' : number( item ) }}
		</template>
		<template #item-date="{ item }">
			{{ item ?? '' }}
		</template>
		<template #item-mediatype="{ item }">
			{{ item ? item.toLowerCase() : '' }}
		</template>
		<template v-if="rows.length > 1 && store.totals" #tfoot>
			<tfoot>
				<tr v-if="categoriesSource">
					<td />
					<th>{{ $i18n( 'num-categories', number( rows.length ), rows.length ) }}</th>
					<td class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
					<td class="app-stats__number">
						{{ number( Math.round( store.totals.average ) ) }}
					</td>
				</tr>
				<tr v-else>
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
		</template>
	</DataTable>
</template>

<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
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

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const categoriesSource = computed( () => store.source === 'categories' );

const rows = computed( () => store.series.map( ( entry, index ) => {
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
} ) );

// Hidden when no file has a duration (nothing is audio/video), like
// the legacy table.
const hasDuration = computed( () => rows.value.some( ( row ) => row.duration ) );

const columns = computed( () => categoriesSource.value ?
	[
		{ key: 'color', label: '', sortable: false },
		{ key: 'name', label: banana.i18n( 'category' ), sortable: true },
		{ key: 'requests', label: banana.i18n( 'pageviews' ), sortable: true, numeric: true },
		{
			key: 'average',
			label: banana.i18n( 'monthly-average' ),
			sortable: true,
			numeric: true
		}
	] :
	[
		{ key: 'color', label: '', sortable: false },
		{ key: 'name', label: banana.i18n( 'file' ), sortable: true },
		{ key: 'requests', label: banana.i18n( 'requests' ), sortable: true, numeric: true },
		{
			key: 'average',
			label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
			sortable: true,
			numeric: true
		},
		...( hasDuration.value ?
			[ { key: 'duration', label: banana.i18n( 'duration' ), sortable: true, numeric: true } ] :
			[]
		),
		{ key: 'size', label: banana.i18n( 'size' ), sortable: true, numeric: true },
		{
			key: 'date',
			label: banana.i18n( 'date' ),
			sortable: true,
			// The visible date is localized; sort by the raw timestamp.
			sortValue: ( row ) => row.timestamp
		},
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
		// The categories source counts pageviews, not mediarequests.
		url: nameUrl( entry.name ),
		dates: range,
		requests: banana.i18n(
			categoriesSource.value ? 'num-pageviews' : 'num-requests',
			number( entry.total ),
			entry.total
		)
	};
} );

function sumOf( key ) {
	return rows.value.reduce( ( sum, row ) => sum + ( row[ key ] || 0 ), 0 );
}

/**
 * The entry's page: a file description page, or (categories source)
 * the Commons category.
 *
 * @param {string} name
 * @return {string}
 */
function nameUrl( name ) {
	if ( categoriesSource.value ) {
		return 'https://commons.wikimedia.org/wiki/Category:' +
			encodeURIComponent( name.replace( / /g, '_' ) );
	}
	return `https://${ store.project }/wiki/File:` +
		encodeURIComponent( name.replace( / /g, '_' ) );
}
</script>
