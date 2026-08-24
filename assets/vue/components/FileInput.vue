<template>
	<CdxField class="app-pages" :style="paletteVars">
		<template #label>
			{{ $i18n( 'files' ) }}
			<span class="app-pages__hint">
				{{ $i18n( 'num-files-info', String( MAX_FILES ) ) }}
			</span>
		</template>
		<div class="app-pages__controls">
			<CdxMultiselectLookup
				ref="lookup"
				v-model:input-chips="chips"
				v-model:selected="selected"
				class="app-pages__lookup"
				:menu-items="menuItems"
				:aria-label="$i18n( 'files' )"
				:placeholder="$i18n( 'article-placeholder' )"
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
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxButton, CdxField, CdxIcon, CdxMultiselectLookup } from '@wikimedia/codex';
import { cdxIconClear } from '@wikimedia/codex-icons';
import { MAX_FILES, useMediaviewsStore } from '../stores/mediaviews.js';
import { PALETTE, seriesTint } from '../charts/palette.js';
import { mwApiGet } from '../lib/mwApi.js';
import { createLoadAborter } from '../lib/loadAborter.js';

const DEBOUNCE_MS = 200;

// Each chip is tinted with its series color, making the chips double as
// the chart legend (the ECharts legend is disabled).
const paletteVars = Object.fromEntries(
	PALETTE.map( ( rgb, i ) => [ `--pv-series-${ i }`, seriesTint( i ) ] )
);

const store = useMediaviewsStore();
const { files } = storeToRefs( store );

const displayName = ( name ) => name.replace( /_/g, ' ' );

const chips = ref( files.value.map( ( name ) => ( { value: displayName( name ) } ) ) );
const selected = ref( files.value.map( displayName ) );
const menuItems = ref( [] );
const lookup = ref( null );

let debounceTimer = null;
// Aborts the previous autocomplete request when a new one fires.
const searchAborter = createLoadAborter();

// Store → component, e.g. after URL-driven changes.
watch( files, ( names ) => {
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
	if ( names.length > MAX_FILES ) {
		names = names.slice( 0, MAX_FILES );
		chips.value = names.map( ( name ) => ( { value: name } ) );
		selected.value = names;
		return;
	}
	const underscored = names.map( ( name ) => name.replace( / /g, '_' ) );
	if ( underscored.join( '|' ) !== files.value.join( '|' ) ) {
		files.value = underscored;
	}
} );

function clear() {
	chips.value = [];
	selected.value = [];
	menuItems.value = [];
	// Ready for a fresh search (Codex exposes no focus API).
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

// Files belong to a project: switching clears the selection.
watch( () => store.project, () => {
	chips.value = [];
	selected.value = [];
	menuItems.value = [];
} );

/**
 * Debounced file-name prefix search via list=allimages (like legacy).
 *
 * @param {string} value
 */
function onInput( value ) {
	clearTimeout( debounceTimer );
	if ( !value ) {
		searchAborter.abort();
		menuItems.value = [];
		return;
	}
	debounceTimer = setTimeout( async () => {
		try {
			// allimages is prefix-based and case-sensitive; file names
			// always start uppercase.
			const term = value.charAt( 0 ).toUpperCase() + value.slice( 1 );
			const response = await mwApiGet( store.project, {
				action: 'query',
				list: 'allimages',
				aifrom: term,
				ailimit: 10,
				aiprop: ''
			}, searchAborter.next() );
			menuItems.value = ( response.query?.allimages || [] )
				.map( ( { name } ) => ( {
					value: displayName( name ),
					label: displayName( name )
				} ) );
		} catch ( error ) {
			// Autocomplete failures are non-fatal; just show no matches
			// (an abort means a newer search owns the menu).
			if ( error?.name !== 'AbortError' ) {
				menuItems.value = [];
			}
		}
	}, DEBOUNCE_MS );
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-pages {
	// Inline with the bold label, like the legacy tool's muted hint.
	&__hint {
		color: @color-subtle;
		font-weight: @font-weight-normal;
		margin-inline-start: @spacing-25;
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
