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
 * Open the current app's FAQ dialog scrolled to the given section,
 * keeping the current report params. Pageviews owns the bare /faq;
 * other apps prefix theirs (/siteviews/faq, ...).
 */
function openFaq() {
	const base = ( route.path || '' ).split( '/' )[ 1 ];
	const path = [ '', 'pageviews', 'faq', 'url_structure' ].includes( base ) ?
		'/faq' :
		`/${ base }/faq`;
	router.push( { path, hash: `#${ props.section }`, query: route.query } );
}
</script>
