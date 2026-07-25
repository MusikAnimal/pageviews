<template>
	<BaseUrlStructureDialog
		:open="open"
		:params="params"
		@update:open="( value ) => emit( 'update:open', value )"
	/>
</template>

<script setup>
import BaseUrlStructureDialog from '../../components/UrlStructureDialog.vue';
import { dateRangeParams } from '../../lib/urlStructure.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

// Grows as the page-list sources are ported.
const params = [
	...dateRangeParams()
];
</script>
