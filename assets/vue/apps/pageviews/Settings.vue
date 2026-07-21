<template>
	<form class="app-settings" :aria-label="$i18n( 'options' )">
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<DateRangeInput />
		<ProjectInput />
		<PageInput />
		<PlatformInput />
		<AgentInput />
		<CdxField class="app-settings__redirects">
			<CdxCheckbox v-model="redirects">
				{{ $i18n( 'include-redirects' ) }}
			</CdxCheckbox>
		</CdxField>
	</form>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from '../../components/ProjectInput.vue';
import PageInput from '../../components/PageInput.vue';
import PlatformInput from '../../components/PlatformInput.vue';
import AgentInput from '../../components/AgentInput.vue';
import { CdxCheckbox, CdxField } from '@wikimedia/codex';
import { usePageviewsStore } from '../../stores/pageviews.js';

const { redirects } = storeToRefs( usePageviewsStore() );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-select-vue {
	width: 100%;
}
</style>
