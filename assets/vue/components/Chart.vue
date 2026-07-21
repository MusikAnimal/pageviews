<template>
	<div
		ref="container"
		class="app-chart__canvas"
		role="img"
		:aria-label="ariaLabel"
	/>
</template>

<script setup>
import { ref, toRef } from 'vue';
import { useChart } from '../composables/useChart.js';

const props = defineProps( {
	/**
	 * A complete ECharts option, built by one of the charts/options/
	 * builders. Replaced wholesale (notMerge) on change.
	 */
	option: {
		type: Object,
		required: true
	},
	ariaLabel: {
		type: String,
		default: ''
	}
} );

const container = ref( null );
const { getPngDataUrl } = useChart( container, toRef( props, 'option' ) );

defineExpose( { getPngDataUrl } );
</script>

<style lang="less">
.app-chart__canvas {
	min-height: 400px;
	width: 100%;
}
</style>
