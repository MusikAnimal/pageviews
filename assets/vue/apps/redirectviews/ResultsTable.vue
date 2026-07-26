<template>
	<DataTable
		v-if="rows.length"
		:caption="$i18n( 'redirectviews-title' )"
		:columns="columns"
		:rows="rows"
		default-sort="views"
		:sort="sort"
		@update:sort="onSort"
	>
		<!-- Custom body: CdxTable's generated one can't pin the totals
			row at the top or number the rows by display position. -->
		<template #tbody="slotProps">
			<tbody>
				<tr v-if="store.totals" class="app-stats__totals">
					<th scope="row">
						{{ $i18n( 'totals' ) }}
					</th>
					<td>
						{{ $i18n( 'num-redirects', number( rows.length - 1 ), rows.length - 1 ) }}
					</td>
					<td>{{ $i18n( 'num-sections', number( sectionCount ), sectionCount ) }}</td>
					<td class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
					<td class="app-stats__number">
						{{ number( Math.round( store.totals.average ) ) }}
					</td>
				</tr>
				<tr v-for="( row, index ) in slotProps.rows" :key="row.title">
					<th scope="row">
						{{ number( index + 1 ) }}
					</th>
					<td>
						<a :href="pageUrl( row.title )" target="_blank">{{ row.title }}</a>
						<span v-if="row.isTarget" class="app-stats__muted">
							({{ $i18n( 'target' ) }})
						</span>
					</td>
					<td>
						<a
							v-if="row.section"
							:href="sectionUrl( row.section )"
							target="_blank"
						>{{ row.section }}</a>
					</td>
					<td class="app-stats__number">
						<a :href="pageviewsUrl( row )" target="_blank">{{ number( row.sum ) }}</a>
					</td>
					<td class="app-stats__number">
						{{ number( Math.round( row.average ) ) }}
					</td>
				</tr>
			</tbody>
		</template>
	</DataTable>
</template>

<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import { useRedirectviewsStore } from '../../stores/redirectviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { banana } from '../../i18n.js';

const store = useRedirectviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const rows = computed( () => store.redirectData );

const columns = computed( () => [
	{ key: 'rank', label: '', sortable: false },
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	{ key: 'section', label: banana.i18n( 'section' ), sortable: true },
	{
		key: 'views',
		label: banana.i18n( 'pageviews' ),
		sortable: true,
		numeric: true,
		sortValue: ( row ) => row.sum
	},
	{ key: 'average', label: banana.i18n( 'daily-average' ), sortable: false, numeric: true }
] );

/**
 * Sort state lives in the store (and thus the URL), legacy-style:
 * sort=<column>&direction=1|-1, where 1 is descending.
 */
const sort = computed(
	() => ( { [ store.sort ]: store.direction === '1' ? 'desc' : 'asc' } )
);

function onSort( value ) {
	const [ key ] = Object.keys( value );
	const order = value[ key ];
	if ( order === 'none' ) {
		// The URL params have no unsorted state: keep toggling instead.
		store.direction = store.direction === '1' ? '-1' : '1';
		return;
	}
	store.sort = key;
	store.direction = order === 'desc' ? '1' : '-1';
}

const sectionCount = computed(
	() => rows.value.filter( ( row ) => row.section ).length
);

function pageUrl( title ) {
	return `https://${ store.project }/wiki/` +
		encodeURIComponent( title.replace( / /g, '_' ) );
}

/**
 * Redirect fragments point at sections of the target page.
 *
 * @param {string} section
 * @return {string}
 */
function sectionUrl( section ) {
	return `${ pageUrl( store.page ) }#${ encodeURIComponent( section.replace( / /g, '_' ) ) }`;
}

function pageviewsUrl( row ) {
	const query = new URLSearchParams( {
		project: store.project,
		platform: store.platform,
		agent: store.agent,
		start: settings.start,
		end: settings.end,
		pages: row.title.replace( / /g, '_' )
	} );
	return `/pageviews?${ query }`;
}
</script>
