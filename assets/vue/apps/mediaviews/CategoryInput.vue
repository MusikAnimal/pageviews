<template>
	<CdxField class="app-pages" :style="paletteVars">
		<template #label>
			{{ $i18n( 'categories' ) }}
			<span class="app-pages__hint">
				{{ $i18n( 'num-categories-info', String( MAX_CATEGORIES ) ) }}
			</span>
		</template>
		<div class="app-pages__controls">
			<CdxMultiselectLookup
				ref="lookup"
				v-model:input-chips="chips"
				v-model:selected="selected"
				class="app-pages__lookup"
				:menu-items="menuItems"
				:aria-label="$i18n( 'categories' )"
				placeholder="UNESCO"
				@input="onInput"
			/>
			<!-- MultiselectLookup has no clearable prop (unlike
				CdxLookup), so the clear affordance is our own. -->
			<CdxButton
				v-if="chips.length"
				class="app-pages__clear"
				weight="quiet"
				:aria-label="$i18n( 'clear' )"
				@click="clear"
			>
				<CdxIcon :icon="cdxIconClear" />
			</CdxButton>
		</div>
	</CdxField>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxButton, CdxField, CdxIcon, CdxMultiselectLookup } from '@wikimedia/codex';
import { cdxIconClear } from '@wikimedia/codex-icons';
import { MAX_CATEGORIES, useMediaviewsStore } from '../../stores/mediaviews.js';
import { PALETTE, seriesTint } from '../../charts/palette.js';
import { getCommonsCategories } from '../../projects.js';

/**
 * Commons category chips for the Mediaviews categories source. The
 * suggestions filter the Commons Impact Metrics allow-list locally
 * (~1800 entries, fetched once) — only listed categories have data.
 */

// Each chip is tinted with its series color, making the chips double
// as the chart legend (the ECharts legend is disabled).
const paletteVars = Object.fromEntries(
	PALETTE.map( ( rgb, i ) => [ `--pv-series-${ i }`, seriesTint( i ) ] )
);

const store = useMediaviewsStore();
const { categories } = storeToRefs( store );

const displayName = ( name ) => name.replace( /_/g, ' ' );

const chips = ref( categories.value.map( ( name ) => ( { value: displayName( name ) } ) ) );
const selected = ref( categories.value.map( displayName ) );
const menuItems = ref( [] );
const lookup = ref( null );
/** @type {string[]} Display-form allow-list entries. */
let allowList = [];

onMounted( async () => {
	allowList = ( await getCommonsCategories() ).map( displayName );
} );

// Store → component, e.g. after URL-driven changes.
watch( categories, ( names ) => {
	const display = names.map( displayName );
	if ( display.join( '|' ) !== selected.value.join( '|' ) ) {
		selected.value = display;
		chips.value = display.map( ( name ) => ( { value: name } ) );
	}
} );

// Component → store. The chips are the canonical user selection; the
// URL carries underscores like the legacy tool.
watch( chips, ( chipList ) => {
	let names = chipList.map( ( chip ) => String( chip.value ) );
	if ( names.length > MAX_CATEGORIES ) {
		names = names.slice( 0, MAX_CATEGORIES );
		chips.value = names.map( ( name ) => ( { value: name } ) );
		selected.value = names;
		return;
	}
	const underscored = names.map( ( name ) => name.replace( / /g, '_' ) );
	if ( underscored.join( '|' ) !== categories.value.join( '|' ) ) {
		categories.value = underscored;
	}
} );

function clear() {
	chips.value = [];
	selected.value = [];
	menuItems.value = [];
	// Ready for a fresh search (Codex exposes no focus API).
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

/**
 * Case-insensitive substring filter over the allow-list, minus the
 * already-picked categories.
 *
 * @param {string} value
 */
function onInput( value ) {
	if ( !value ) {
		menuItems.value = [];
		return;
	}
	const needle = value.toLowerCase();
	const picked = new Set( selected.value );
	menuItems.value = allowList
		.filter( ( name ) => !picked.has( name ) && name.toLowerCase().includes( needle ) )
		.slice( 0, 50 )
		.map( ( name ) => ( { value: name, label: name } ) );
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-pages {
	// Inline with the bold label, like the legacy tool's muted hint.
	&__hint {
		color: @color-subtle;
		font-weight: @font-weight-normal;
		margin-left: @spacing-25;
	}

	&__controls {
		align-items: flex-start;
		display: flex;
		gap: @spacing-25;
	}

	&__lookup {
		flex: 1;
	}
}

// Tint each chip with its series color (chips precede the text input
// inside the Codex chip container, so nth-child indexes the chips).
// NOTE: each() provides a built-in 1-based @index that shadows any
// custom @index — hence @series for the 0-based palette position.
each( range( 10 ), {
	@series: ( @value - 1 );

	:deep( .cdx-input-chip:nth-child( @{value} ) ) {
		background-color: ~'var( --pv-series-@{series} )';
		// The palette backgrounds are fixed light pastels; keep dark
		// text in both color modes.
		color: #202122;

		.cdx-icon svg {
			// The dismiss icon inherits Codex button/icon colors —
			// near-white in dark mode, invisible on these fixed light
			// pastels. Pin it to the chip text color.
			fill: #202122;
		}
	}
} );
</style>
