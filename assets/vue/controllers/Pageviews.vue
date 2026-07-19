<template>
	<div class="my-component">Hello {{ name }}!</div>
</template>

<script setup>
import { usePageviewsStore } from "../stores/pageviews.js";
import { useQuerySync } from "../composables/useQuerySync.js";

const store = usePageviewsStore();
useQuerySync( store );

defineProps( {
	name: String
} );
</script>

<style scoped lang="less">
@my-color: #F00;

.my-component {
	background: @my-color;
}
</style>
