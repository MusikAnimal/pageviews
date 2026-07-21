<template>
	<table v-if="rows.length" class="app-stats">
		<thead>
			<tr>
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
					<a :href="pageUrl( row.title )" target="_blank">{{ row.title }}</a>
				</td>
				<td>{{ row.assessment ?? '' }}</td>
				<td class="app-stats__number">
					{{ number( row.views ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( row.average ) ) }}
				</td>
				<td class="app-stats__number">
					{{ row.edits === null ? '' : number( row.edits ) }}
				</td>
				<td class="app-stats__number">
					{{ row.editors === null ? '' : number( row.editors ) }}
				</td>
				<td>
					<a :href="historyUrl( row.title )" target="_blank">
						{{ $i18n( 'revisions' ) }}
					</a>
				</td>
			</tr>
		</tbody>
		<tfoot v-if="rows.length > 1 && store.totals">
			<tr>
				<th>{{ $i18n( 'totals' ) }}</th>
				<td />
				<td class="app-stats__number">
					{{ number( store.totals.total ) }}
				</td>
				<td class="app-stats__number">
					{{ number( Math.round( store.totals.average ) ) }}
				</td>
				<td class="app-stats__number">
					{{ editTotals ? number( editTotals.num_edits ) : '' }}
				</td>
				<td class="app-stats__number">
					{{ editTotals ? number( editTotals.num_users ) : '' }}
				</td>
				<td />
			</tr>
		</tfoot>
	</table>
</template>

<script setup>
import { computed, ref } from 'vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { banana } from '../../i18n.js';

const store = usePageviewsStore();
const settings = useSettingsStore();

const sortKey = ref( 'views' );
const sortDescending = ref( true );

const number = ( value ) => formatNumber( value, banana.locale );

const columns = computed( () => [
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	{ key: 'assessment', label: banana.i18n( 'class' ), sortable: true },
	{ key: 'views', label: banana.i18n( 'views' ), sortable: true },
	{
		key: 'average',
		label: banana.i18n( settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average' ),
		sortable: true
	},
	{ key: 'edits', label: banana.i18n( 'edits' ), sortable: true },
	{ key: 'editors', label: banana.i18n( 'editors' ), sortable: true },
	{ key: 'links', label: banana.i18n( 'links' ), sortable: false }
] );

const rows = computed( () => {
	const unsorted = store.series.map( ( page ) => {
		const edits = store.editData?.[ page.title ] ?? null;
		return {
			title: page.title,
			assessment: edits?.assessment ?? null,
			views: page.total,
			average: page.average,
			edits: edits ? Number( edits.num_edits ) : null,
			editors: edits ? Number( edits.num_users ) : null
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

const editTotals = computed( () => store.editData?.totals ?? null );

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
	return `https://${ settings.project }/wiki/${ encodeURIComponent( title.replace( / /g, '_' ) ) }`;
}

function historyUrl( title ) {
	return `https://${ settings.project }/w/index.php?title=` +
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
</style>
