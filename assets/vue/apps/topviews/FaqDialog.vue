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

const backfillDate = `${ banana.i18n( 'july' ) } 2015`;

// Ported from the legacy Topviews FAQ (views/topviews/faq.haml); the
// report-false-positive paragraph is gone with the reporting feature.
const entries = [
	{
		id: 'false_positive',
		title: banana.i18n( 'faq-topviews-false-positive-title' ),
		paragraphs: [
			banana.i18n( 'faq-topviews-false-positive-body1' ),
			banana.i18n(
				'faq-topviews-false-positive-body4',
				banana.i18n( 'show-mobile-percentages' ),
				banana.i18n( 'platform' ),
				banana.i18n( 'all' )
			),
			banana.i18n( 'faq-topviews-false-positive-body2' )
		]
	},
	{
		id: 'old_data',
		title: banana.i18n( 'faq-old-data-title', backfillDate ),
		paragraphs: [ banana.i18n( 'faq-old-data-body', backfillDate ) ]
	},
	{
		id: 'todays_data',
		title: banana.i18n( 'faq-todays-date-title' ),
		paragraphs: [ banana.i18n( 'faq-todays-date-body' ) ]
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
		id: 'feedback',
		title: banana.i18n( 'faq-bug-report-title' ),
		// rawI18n: the message embeds anchor markup.
		paragraphs: [ rawI18n( 'faq-bug-report-body' ) ]
	}
];
</script>
