<template>
	<CdxDialog
		:open="open"
		:title="banana.i18n( 'faq' )"
		:use-close-button="true"
		class="app-faq"
		@update:open="( value ) => emit( 'update:open', value )"
	>
		<ul class="app-dialog-list">
			<li
				v-for="entry in entries"
				:id="entry.id"
				:key="entry.id">
				<!-- Trusted content: our own i18n messages and link markup. -->
				<!-- eslint-disable vue/no-v-html -->
				<p class="app-dialog-heading">
					<strong v-html="entry.title" />
					<CdxButton
						weight="quiet"
						class="app-heading-link"
						:aria-label="$i18n( 'copy-link' )"
						@click="copySectionLink( entry.id )"
					>
						<CdxIcon :icon="cdxIconLink" size="small" />
					</CdxButton>
				</p>
				<p
					v-for="( paragraph, index ) in entry.paragraphs"
					:key="index"
					v-html="paragraph"
				/>
				<!-- eslint-enable vue/no-v-html -->
			</li>
		</ul>
	</CdxDialog>
</template>

<script setup>
import { CdxButton, CdxDialog, CdxIcon } from '@wikimedia/codex';
import { cdxIconLink } from '@wikimedia/codex-icons';
import { banana } from '../i18n.js';
import { useDialogSectionLinks } from '../composables/useDialogSectionLinks.js';

/**
 * The FAQ dialog shell: each app supplies its own entries
 * ({ id, title, paragraphs: html[] }).
 */
const props = defineProps( {
	open: {
		type: Boolean,
		default: false
	},
	entries: {
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
.cdx-dialog.app-faq {
	max-width: @min-width-breakpoint-desktop;
}

.app-dialog-list {
	list-style: none;
	margin: 0;
	padding: 0;

	> li {
		border-bottom: @border-width-base solid @border-color-subtle;
		padding: @spacing-75 0;

		&:last-child {
			border-bottom: 0;
		}
	}
}
</style>
