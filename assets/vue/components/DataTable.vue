<template>
	<div ref="root">
		<CdxTable
			class="app-stats-table"
			:caption="caption"
			:hide-caption="true"
			:columns="cdxColumns"
			:data="pagedRows"
			:sort="sortModel"
			@update:sort="sortModel = $event"
		>
			<!-- Forward the app's cell (item-<key>), tbody and tfoot
				templates. Every slot also receives the current window of
				sorted rows plus its rank offset, for custom tbody
				rendering (global rank numbers, pinned totals). -->
			<template
				v-for="name in Object.keys( $slots )"
				#[name]="slotProps"
			>
				<slot
					:name="name"
					v-bind="{ ...slotProps, rows: pagedRows, rankOffset }"
				/>
			</template>
		</CdxTable>
		<!-- Huge result sets (Massviews reaches 20K rows) stall the DOM,
			so only one window of rows renders at a time. Pagination is
			presentational: the full set stays in memory for sorting and
			exports, and the state is runtime-only (resets per query). -->
		<div v-if="pageCount > 1" class="app-stats-pager">
			<span class="app-stats-pager__status">{{ pagerStatus }}</span>
			<CdxButton
				weight="quiet"
				:disabled="currentPage === 0"
				:aria-label="$i18n( 'pager-first' )"
				@click="goTo( 0 )"
			>
				<CdxIcon :icon="cdxIconMoveFirst" />
			</CdxButton>
			<CdxButton
				weight="quiet"
				:disabled="currentPage === 0"
				:aria-label="$i18n( 'pager-previous' )"
				@click="goTo( currentPage - 1 )"
			>
				<CdxIcon :icon="cdxIconPrevious" />
			</CdxButton>
			<CdxButton
				weight="quiet"
				:disabled="currentPage === pageCount - 1"
				:aria-label="$i18n( 'pager-next' )"
				@click="goTo( currentPage + 1 )"
			>
				<CdxIcon :icon="cdxIconNext" />
			</CdxButton>
			<CdxButton
				weight="quiet"
				:disabled="currentPage === pageCount - 1"
				:aria-label="$i18n( 'pager-last' )"
				@click="goTo( pageCount - 1 )"
			>
				<CdxIcon :icon="cdxIconMoveLast" />
			</CdxButton>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { CdxButton, CdxIcon, CdxTable } from '@wikimedia/codex';
import {
	cdxIconMoveFirst,
	cdxIconMoveLast,
	cdxIconNext,
	cdxIconPrevious
} from '@wikimedia/codex-icons';
import { usePreferencesStore } from '../stores/preferences.js';
import { formatNumber } from '../lib/format.js';
import { banana } from '../i18n.js';

/**
 * The sortable stats table the chart apps share: a CdxTable wrapper
 * owning the sort state and comparator, so each app only declares its
 * columns, rows and cell templates.
 */
const props = defineProps( {
	/**
	 * Table caption for assistive technology (visually hidden).
	 */
	caption: {
		type: String,
		required: true
	},
	/**
	 * Column definitions: { key, label, sortable, numeric, sortValue }.
	 * numeric right-aligns the column (CdxTable's number alignment);
	 * sortValue( row ) overrides the default row[ key ] sort accessor.
	 */
	columns: {
		type: Array,
		required: true
	},
	/**
	 * Row objects keyed by column key, carrying raw (unformatted)
	 * values so sorting works; formatting belongs in the cell slots.
	 */
	rows: {
		type: Array,
		required: true
	},
	/**
	 * Column key initially sorted descending — the app's main metric
	 * (views, requests, …).
	 */
	defaultSort: {
		type: String,
		required: true
	},
	/**
	 * Optional controlled sort state ({ key: 'asc'|'desc'|'none' }).
	 * When given (with @update:sort), the parent owns the sort — e.g.
	 * the list apps keep it in their store and thus the URL; when
	 * omitted, the table keeps its own.
	 */
	sort: {
		type: Object,
		default: null
	},
	/**
	 * How many rows render at once (chiefly a testing seam — the
	 * default keeps even a 20K set responsive).
	 */
	pageSize: {
		type: Number,
		default: 1000
	}
} );

const emit = defineEmits( [ 'update:sort' ] );

const root = ref( null );

const internalSort = ref( { [ props.defaultSort ]: 'desc' } );

const sortModel = computed( {
	get: () => props.sort ?? internalSort.value,
	set: ( value ) => {
		internalSort.value = value;
		emit( 'update:sort', value );
	}
} );

const cdxColumns = computed( () => props.columns.map( ( column ) => ( {
	id: column.key,
	label: column.label ?? '',
	allowSort: Boolean( column.sortable ),
	...( column.numeric ? { textAlign: 'number' } : {} )
} ) ) );

// CdxTable only renders the sort UI; ordering the rows is ours.
const sortedRows = computed( () => {
	const [ key ] = Object.keys( sortModel.value );
	const order = sortModel.value[ key ];
	if ( !key || order === 'none' ) {
		return props.rows;
	}
	const column = props.columns.find( ( entry ) => entry.key === key );
	const accessor = column?.sortValue ?? ( ( row ) => row[ key ] );
	const direction = order === 'desc' ? -1 : 1;
	return [ ...props.rows ].sort( ( a, b ) => {
		const [ x, y ] = [ accessor( a ), accessor( b ) ];
		if ( typeof x === 'string' || typeof y === 'string' ) {
			return direction * String( x ?? '' ).localeCompare( String( y ?? '' ) );
		}
		// Missing values (pending or unavailable data) sort below zero.
		return direction * ( ( x ?? -1 ) - ( y ?? -1 ) );
	} );
} );

const page = ref( 0 );
const pageCount = computed(
	() => Math.max( 1, Math.ceil( sortedRows.value.length / props.pageSize ) )
);
// Clamped rather than mutated, so a shrinking set can't strand the
// window out of range.
const currentPage = computed( () => Math.min( page.value, pageCount.value - 1 ) );
const rankOffset = computed( () => currentPage.value * props.pageSize );
const pagedRows = computed( () => sortedRows.value.slice(
	rankOffset.value, rankOffset.value + props.pageSize
) );

// A new query or a re-sort starts back at the first window.
watch( [ () => props.rows, sortModel ], () => {
	page.value = 0;
} );

const preferences = usePreferencesStore();
const pagerStatus = computed( () => {
	const number = ( value ) => formatNumber(
		value, banana.locale, preferences.numericalFormatting
	);
	return banana.i18n(
		'pager-status',
		number( rankOffset.value + 1 ),
		number( rankOffset.value + pagedRows.value.length ),
		number( sortedRows.value.length )
	);
} );

/**
 * Show another window, with the table's top edge back in view — the
 * user was likely at the bottom when they clicked.
 *
 * @param {number} target
 */
function goTo( target ) {
	page.value = target;
	root.value?.scrollIntoView?.( { block: 'nearest' } );
}
</script>
