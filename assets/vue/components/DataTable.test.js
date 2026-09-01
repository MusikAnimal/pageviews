import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import DataTable from './DataTable.vue';

const COLUMNS = [
	{ key: 'title', label: 'Title', sortable: true },
	{ key: 'views', label: 'Views', sortable: true, numeric: true }
];

// Rows pre-ordered by views descending, matching the default sort.
const rows = ( count ) => Array.from( { length: count }, ( _, i ) => ( {
	title: `Page ${ String( i ).padStart( 3, '0' ) }`,
	views: count - i
} ) );

function mountTable( props = {} ) {
	return mount( DataTable, {
		props: {
			caption: 'Test table',
			columns: COLUMNS,
			rows: rows( 7 ),
			defaultSort: 'views',
			// Tiny windows keep the tests fast; production defaults
			// to 1,000.
			pageSize: 3,
			...props
		},
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'DataTable pagination', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'renders no pager when the rows fit one window', () => {
		const wrapper = mountTable( { rows: rows( 3 ) } );

		expect( wrapper.find( '.app-stats-pager' ).exists() ).toBe( false );
		expect( wrapper.findAll( 'tbody tr' ) ).toHaveLength( 3 );
	} );

	it( 'renders one window at a time and pages through the set', async () => {
		const wrapper = mountTable();
		const cells = () => wrapper.findAll( 'tbody tr td:first-child' )
			.map( ( cell ) => cell.text() );

		expect( wrapper.findAll( 'tbody tr' ) ).toHaveLength( 3 );
		expect( cells()[ 0 ] ).toBe( 'Page 000' );
		expect( wrapper.find( '.app-stats-pager__status' ).text() )
			.toContain( '1' );

		const [ first, previous, next, last ] =
			wrapper.findAll( '.app-stats-pager button' );
		expect( first.attributes( 'disabled' ) ).toBeDefined();
		expect( previous.attributes( 'disabled' ) ).toBeDefined();

		await next.trigger( 'click' );
		expect( cells()[ 0 ] ).toBe( 'Page 003' );

		await last.trigger( 'click' );
		// 7 rows, window of 3: the last window holds one row.
		expect( wrapper.findAll( 'tbody tr' ) ).toHaveLength( 1 );
		expect( cells()[ 0 ] ).toBe( 'Page 006' );
		expect( next.attributes( 'disabled' ) ).toBeDefined();
		expect( last.attributes( 'disabled' ) ).toBeDefined();

		await first.trigger( 'click' );
		expect( cells()[ 0 ] ).toBe( 'Page 000' );
	} );

	it( 'exposes the window and its rank offset to the tbody slot', async () => {
		const wrapper = mount( DataTable, {
			props: {
				caption: 'Test table',
				columns: COLUMNS,
				rows: rows( 7 ),
				defaultSort: 'views',
				pageSize: 3
			},
			slots: {
				tbody: `
					<template #default="sp">
						<tbody>
							<tr v-for="( row, i ) in sp.rows" :key="row.title">
								<td>{{ sp.rankOffset + i + 1 }}: {{ row.title }}</td>
							</tr>
						</tbody>
					</template>
				`
			},
			global: {
				config: {
					globalProperties: { $i18n: ( key ) => key }
				}
			}
		} );

		expect( wrapper.findAll( 'tbody tr' ) ).toHaveLength( 3 );
		expect( wrapper.find( 'tbody td' ).text() ).toBe( '1: Page 000' );

		const [ , , next ] = wrapper.findAll( '.app-stats-pager button' );
		await next.trigger( 'click' );

		// Global rank numbers continue across windows.
		expect( wrapper.find( 'tbody td' ).text() ).toBe( '4: Page 003' );
	} );

	it( 'returns to the first window when the sort changes', async () => {
		const wrapper = mountTable();
		const [ , , next ] = wrapper.findAll( '.app-stats-pager button' );
		await next.trigger( 'click' );
		expect( wrapper.find( 'tbody td' ).text() ).toBe( 'Page 003' );

		// Sort by title ascending via the header button.
		await wrapper.find( 'thead th button' ).trigger( 'click' );
		await nextTick();

		expect( wrapper.find( 'tbody td' ).text() ).toBe( 'Page 000' );
	} );

	it( 'returns to the first window when the rows are replaced', async () => {
		const wrapper = mountTable();
		const [ , , next ] = wrapper.findAll( '.app-stats-pager button' );
		await next.trigger( 'click' );

		await wrapper.setProps( { rows: rows( 5 ) } );

		expect( wrapper.find( 'tbody td' ).text() ).toBe( 'Page 000' );
	} );
} );
