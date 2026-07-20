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

@form-basis: @size-1600;
@viz-basis: @size-3200;
@totals-basis: @size-1600;
@layout-gap: @size-100;

.app-workspace {
	align-items: flex-start;
	container-type: inline-size;
	display: flex;
	flex-wrap: wrap;
	gap: @layout-gap;

	&__heading {
		text-align: center;
	}
}

.app-settings {
	flex: 1 1 @size-1600;
	padding: @spacing-50;
}

.app-visualization {
	flex: 999 1 @size-3200;
	min-height: 100px;
	min-width: 0;

	@container ( min-width: calc( @form-basis + @viz-basis + @layout-gap ) ) {
		& {
			border-left: @border-width-base solid @border-color-base;
		}
	}
}

.app-totals {
	flex: 1 1 @size-1600;
	padding: @spacing-50;

	@container ( min-width: calc( @form-basis + @viz-basis + @totals-basis + 2 * @layout-gap ) ) {
		& {
			border-left: @border-width-base solid @border-color-base;
		}
	}
}
</style>
