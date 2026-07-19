<template>
	<div class="app-workspace">
		<pageviews-settings></pageviews-settings>
		<chart></chart>
		<totals></totals>
	</div>
	<section class="app-breakdown">

	</section>
</template>

<script setup>
import { usePageviewsStore } from "../stores/pageviews.js";
import { useQuerySync } from "../composables/useQuerySync.js";
import PageviewsSettings from "../apps/pageviews/Settings.vue";
import Chart from "../components/Chart.vue";
import Totals from "../apps/pageviews/Totals.vue";

const store = usePageviewsStore();
useQuerySync( store );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-workspace {
	align-items: flex-start;
	display: flex;
	flex-wrap: wrap;
	gap: @size-100;

	&__heading {
		text-align: center;
	}
}

.app-settings {
	flex: 1 1 @size-1600;
}

.app-visualization {
	flex: 999 1 @size-3200;
	min-width: 0;
}

.app-totals {
	flex: 1 1 @size-1600;
}
</style>
