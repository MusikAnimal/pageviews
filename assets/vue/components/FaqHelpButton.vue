<template>
	<CdxButton
		class="app-faq-help"
		weight="quiet"
		:aria-label="ariaLabel"
		@click="openFaq"
	>
		<CdxIcon :icon="cdxIconHelpNotice" />
	</CdxButton>
</template>

<script setup>
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconHelpNotice } from '@wikimedia/codex-icons';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps( {
	/**
	 * The FAQ section anchor id to scroll to, e.g. 'agents'.
	 */
	section: {
		type: String,
		required: true
	},
	ariaLabel: {
		type: String,
		required: true
	}
} );

const route = useRoute();
const router = useRouter();

/**
 * Open the FAQ dialog scrolled to the given section, keeping the
 * current report params.
 */
function openFaq() {
	router.push( { path: '/faq', hash: `#${ props.section }`, query: route.query } );
}
</script>
