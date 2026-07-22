<template>
	<CdxDialog
		:open="open"
		:title="banana.i18n( 'url-structure' )"
		:use-close-button="true"
		class="app-url-structure"
		@update:open="( value ) => emit( 'update:open', value )"
	>
		<!-- Trusted content: our own i18n messages and link markup. -->
		<!-- eslint-disable vue/no-v-html -->
		<p v-html="intro" />

		<h3>
			{{ $i18n( 'url-structure-parameters' ) }}
			<small>{{ $i18n( 'url-structure-parameters-order' ) }}</small>
		</h3>
		<dl class="app-url-structure__params">
			<template v-for="param in params" :key="param.name">
				<dt>{{ param.name }}</dt>
				<dd v-html="param.html" />
			</template>
		</dl>
		<!-- eslint-enable vue/no-v-html -->
	</CdxDialog>
</template>

<script setup>
import { CdxDialog } from '@wikimedia/codex';
import { banana } from '../i18n.js';

/**
 * The URL-structure dialog shell: each app supplies its intro html
 * and param list ({ name, html }); shared fragments live in
 * lib/urlStructure.js.
 */
defineProps( {
	open: {
		type: Boolean,
		default: false
	},
	intro: {
		type: String,
		required: true
	},
	params: {
		type: Array,
		required: true
	}
} );

const emit = defineEmits( [ 'update:open' ] );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-url-structure {
	&__example {
		background: @background-color-neutral-subtle;
		overflow-x: auto;
		padding: @spacing-50;
	}

	&__params {
		dt {
			font-weight: @font-weight-bold;
			margin-top: @spacing-75;
		}

		dd {
			margin: @spacing-25 0 0;
		}
	}
}
</style>
