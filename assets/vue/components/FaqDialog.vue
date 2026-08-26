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
				<p><strong v-html="entry.title" /></p>
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
import { nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CdxDialog } from '@wikimedia/codex';
import { banana } from '../i18n.js';

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

const route = useRoute();

// Deep links like /faq#agents scroll to that section and flash it.
watch( () => [ props.open, route.hash ], async ( [ open ] ) => {
	if ( !open || !route.hash ) {
		return;
	}
	await nextTick();
	// Codex's focus trap schedules its own scrollIntoView of the
	// focused element 500ms after opening (block: 'nearest', a no-op
	// while that element is still in view). Scrolling before that
	// fires means getting yanked back up — so wait it out.
	setTimeout( () => {
		const target = document.getElementById( route.hash.slice( 1 ) );
		if ( target ) {
			target.scrollIntoView( { block: 'start', behavior: 'smooth' } );
			target.classList.add( 'app-flash' );
			setTimeout( () => target.classList.remove( 'app-flash' ), 2000 );
		}
	}, 600 );
}, { immediate: true } );
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

// Reading-heavy content: wider than the Codex default dialog.
.app-faq {
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
