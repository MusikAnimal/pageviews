<template>
	<DataTable
		v-if="rows.length"
		:caption="$i18n( 'massviews-title' )"
		:columns="columns"
		:rows="rows"
		default-sort="month"
	>
		<!-- Custom body to pin the totals row at the top. -->
		<template #tbody="slotProps">
			<tbody>
				<tr v-if="store.totals" class="app-stats__totals">
					<th scope="row">
						{{ $i18n( 'totals' ) }}
					</th>
					<td class="app-stats__number">
						{{ number( store.totals.total ) }}
					</td>
				</tr>
				<tr v-for="row in slotProps.rows" :key="row.month">
					<td>{{ month( row.month ) }}</td>
					<td class="app-stats__number">
						{{ number( row.views ) }}
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
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';
import { banana } from '../../i18n.js';

const store = useMassviewsStore();
const preferences = usePreferencesStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );
const month = ( value ) => formatDate( parseDate( value ), {
	locale: banana.locale,
	monthly: true,
	localize: preferences.localizeDateFormat
} );

const rows = computed( () => store.dates.map( ( date, i ) => ( {
	month: date,
	views: store.counts[ i ]
} ) ) );

const columns = computed( () => [
	// Default-sorted descending: the most recent month first.
	{ key: 'month', label: banana.i18n( 'date' ), sortable: true },
	{ key: 'views', label: banana.i18n( 'views' ), sortable: true, numeric: true }
] );
</script>
