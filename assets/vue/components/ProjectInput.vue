<template>
	<cdx-field class="app-settings__project">
		<template #label>
			{{ $i18n( 'project' ) }}
		</template>
	</cdx-field>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings.js";
import { CdxField } from "@wikimedia/codex";

const store = useSettingsStore();
const { project } = storeToRefs( store );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';


</style>
