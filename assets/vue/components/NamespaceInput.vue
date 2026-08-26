<template>
	<CdxField class="app-settings__namespace">
		<template #label>
			{{ $i18n( 'namespace' ) }}
		</template>
		<CdxSelect
			v-model:selected="namespace"
			:menu-items="namespaceItems"
			:menu-config="{ visibleItemLimit: 10 }"
			:aria-label="$i18n( 'namespace' )"
		/>
	</CdxField>
</template>

<script setup>
import { ref, watch } from 'vue';
import { CdxField, CdxSelect } from '@wikimedia/codex';
import { getSiteinfo } from '../projects.js';
import { banana } from '../i18n.js';

/**
 * Namespace selector: 'all', or a namespace ID as a string. The
 * options come from the project's siteinfo, in its own language.
 */
const namespace = defineModel( {
	type: String,
	required: true
} );

const props = defineProps( {
	// The wiki whose namespaces to offer.
	project: {
		type: String,
		required: true
	},
	// What the selection returns to when the project changes (the
	// IDs are per-wiki beyond the core set). The initial load never
	// resets, so a URL-provided namespace survives.
	resetTo: {
		type: String,
		default: 'all'
	}
} );

const namespaceItems = ref( [
	{ value: 'all', label: banana.i18n( 'all' ) },
	{ value: '0', label: banana.i18n( 'main' ) }
] );

watch( () => props.project, ( domain ) => {
	namespace.value = props.resetTo;
	loadNamespaces( domain );
} );
loadNamespaces( props.project );

async function loadNamespaces( domain ) {
	const siteinfo = await getSiteinfo( domain );
	// The project may have changed while the siteinfo loaded.
	if ( domain !== props.project || !siteinfo?.namespaces ) {
		return;
	}
	namespaceItems.value = [
		{ value: 'all', label: banana.i18n( 'all' ) },
		...Object.keys( siteinfo.namespaces )
			.map( Number )
			.filter( ( ns ) => ns >= 0 )
			.sort( ( a, b ) => a - b )
			.map( ( ns ) => ( {
				value: String( ns ),
				label: siteinfo.namespaces[ ns ][ '*' ] || banana.i18n( 'main' )
			} ) )
	];
}
</script>
