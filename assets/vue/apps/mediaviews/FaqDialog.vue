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

// Ported from the legacy Mediaviews FAQ (views/mediaviews/faq.haml),
// plus the agents section its Agent field links to.
const entries = [
	{
		id: 'todays_data',
		title: banana.i18n( 'faq-todays-date-title' ),
		paragraphs: [ banana.i18n( 'faq-todays-date-body' ) ]
	},
	{
		id: 'date_dot',
		title: banana.i18n( 'faq-date-dot' ),
		paragraphs: [ banana.i18n( 'faq-date-dot-body' ) ]
	},
	{
		id: 'agents',
		title: banana.i18n( 'faq-agents-title' ),
		paragraphs: [
			// rawI18n: these messages embed anchor markup, which
			// banana's sanitizer would escape.
			'<ul>' + [
				[ 'user', 'faq-agents-user' ],
				[ 'spider', 'faq-agents-spider' ]
			].map( ( [ label, body ] ) => `<li><i>${ banana.i18n( label ) }</i> ${ rawI18n( body ) }</li>`
			).join( '' ) + '</ul>'
		]
	},
	{
		id: 'chart_type',
		title: banana.i18n( 'faq-chart-type-title' ),
		paragraphs: [ banana.i18n( 'faq-chart-type-body', banana.i18n( 'change-chart' ) ) ]
	},
	{
		id: 'feedback',
		title: banana.i18n( 'faq-bug-report-title' ),
		// rawI18n: the message embeds anchor markup.
		paragraphs: [ rawI18n( 'faq-bug-report-body' ) ]
	}
];
</script>
