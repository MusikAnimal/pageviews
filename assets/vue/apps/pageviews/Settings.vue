<template>
	<form class="app-settings" :aria-label="$i18n( 'options' )">
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<date-range-input></date-range-input>
		<project-input></project-input>
		<platform-input></platform-input>
		<agent-input></agent-input>
		<cdx-field class="app-settings__redirects">
			<cdx-checkbox v-model="redirects">
				{{ $i18n( 'include-redirects' ) }}
			</cdx-checkbox>
		</cdx-field>
	</form>
</template>

<script setup>
import { storeToRefs } from "pinia";
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from "../../components/ProjectInput.vue";
import PlatformInput from "../../components/PlatformInput.vue";
import AgentInput from "../../components/AgentInput.vue";
import { CdxCheckbox, CdxField } from "@wikimedia/codex";
import { usePageviewsStore } from "../../stores/pageviews.js";

const { redirects } = storeToRefs( usePageviewsStore() );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-select-vue {
	width: 100%;
}
</style>
