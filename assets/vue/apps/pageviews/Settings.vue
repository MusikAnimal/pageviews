<template>
	<form class="app-settings" aria-label="{{ $i18n( 'options' ) }}">
		<header class="app-workspace__heading">
			<h3>{{ $i18n( 'options' ) }}</h3>
		</header>
		<date-range-input></date-range-input>
	</form>
</template>

<script setup>
import DateRangeInput from '../../components/DateRangeInput.vue';
</script>
