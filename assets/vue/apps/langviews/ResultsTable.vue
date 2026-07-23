<template>
	<table v-if="rows.length" class="app-stats">
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
			<tr v-for="( row, index ) in rows" :key="row.lang">
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
		<tfoot v-if="store.totals">
			<tr>
				<th>{{ $i18n( 'totals' ) }}</th>
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
		</tfoot>
	</table>
</template>

<script setup>
import { computed } from 'vue';
import { useLangviewsStore } from '../../stores/langviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { BADGES } from '../../lib/wikidata.js';
import { banana } from '../../i18n.js';

const store = useLangviewsStore();
const preferences = usePreferencesStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );
const badgeName = ( badge ) => BADGES[ badge ] ? banana.i18n( BADGES[ badge ].name ) : badge;

const columns = computed( () => [
	{ key: 'lang', label: banana.i18n( 'language' ), sortable: true },
	{ key: 'title', label: banana.i18n( 'page-title' ), sortable: true },
	{ key: 'badges', label: banana.i18n( 'badges' ), sortable: true },
	{ key: 'views', label: banana.i18n( 'views' ), sortable: true },
	{ key: 'average', label: banana.i18n( 'average' ), sortable: false }
] );

// Sort state lives in the store (and thus the URL), legacy-style.
const rows = computed( () => {
	const accessor = {
		lang: ( row ) => row.lang,
		title: ( row ) => row.title,
		badges: ( row ) => [ ...row.badges ].sort().join( '' ),
		views: ( row ) => row.sum
	}[ store.sort ];
	const direction = store.direction === '1' ? -1 : 1;
	return [ ...store.langData ].sort( ( a, b ) => {
		const [ x, y ] = [ accessor( a ), accessor( b ) ];
		if ( typeof x === 'string' ) {
			return direction * x.localeCompare( y );
		}
		return direction * ( x - y );
	} );
} );

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

function sortBy( key ) {
	if ( store.sort === key ) {
		store.direction = store.direction === '1' ? '-1' : '1';
	} else {
		store.sort = key;
		// Numbers read best descending first; text ascending.
		store.direction = [ 'views' ].includes( key ) ? '1' : '-1';
	}
}

function ariaSort( key ) {
	if ( store.sort !== key ) {
		return undefined;
	}
	return store.direction === '1' ? 'descending' : 'ascending';
}

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
	margin-right: @spacing-50;
	white-space: nowrap;
}
</style>
