<template>
	<form class="app-settings" :aria-label="$i18n( 'options' )">
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<date-range-input></date-range-input>
		<project-input></project-input>
		<platform-input></platform-input>
	</form>
</template>

<script setup>
import DateRangeInput from '../../components/DateRangeInput.vue';
import ProjectInput from "../../components/ProjectInput.vue";
import PlatformInput from "../../components/PlatformInput.vue";
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-select-vue {
	width: 100%;
}
</style>
