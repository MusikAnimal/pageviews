<template>
	<CdxField class="app-pages" :style="paletteVars">
		<template #label>
			{{ $i18n( 'pages' ) }}
			<span class="app-pages__hint">
				{{ $i18n( 'num-pages-info', String( MAX_PAGES ) ) }}
			</span>
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
			<!-- MultiselectLookup has no clearable prop (unlike
				CdxLookup), so the clear affordance is our own. -->
			<CdxButton
				v-if="chips.length"
				class="app-pages__clear"
				weight="quiet"
				:aria-label="$i18n( 'clear' )"
				@click="onClearClick"
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
import { usePreferencesStore } from '../stores/preferences.js';
import { useUiStore } from '../stores/ui.js';
import { mwApiGet } from '../lib/mwApi.js';
import { createLoadAborter } from '../lib/loadAborter.js';
import { PALETTE, seriesTint } from '../charts/palette.js';
import { banana } from '../i18n.js';

const MAX_PAGES = 10;
const DEBOUNCE_MS = 200;

// Each chip is tinted with its series color, making the chips double as
// the chart legend (the ECharts legend is disabled).
const paletteVars = Object.fromEntries(
	PALETTE.map( ( rgb, i ) => [ `--pv-series-${ i }`, seriesTint( i ) ] )
);

const store = usePageviewsStore();
const preferences = usePreferencesStore();
const ui = useUiStore();
const { pages } = storeToRefs( store );

const chips = ref( pages.value.map( ( title ) => ( { value: title } ) ) );
const selected = ref( [ ...pages.value ] );
const menuItems = ref( [] );
const lookup = ref( null );

let debounceTimer = null;
// Aborts the previous autocomplete request when a new one fires.
const searchAborter = createLoadAborter();
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

function focusInput() {
	// Codex exposes no focus API; reach for the input element directly.
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

/**
 * The clear button empties the selection and readies the input for a
 * fresh search.
 */
function onClearClick() {
	clear();
	focusInput();
}

// Pages belong to a project: switching projects clears the selection
// and focuses the input for a fresh search (Codex exposes no focus
// API, so reach for the input element directly). When the project was
// cleared rather than changed, focus belongs to the required project
// field instead (ProjectInput handles that).
watch( () => store.project, ( project ) => {
	clear();
	if ( project ) {
		focusInput();
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
		searchAborter.abort();
		menuItems.value = [];
		return;
	}
	debounceTimer = setTimeout( async () => {
		try {
			// The redirects mode surfaces redirect titles among the
			// suggestions (slower; a user preference, like legacy).
			const withRedirects = preferences.autocomplete === 'autocomplete_redirects';
			const response = await mwApiGet( store.project, withRedirects ?
				{
					action: 'query',
					generator: 'prefixsearch',
					gpssearch: value,
					gpslimit: 10,
					redirects: true,
					cirrusUseCompletionSuggester: 'no'
				} :
				{
					action: 'query',
					list: 'prefixsearch',
					pssearch: value,
					pslimit: 10,
					cirrusUseCompletionSuggester: 'yes'
				},
			searchAborter.next()
			);
			const results = withRedirects ?
				response.query?.pages || [] :
				response.query?.prefixsearch || [];
			menuItems.value = results
				.map( ( { title } ) => ( { value: title, label: title } ) );
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
	// Inline with the bold "Pages" label, like the legacy tool's
	// muted num-entities-info hint.
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
