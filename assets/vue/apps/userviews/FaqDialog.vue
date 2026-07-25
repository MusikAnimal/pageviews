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

// Ported from the legacy Userviews FAQ (views/userviews/faq.haml).
const entries = [
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
		id: 'agents',
		title: banana.i18n( 'faq-agents-title' ),
		paragraphs: [
			// rawI18n: these messages embed anchor markup, which
			// banana's sanitizer would escape.
			'<ul>' + [
				[ 'user', 'faq-agents-user' ],
				[ 'spider', 'faq-agents-spider' ],
				[ 'automated', 'faq-agents-automated' ]
			].map( ( [ label, body ] ) => `<li><i>${ banana.i18n( label ) }</i> ${ rawI18n( body ) }</li>`
			).join( '' ) + '</ul>'
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
