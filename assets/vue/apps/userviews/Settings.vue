<template>
	<!-- Codex buttons default to type=submit; nothing here should
		trigger a native form submission. -->
	<form
		class="app-settings"
		:aria-label="$i18n( 'options' )"
		@submit.prevent
	>
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<DateRangeInput />
		<ProjectInput v-model="project" />
		<PlatformInput v-model="platform" />
		<AgentInput v-model="agent" />
		<CdxField class="app-settings__namespace">
			<template #label>
				{{ $i18n( 'namespace' ) }}
			</template>
			<CdxSelect
				v-model:selected="namespace"
				:menu-items="namespaceItems"
				:menu-config="{ visibleItemLimit: 10 }"
			/>
		</CdxField>
		<CdxField class="app-settings__redirects">
			<template #label>
				{{ $i18n( 'redirects' ) }}
			</template>
			<CdxSelect
				v-model:selected="redirects"
				:menu-items="redirectItems"
			/>
		</CdxField>
	</form>
	<PreferencesDialog
		v-model:open="ui.preferencesOpen"
		:hide-page-options="true"
	/>
</template>

<script setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { CdxField, CdxSelect } from '@wikimedia/codex';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { useUserviewsStore } from '../../stores/userviews.js';
import { useUiStore } from '../../stores/ui.js';
import { getSiteinfo } from '../../projects.js';
import { banana } from '../../i18n.js';

const ui = useUiStore();
const store = useUserviewsStore();
const { project, platform, agent, namespace, redirects } = storeToRefs( store );

const redirectItems = [
	{ value: '0', label: banana.i18n( 'exclude-redirects' ) },
	{ value: '1', label: banana.i18n( 'only-redirects' ) },
	{ value: '2', label: banana.i18n( 'redirects-and-non-redirects' ) }
];

const namespaceItems = ref( [
	{ value: 'all', label: banana.i18n( 'all' ) },
	{ value: '0', label: banana.i18n( 'main' ) }
] );

// The namespace list is per-project; the selection resets to Main
// when the project changes (legacy behavior), but is preserved on
// the initial load so a URL-provided namespace survives.
watch( project, loadNamespaces );
loadNamespaces( project.value, null );

async function loadNamespaces( domain, previous ) {
	if ( previous !== null ) {
		namespace.value = '0';
	}
	const siteinfo = await getSiteinfo( domain );
	if ( domain !== project.value || !siteinfo?.namespaces ) {
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
