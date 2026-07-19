<template>
	<div class="my-component">Hello {{ name }}!</div>
</template>

<script setup>
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
