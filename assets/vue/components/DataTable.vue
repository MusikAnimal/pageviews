<template>
	<CdxTable
		class="app-stats-table"
		:caption="caption"
		:hide-caption="true"
		:columns="cdxColumns"
		:data="sortedRows"
		:sort="sort"
		@update:sort="sort = $event"
	>
		<!-- Forward the app's cell (item-<key>) and tfoot templates. -->
		<template
			v-for="name in Object.keys( $slots )"
			#[name]="slotProps"
		>
			<slot :name="name" v-bind="slotProps" />
		</template>
	</CdxTable>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CdxTable } from '@wikimedia/codex';

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
	}
} );

const sort = ref( { [ props.defaultSort ]: 'desc' } );

const cdxColumns = computed( () => props.columns.map( ( column ) => ( {
	id: column.key,
	label: column.label ?? '',
	allowSort: Boolean( column.sortable ),
	...( column.numeric ? { textAlign: 'number' } : {} )
} ) ) );

// CdxTable only renders the sort UI; ordering the rows is ours.
const sortedRows = computed( () => {
	const [ key ] = Object.keys( sort.value );
	const order = sort.value[ key ];
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
</script>
