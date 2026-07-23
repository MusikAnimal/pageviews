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

/**
 * range-select: the user drag-selected a slice of the category axis;
 * payload is its ( startIndex, endIndex ).
 */
const emit = defineEmits( [ 'range-select' ] );

const container = ref( null );
const { getPngDataUrl } = useChart(
	container,
	toRef( props, 'option' ),
	( startIndex, endIndex ) => emit( 'range-select', startIndex, endIndex )
);

defineExpose( { getPngDataUrl } );
</script>

<style lang="less">
.app-chart__canvas {
	// Fills the chart column's leftover height (see .app-chart, a flex
	// column); the min keeps it usable in cramped viewports.
	flex: 1;
	min-height: 400px;
	width: 100%;
}
</style>
