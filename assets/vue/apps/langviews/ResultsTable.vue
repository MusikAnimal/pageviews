<template>
	<DataTable
		v-if="rows.length"
		:caption="$i18n( 'langviews-title' )"
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
					<td>{{ $i18n( 'num-languages', number( rows.length ) ) }}</td>
					<td>{{ $i18n( 'unique-titles', number( uniqueTitles ) ) }}</td>
					<td>
						<span
							v-for="( count, badge ) in badgeTotals"
							:key="badge"
							class="app-stats__badge-total"
						>
							<img
								class="app-stats__badge"
								:src="BADGES[ badge ]?.image"
								:alt="badgeName( badge )"
								:title="badgeName( badge )"
							>
							× {{ number( count ) }}
						</span>
					</td>
					<td class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
					<td class="app-stats__number">
						{{ number( Math.round( store.totals.average ) ) }}
					</td>
				</tr>
				<tr
					v-for="( row, index ) in slotProps.rows"
					:key="row.lang"
					class="app-row-bar"
					:style="rowBarStyle( row.sum, maxSum )"
				>
					<th scope="row">
						{{ number( index + 1 ) }}
					</th>
					<td>{{ row.lang }}</td>
					<td>
						<a :href="pageUrl( row )" target="_blank">{{ row.title }}</a>
					</td>
					<td>
						<img
							v-for="badge in row.badges"
							:key="badge"
							class="app-stats__badge"
							:src="BADGES[ badge ]?.image"
							:alt="badgeName( badge )"
							:title="badgeName( badge )"
						>
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
import { useLangviewsStore } from '../../stores/langviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { rowBarStyle } from '../../lib/rowBar.js';
import { BADGES } from '../../lib/wikidata.js';
import { banana } from '../../i18n.js';

const store = useLangviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );
const badgeName = ( badge ) => BADGES[ badge ] ? banana.i18n( BADGES[ badge ].name ) : badge;

const rows = computed( () => store.langData );

// The rows double as a bar chart, shaded relative to the table's
// largest total (see the shared .app-row-bar).
const maxSum = computed( () => rows.value.reduce(
	( max, row ) => Math.max( max, row.sum ), 0
) );

const columns = computed( () => [
	{ key: 'rank', label: '', sortable: false },
	{ key: 'lang', label: banana.i18n( 'language' ), sortable: true },
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	{
		key: 'badges',
		label: banana.i18n( 'badges' ),
		sortable: true,
		sortValue: ( row ) => [ ...row.badges ].sort().join( '' )
	},
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

const uniqueTitles = computed(
	() => new Set( store.langData.map( ( row ) => row.title ) ).size
);

const badgeTotals = computed( () => {
	const counts = {};
	for ( const row of store.langData ) {
		for ( const badge of row.badges ) {
			counts[ badge ] = ( counts[ badge ] || 0 ) + 1;
		}
	}
	return counts;
} );

const family = computed( () => store.project.split( '.' )[ 1 ] );

function pageUrl( row ) {
	return `https://${ row.lang }.${ family.value }.org/wiki/` +
		encodeURIComponent( row.title.replace( / /g, '_' ) );
}

function pageviewsUrl( row ) {
	const query = new URLSearchParams( {
		project: `${ row.lang }.${ family.value }.org`,
		platform: store.platform,
		agent: store.agent,
		start: settings.start,
		end: settings.end,
		pages: row.title.replace( / /g, '_' )
	} );
	return `/pageviews?${ query }`;
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-stats__badge-total {
	margin-inline-end: @spacing-50;
	white-space: nowrap;
}
</style>
