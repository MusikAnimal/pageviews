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
		<ProjectInput />
		<PlatformInput />
		<AgentInput />
		<CdxField class="app-settings__redirects">
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

const { redirects } = storeToRefs( usePageviewsStore() );
const ui = useUiStore();
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-select-vue {
	width: 100%;
}

.app-settings__redirects-row {
	align-items: center;
	display: flex;
	gap: @spacing-25;
}
</style>
