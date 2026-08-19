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
		<CdxField class="app-settings__redirects">
			<!-- The help button is a sibling of the checkbox, not inside
				its label, so clicking it can't toggle the checkbox (and
				its 32px hit area doesn't inflate the label line). -->
			<div class="app-settings__redirects-row">
				<CdxCheckbox v-model="redirects">
					{{ $i18n( 'include-redirects' ) }}
				</CdxCheckbox>
				<FaqHelpButton
					section="redirects"
					:aria-label="$i18n( 'faq-redirects-title' )"
				/>
			</div>
		</CdxField>
	</form>
	<PreferencesDialog v-model:open="ui.preferencesOpen" />
</template>

<script setup>
import { storeToRefs } from 'pinia';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import { CdxCheckbox, CdxField } from '@wikimedia/codex';
import FaqHelpButton from '../../components/FaqHelpButton.vue';
import PreferencesDialog from '../../components/PreferencesDialog.vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { useUiStore } from '../../stores/ui.js';

const { project, platform, agent, redirects } = storeToRefs( usePageviewsStore() );
const ui = useUiStore();
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-settings__redirects-row {
	align-items: center;
	display: flex;
	gap: @spacing-25;

	// Mirrors Codex's own margin selector so this outranks it on
	// specificity, not on stylesheet load order (which differs
	// between the dev server and the build).
	.cdx-checkbox:not( .cdx-checkbox--inline ) {
		margin-bottom: 0;
	}
}
</style>
