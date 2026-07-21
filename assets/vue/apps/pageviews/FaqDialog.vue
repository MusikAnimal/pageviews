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
import { banana, rawI18n } from '../../i18n.js';

const props = defineProps( {
	open: {
		type: Boolean,
		default: false
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

const link = ( href, text ) => `<a target="_blank" href="${ href }">${ text }</a>`;

const backfillDate = `${ banana.i18n( 'july' ) } 2015`;
const redirectviewsLink = `<a href="/redirectviews">${ banana.i18n( 'redirectviews' ) }</a>`;

// Ported from the legacy FAQ (views/faq_parts/), same order.
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
		id: 'counts',
		title: banana.i18n( 'faq-counts-title' ),
		paragraphs: [ banana.i18n( 'faq-counts-body', link(
			'https://meta.wikimedia.org/wiki/Research:Page_view',
			'meta:Research:Page view'
		) ) ]
	},
	{
		id: 'search_redirects',
		title: banana.i18n( 'faq-search-redirects-title' ),
		paragraphs: [ banana.i18n(
			'faq-search-redirects-body',
			banana.i18n( 'autocompletion-redirects' ),
			banana.i18n( 'settings' ),
			redirectviewsLink
		) ]
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
		id: 'location',
		title: banana.i18n( 'faq-location-title' ),
		paragraphs: [ banana.i18n( 'faq-location-body', link(
			'https://stats.wikimedia.org/wikimedia/squids/SquidReportPageViewsPerCountryBreakdown.htm',
			'stats.wikimedia.org'
		) ) ]
	},
	{
		id: 'referrals',
		title: banana.i18n( 'faq-referrals-title' ),
		paragraphs: [ banana.i18n( 'faq-referrals-body', link(
			'http://discovery.wmflabs.org/external/',
			'discovery.wmflabs.org'
		) ) ]
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
				[ 'spider', 'faq-agents-spider' ],
				[ 'automated', 'faq-agents-automated' ]
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
		id: 'top_viewed',
		title: banana.i18n( 'faq-top-viewed-title' ),
		paragraphs: [ banana.i18n(
			'faq-try-tool',
			`<a href="/topviews">${ banana.i18n( 'topviews-title' ) }</a>`
		) ]
	},
	{
		id: 'multi_lang',
		title: banana.i18n( 'faq-multi-lang-title' ),
		paragraphs: [ banana.i18n(
			'faq-try-tool',
			`<a href="/langviews">${ banana.i18n( 'langviews-title' ) }</a>`
		) ]
	},
	{
		id: 'data_dumps',
		title: banana.i18n( 'faq-data-dumps' ),
		paragraphs: [ banana.i18n( 'faq-data-dumps-body', link(
			'https://dumps.wikimedia.org/other/pageviews/',
			'dumps.wikimedia.org'
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

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

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
