<template>
	<BaseFaqDialog
		:open="open"
		:entries="entries"
		@update:open="( value ) => emit( 'update:open', value )"
	/>
</template>

<script setup>
import BaseFaqDialog from '../../components/FaqDialog.vue';
import { banana, rawI18n } from '../../i18n.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const link = ( href, text ) => `<a target="_blank" href="${ href }">${ text }</a>`;

const redirectviewsLink = `<a href="/redirectviews">${ banana.i18n( 'redirectviews' ) }</a>`;

// A subset of the legacy Massviews FAQ that applies to the sources
// ported so far; grows with the sources.
const entries = [
	{
		id: 'anomaly',
		title: banana.i18n( 'faq-anomaly-title' ),
		paragraphs: [
			banana.i18n( 'faq-anomaly-body1' ),
			banana.i18n( 'faq-anomaly-body2', link(
				'https://phabricator.wikimedia.org/maniphest/task/edit/form/1/?projects=Pageviews-Anomaly',
				'Phabricator'
			) )
		]
	},
	{
		id: 'counts',
		title: banana.i18n( 'faq-counts-title' ),
		paragraphs: [ banana.i18n( 'faq-counts-body', link(
			'https://meta.wikimedia.org/wiki/Research:Page_view',
			'meta:Research:Page view'
		) ) ]
	},
	{
		id: 'redirects',
		title: banana.i18n( 'faq-redirects-title' ),
		paragraphs: [
			banana.i18n(
				'faq-redirects-body', redirectviewsLink, banana.i18n( 'include-redirects' )
			),
			banana.i18n( 'faq-redirects-body2', banana.i18n( 'include-redirects' ) )
		]
	},
	{
		id: 'feedback',
		title: banana.i18n( 'faq-bug-report-title' ),
		// rawI18n: the message embeds anchor markup.
		paragraphs: [ rawI18n( 'faq-bug-report-body' ) ]
	}
];
</script>
