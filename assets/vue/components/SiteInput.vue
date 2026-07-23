<template>
	<CdxField
		class="app-pages"
		:style="paletteVars"
		:disabled="disabled"
	>
		<template #label>
			{{ $i18n( 'projects' ) }}
			<span class="app-pages__hint">
				{{ $i18n( 'num-projects-info', String( MAX_SITES ) ) }}
			</span>
		</template>
		<div class="app-pages__controls">
			<CdxMultiselectLookup
				ref="lookup"
				v-model:input-chips="chips"
				v-model:selected="selected"
				class="app-pages__lookup"
				:menu-items="menuItems"
				:disabled="disabled"
				:aria-label="$i18n( 'projects' )"
				:placeholder="$i18n( 'projects-placeholder' )"
				@input="onInput"
			/>
			<!-- MultiselectLookup has no clearable prop (unlike
				CdxLookup), so the clear affordance is our own. -->
			<CdxButton
				v-if="chips.length && !disabled"
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
import { MAX_SITES, useSiteviewsStore } from '../stores/siteviews.js';
import { useUiStore } from '../stores/ui.js';
import { PALETTE, seriesColor } from '../charts/palette.js';
import { getProjects } from '../projects.js';
import { banana } from '../i18n.js';

defineProps( {
	/**
	 * Disabled in all-projects mode: the aggregate replaces the
	 * individual site selection.
	 */
	disabled: {
		type: Boolean,
		default: false
	}
} );

// Each chip is tinted with its series color, making the chips double as
// the chart legend (the ECharts legend is disabled).
const paletteVars = Object.fromEntries(
	PALETTE.map( ( rgb, i ) => [ `--pv-series-${ i }`, seriesColor( i ) ] )
);

const store = useSiteviewsStore();
const ui = useUiStore();
const { sites } = storeToRefs( store );

const visibleSites = () => sites.value.filter( ( site ) => site !== 'all-projects' );

const chips = ref( visibleSites().map( ( site ) => ( { value: site } ) ) );
const selected = ref( visibleSites() );
const menuItems = ref( [] );
const lookup = ref( null );
// All valid site domains, filtered locally (no API round-trips).
const domains = ref( [] );

let warnedAboutMax = false;

onMounted( async () => {
	domains.value = Object.keys( await getProjects() )
		.map( ( projectId ) => `${ projectId }.org` );
} );

// Store → component, e.g. after URL-driven changes. The all-projects
// pseudo-site never renders as a chip.
watch( sites, () => {
	const titles = visibleSites();
	if ( titles.join( '|' ) !== selected.value.join( '|' ) ) {
		selected.value = [ ...titles ];
		chips.value = titles.map( ( site ) => ( { value: site } ) );
	}
} );

// Component → store. The chips are the canonical user selection.
watch( chips, ( chipList ) => {
	let domainList = chipList.map( ( chip ) => String( chip.value ) );
	if ( domainList.length > MAX_SITES ) {
		domainList = domainList.slice( 0, MAX_SITES );
		chips.value = domainList.map( ( site ) => ( { value: site } ) );
		selected.value = domainList;
		if ( !warnedAboutMax ) {
			warnedAboutMax = true;
			ui.notify( {
				type: 'warning',
				text: banana.i18n( 'num-projects-info', String( MAX_SITES ) )
			} );
		}
		return;
	}
	if ( store.isAllProjects ) {
		return;
	}
	if ( domainList.join( '|' ) !== sites.value.join( '|' ) ) {
		sites.value = domainList;
	}
} );

function clear() {
	chips.value = [];
	selected.value = [];
	menuItems.value = [];
	// Ready for a fresh search (Codex exposes no focus API).
	lookup.value?.$el?.querySelector( 'input' )?.focus();
}

function onInput( value ) {
	if ( !value ) {
		menuItems.value = [];
		return;
	}
	menuItems.value = domains.value
		.filter( ( domain ) => domain.includes( value.toLowerCase() ) )
		.slice( 0, 10 )
		.map( ( domain ) => ( { value: domain, label: domain } ) );
}
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-pages {
	// Inline with the bold label, like the legacy tool's muted
	// num-entities-info hint.
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
	}
} );
</style>
