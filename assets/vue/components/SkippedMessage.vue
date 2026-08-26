<template>
	<CdxMessage
		v-if="pages.length"
		type="error"
		:inline="true"
	>
		<!-- Built from i18n messages and our own wiki links, with the
			titles HTML-escaped. -->
		<!-- eslint-disable-next-line vue/no-v-html -->
		<span v-html="html" />
	</CdxMessage>
</template>

<script setup>
import { computed } from 'vue';
import { CdxMessage } from '@wikimedia/codex';
import { banana } from '../i18n.js';

/**
 * Lists the pages a report had to skip because their requests failed
 * (each page/chunk is its own query; the rest of the report is still
 * valid). Rendered beneath the results via the legacy timeout
 * message, with each page linked.
 */
const props = defineProps( {
	/**
	 * One { label, href } per skipped page.
	 */
	pages: {
		type: Array,
		required: true
	}
} );

const escapeHtml = ( text ) => text
	.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' )
	.replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );

const html = computed( () => {
	if ( !props.pages.length ) {
		return '';
	}
	const list = '<ul>' + props.pages.map( ( { label, href } ) => '<li>' +
		`<a target="_blank" href="${ escapeHtml( href ) }">` +
		`${ escapeHtml( label ) }</a></li>` ).join( '' ) + '</ul>';
	return banana.i18n( 'api-error-timeout', list );
} );
</script>
