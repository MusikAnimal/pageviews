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
		<p v-if="intro" v-html="intro" />

		<h3>
			{{ $i18n( 'url-structure-parameters' ) }}
			<small>{{ $i18n( 'url-structure-parameters-order' ) }}</small>
		</h3>
		<dl class="app-url-structure__params">
			<template v-for="param in params" :key="param.name">
				<dt :id="param.name" class="app-dialog-heading">
					{{ param.name }}
					<CdxButton
						weight="quiet"
						class="app-heading-link"
						:aria-label="$i18n( 'copy-link' )"
						@click="copySectionLink( param.name )"
					>
						<CdxIcon :icon="cdxIconLink" size="small" />
					</CdxButton>
				</dt>
				<dd v-html="param.html" />
			</template>
		</dl>
		<!-- eslint-enable vue/no-v-html -->
	</CdxDialog>
</template>

<script setup>
import { CdxButton, CdxDialog, CdxIcon } from '@wikimedia/codex';
import { cdxIconLink } from '@wikimedia/codex-icons';
import { banana } from '../i18n.js';
import { useDialogSectionLinks } from '../composables/useDialogSectionLinks.js';

/**
 * The URL-structure dialog shell: each app supplies its intro html
 * and param list ({ name, html }); shared fragments live in
 * lib/urlStructure.js.
 */
const props = defineProps( {
	open: {
		type: Boolean,
		default: false
	},
	intro: {
		type: String,
		default: ''
	},
	params: {
		type: Array,
		required: true
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const { copySectionLink } = useDialogSectionLinks( () => props.open );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

// Reading-heavy content: wider than the Codex default dialog. The
// extra .cdx-dialog outranks Codex's own max-width on specificity,
// not on stylesheet load order (which differs between the dev server
// and the build).
.cdx-dialog.app-url-structure {
	max-width: @min-width-breakpoint-desktop;
}

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
