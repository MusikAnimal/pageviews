<template>
	<CdxField class="app-pages" :style="paletteVars">
		<template #label>
			{{ $i18n( 'pages' ) }}
		</template>
		<template #help-text>
			{{ $i18n( 'num-pages-info', String( MAX_PAGES ) ) }}
		</template>
		<div class="app-pages__controls">
			<CdxMultiselectLookup
				ref="lookup"
				v-model:input-chips="chips"
				v-model:selected="selected"
				class="app-pages__lookup"
				:menu-items="menuItems"
				:aria-label="$i18n( 'pages' )"
				:placeholder="$i18n( 'article-placeholder' )"
				@input="onInput"
			/>
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
import { usePageviewsStore } from '../stores/pageviews.js';
import { useSettingsStore } from '../stores/settings.js';
import { useUiStore } from '../stores/ui.js';
import { mwApiGet } from '../lib/mwApi.js';
import { PALETTE, seriesColor } from '../charts/palette.js';
import { banana } from '../i18n.js';

const MAX_PAGES = 10;
const DEBOUNCE_MS = 200;

// Each chip is tinted with its series color, making the chips double as
// the chart legend (the ECharts legend is disabled).
const paletteVars = Object.fromEntries(
	PALETTE.map( ( rgb, i ) => [ `--pv-series-${ i }`, seriesColor( i ) ] )
);

const store = usePageviewsStore();
const settings = useSettingsStore();
const ui = useUiStore();
const { pages } = storeToRefs( store );

const chips = ref( pages.value.map( ( title ) => ( { value: title } ) ) );
const selected = ref( [ ...pages.value ] );
const menuItems = ref( [] );
const lookup = ref( null );

let debounceTimer = null;
let warnedAboutMax = false;

// Store → component, e.g. after URL-driven changes.
watch( pages, ( titles ) => {
	if ( titles.join( '|' ) !== selected.value.join( '|' ) ) {
		selected.value = [ ...titles ];
		chips.value = titles.map( ( title ) => ( { value: title } ) );
	}
} );

// Component → store. The chips are the canonical user selection (the
// selected v-model follows them), enforcing the page cap — legacy
// suggests Massviews for larger sets.
watch( chips, ( chipList ) => {
	let titles = chipList.map( ( chip ) => String( chip.value ) );
	if ( titles.length > MAX_PAGES ) {
		titles = titles.slice( 0, MAX_PAGES );
		chips.value = titles.map( ( title ) => ( { value: title } ) );
		selected.value = titles;
		if ( !warnedAboutMax ) {
			warnedAboutMax = true;
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'massviews-notice', String( MAX_PAGES ), 'Massviews' )
			} );
		}
		return;
	}
	if ( titles.join( '|' ) !== pages.value.join( '|' ) ) {
		pages.value = titles;
	}
} );

/**
 * Remove all selected pages (CdxMultiselectLookup has no clearable
 * prop, unlike CdxLookup).
 */
function clear() {
	chips.value = [];
	selected.value = [];
	menuItems.value = [];
}

// Pages belong to a project: switching projects clears the selection
// and focuses the input for a fresh search (Codex exposes no focus
// API, so reach for the input element directly). When the project was
// cleared rather than changed, focus belongs to the required project
// field instead (ProjectInput handles that).
watch( () => settings.project, ( project ) => {
	clear();
	if ( project ) {
		lookup.value?.$el?.querySelector( 'input' )?.focus();
	}
} );

/**
 * Debounced prefixsearch autocomplete against the current project.
 *
 * @param {string} value
 */
function onInput( value ) {
	clearTimeout( debounceTimer );
	if ( !value ) {
		menuItems.value = [];
		return;
	}
	debounceTimer = setTimeout( async () => {
		try {
			const response = await mwApiGet( settings.project, {
				action: 'query',
				list: 'prefixsearch',
				pssearch: value,
				pslimit: 10,
				cirrusUseCompletionSuggester: 'yes'
			} );
			menuItems.value = ( response.query?.prefixsearch || [] )
				.map( ( { title } ) => ( { value: title, label: title } ) );
		} catch {
			// Autocomplete failures are non-fatal; just show no matches.
			menuItems.value = [];
		}
	}, DEBOUNCE_MS );
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-pages {
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
each( range( 10 ), {
	@index: ( @value - 1 );

	:deep( .cdx-input-chip:nth-child( @{value} ) ) {
		background-color: ~'var( --pv-series-@{index} )';
		// The palette backgrounds are fixed light pastels; keep dark
		// text in both color modes.
		color: #202122;
	}
} );
</style>
