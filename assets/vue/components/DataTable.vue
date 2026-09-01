<template>
	<div ref="root">
		<!-- The framing rows: the top one holds the filter, the app's
			toolbar (export buttons) and a pager; the bottom one holds
			the app's inline messages and the pager again. -->
		<div v-if="searchable || $slots.toolbar" class="app-stats-toolbar">
			<CdxSearchInput
				v-if="searchable"
				v-model="searchQuery"
				class="app-stats-toolbar__search"
				:clearable="true"
				:aria-label="$i18n( 'search' )"
				:placeholder="$i18n( 'search' )"
			/>
			<slot name="toolbar" />
			<TablePager
				v-if="pageCount > 1"
				:page="currentPage"
				:page-count="pageCount"
				:status="pagerStatus"
				@go="goTo"
			/>
		</div>
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
				v-for="name in tableSlots"
				#[name]="slotProps"
			>
				<slot
					:name="name"
					v-bind="{ ...slotProps, rows: pagedRows, rankOffset }"
				/>
			</template>
		</CdxTable>
		<div v-if="pageCount > 1 || $slots.footer" class="app-stats-footer">
			<slot name="footer" />
			<TablePager
				v-if="pageCount > 1"
				:page="currentPage"
				:page-count="pageCount"
				:status="pagerStatus"
				@go="goTo"
			/>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, useSlots, watch } from 'vue';
import { CdxSearchInput, CdxTable } from '@wikimedia/codex';
import { usePreferencesStore } from '../stores/preferences.js';
import { formatNumber } from '../lib/format.js';
import { banana } from '../i18n.js';
import TablePager from './TablePager.vue';

/**
 * The sortable stats table the chart apps share: a CdxTable wrapper
 * owning the sort state and comparator, so each app only declares its
 * columns, rows and cell templates. Large sets (the list apps) gain a
 * filter and a bounded window with pagers.
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
const slots = useSlots();

// The framing-row slots are ours; everything else forwards into
// CdxTable (cell templates, the custom tbody).
const tableSlots = computed( () => Object.keys( slots )
	.filter( ( name ) => ![ 'toolbar', 'footer' ].includes( name ) ) );

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

/**
 * The filter appears with the pagination threshold — a set that fits
 * one window is scannable (and Ctrl+F-able) as is. Judged on the
 * unfiltered rows so it doesn't vanish while narrowing.
 */
const searchQuery = ref( '' );
const searchable = computed( () => props.rows.length > props.pageSize );
const filteredRows = computed( () => {
	const needle = searchQuery.value.trim().toLowerCase();
	if ( !searchable.value || !needle ) {
		return props.rows;
	}
	// Case-insensitive substring match over the string-valued cells
	// (titles, languages, user names — never the counts).
	return props.rows.filter( ( row ) => props.columns.some( ( column ) => {
		const value = row[ column.key ];
		return typeof value === 'string' && value.toLowerCase().includes( needle );
	} ) );
} );

// CdxTable only renders the sort UI; ordering the rows is ours.
const sortedRows = computed( () => {
	const [ key ] = Object.keys( sortModel.value );
	const order = sortModel.value[ key ];
	if ( !key || order === 'none' ) {
		return filteredRows.value;
	}
	const column = props.columns.find( ( entry ) => entry.key === key );
	const accessor = column?.sortValue ?? ( ( row ) => row[ key ] );
	const direction = order === 'desc' ? -1 : 1;
	return [ ...filteredRows.value ].sort( ( a, b ) => {
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

// A new query, a re-sort or a new filter starts back at the first
// window.
watch( [ () => props.rows, sortModel, searchQuery ], () => {
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
 * Show another window, with the top of the list back in view — the
 * user was likely at the bottom when they clicked.
 *
 * @param {number} target
 */
function goTo( target ) {
	page.value = target;
	root.value?.scrollIntoView?.( { block: 'start' } );
}
</script>
