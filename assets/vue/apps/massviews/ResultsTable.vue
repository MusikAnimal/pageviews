<template>
	<DataTable
		v-if="rows.length"
		:caption="$i18n( 'massviews-title' )"
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
					<td>{{ $i18n( 'num-pages', number( rows.length ), rows.length ) }}</td>
					<td class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
					<td v-if="isWikiproject" colspan="2" />
					<td class="app-stats__number">
						{{ number( Math.round( store.totals.average ) ) }}
					</td>
				</tr>
				<!-- Hashtag results span wikis, so titles alone can
					collide across rows. -->
				<tr
					v-for="( row, index ) in slotProps.rows"
					:key="`${ row.project }|${ row.title }`"
					class="app-row-bar"
					:style="rowBarStyle( row.sum, maxSum )"
				>
					<th scope="row">
						{{ number( index + 1 ) }}
					</th>
					<td>
						<a :href="pageUrl( row )" target="_blank">{{ row.title }}</a>
					</td>
					<td class="app-stats__number">
						<a :href="pageviewsUrl( row )" target="_blank">{{ number( row.sum ) }}</a>
					</td>
					<!-- WikiProject source only: the page's quality class
						and importance, linked to their assessment categories
						on the wiki (like the on-wiki Popular pages reports
						this replaces). -->
					<td v-if="isWikiproject">
						<template v-if="meta( row )?.assessment">
							<img
								v-if="meta( row ).assessment.badge"
								class="app-stats__badge"
								:src="meta( row ).assessment.badge"
								alt=""
							><a
								v-if="meta( row ).assessment.category"
								:href="categoryUrl( meta( row ).assessment.category )"
								target="_blank"
							>{{ meta( row ).assessment.class }}</a>
							<template v-else>
								{{ meta( row ).assessment.class }}
							</template>
						</template>
					</td>
					<td v-if="isWikiproject">
						<template v-if="meta( row )?.importance">
							<a
								v-if="meta( row ).importance.category"
								:href="categoryUrl( meta( row ).importance.category )"
								target="_blank"
							>{{ meta( row ).importance.importance }}</a>
							<template v-else>
								{{ meta( row ).importance.importance }}
							</template>
						</template>
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
import { useMassviewsStore } from '../../stores/massviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { rowBarStyle } from '../../lib/rowBar.js';
import { banana } from '../../i18n.js';

const store = useMassviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const rows = computed( () => store.pagesData );

// The rows double as a bar chart, shaded relative to the table's
// largest total (see the shared .app-row-bar).
const maxSum = computed( () => rows.value.reduce(
	( max, row ) => Math.max( max, row.sum ), 0
) );

const isWikiproject = computed( () => store.source === 'wikiproject' );

const columns = computed( () => [
	{ key: 'rank', label: '', sortable: false },
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	{
		key: 'views',
		label: banana.i18n( 'pageviews' ),
		sortable: true,
		numeric: true,
		sortValue: ( row ) => row.sum
	},
	// Quality columns for the WikiProject source, sorted by the
	// server-provided weights (unassessed pages sort last).
	...( isWikiproject.value ? [
		{
			key: 'assessment',
			label: banana.i18n( 'assessment' ),
			sortable: true,
			sortValue: ( row ) => meta( row )?.assessment?.weight ?? null
		},
		{
			key: 'importance',
			label: banana.i18n( 'importance' ),
			sortable: true,
			sortValue: ( row ) => meta( row )?.importance?.weight ?? null
		}
	] : [] ),
	{ key: 'average', label: banana.i18n( 'daily-average' ), sortable: false, numeric: true }
] );

/**
 * The WikiProject source's per-page assessment data, keyed by the
 * display title in the store.
 *
 * @param {Object} row
 * @return {?{assessment: ?Object, importance: ?Object}}
 */
function meta( row ) {
	return store.pageMeta[ row.title ];
}

/**
 * @param {string} category e.g. 'Category:FA-Class articles' (always
 *   prefixed, in the wiki's own language).
 * @return {string}
 */
function categoryUrl( category ) {
	return `https://${ store.project }/wiki/` +
		encodeURIComponent( category.replace( / /g, '_' ) );
}

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

function pageUrl( row ) {
	return `https://${ row.project }/wiki/` +
		encodeURIComponent( row.title.replace( / /g, '_' ) );
}

function pageviewsUrl( row ) {
	const query = new URLSearchParams( {
		project: row.project,
		platform: store.platform,
		agent: store.agent,
		start: settings.start,
		end: settings.end,
		pages: row.title.replace( / /g, '_' )
	} );
	return `/pageviews?${ query }`;
}
</script>
