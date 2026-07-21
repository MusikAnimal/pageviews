<template>
	<CdxMenuButton
		class="app-chart-type"
		weight="normal"
		:selected="modelValue"
		:menu-items="menuItems"
		:aria-label="$i18n( 'change-chart' )"
		@update:selected="( value ) => emit( 'update:modelValue', value )"
	>
		<CdxIcon :icon="cdxIconChart" />
		{{ $i18n( 'change-chart' ) }}
	</CdxMenuButton>
</template>

<script setup>
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex';
import { cdxIconChart } from '@wikimedia/codex-icons';
import {
	iconChartBar,
	iconChartDoughnut,
	iconChartLine,
	iconChartPie,
	iconChartPolarArea,
	iconChartRadar
} from '../charts/icons.js';
import { banana } from '../i18n.js';

defineProps( {
	/**
	 * The active chart type.
	 */
	modelValue: {
		type: String,
		required: true
	}
} );

const emit = defineEmits( [ 'update:modelValue' ] );

const menuItems = [
	{ value: 'line', label: banana.i18n( 'line' ), icon: iconChartLine },
	{ value: 'bar', label: banana.i18n( 'bar' ), icon: iconChartBar },
	{ value: 'radar', label: banana.i18n( 'radar' ), icon: iconChartRadar },
	{ value: 'pie', label: banana.i18n( 'pie' ), icon: iconChartPie },
	{ value: 'doughnut', label: banana.i18n( 'doughnut' ), icon: iconChartDoughnut },
	{ value: 'polarArea', label: banana.i18n( 'polar-area' ), icon: iconChartPolarArea }
];
</script>
