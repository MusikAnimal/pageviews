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
	},
	/**
	 * Disables drag-select entirely (list apps: a selection would
	 * re-fire their expensive fan-out).
	 */
	noRangeSelect: {
		type: Boolean,
		default: false
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
	props.noRangeSelect ?
		null :
		( startIndex, endIndex ) => emit( 'range-select', startIndex, endIndex )
);

defineExpose( { getPngDataUrl } );
</script>

<style lang="less">
.app-chart__canvas {
	// The chart holds roughly the legacy 2:1 shape at any viewport
	// size: the ratio sets its natural height from the column's width.
	// When the column is taller (the stretched no-breakdown layout),
	// flex-grow expands it further; the min keeps it usable in cramped
	// viewports (max lives in app.less, @chart-max-height).
	aspect-ratio: 2 / 1;
	flex: 1 1 auto;
	min-height: 400px;
	width: 100%;
}
</style>
