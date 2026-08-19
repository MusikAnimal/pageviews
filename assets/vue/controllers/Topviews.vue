<template>
	<LoadingOverlay
		v-if="store.status === 'loading'"
		abort-label-key="cancel"
		@abort="store.abort()"
	/>
	<div class="app-workspace">
		<TopviewsSettings />
		<figure class="app-chart">
			<div class="app-topviews__toolbar">
				<CdxSearchInput
					v-model="store.search"
					class="app-topviews__search"
					:clearable="true"
					:aria-label="$i18n( 'search' )"
					:placeholder="$i18n( 'search' )"
				/>
				<ExportMenu
					v-if="store.pageData.length"
					:filename="exportFilename"
					:get-csv-rows="listCsvRows"
					:get-json="() => store.pageData"
				/>
			</div>
			<CdxMessage
				v-for="message in ui.messages"
				:key="message.id"
				:type="message.type"
				allow-user-dismiss
				@user-dismissed="ui.dismiss( message.id )"
			>
				{{ message.text }}
				<a
					v-if="message.onRetry"
					href="#"
					@click.prevent="retry( message )"
				>{{ $i18n( 'try-again' ) }}</a>
			</CdxMessage>
			<!-- eslint-disable vue/no-v-html -- i18n messages whose
				markup we build ourselves (a link to our own FAQ, or the
				dialog-opening link); no user-controlled markup. -->
			<p
				v-if="store.serverExcluded.length"
				class="app-topviews__notice"
				@click="onKnownClick"
				v-html="knownNotice"
			/>
			<p
				v-else
				class="app-topviews__notice"
				v-html="falsePositiveNotice"
			/>
			<!-- eslint-enable vue/no-v-html -->
			<table v-if="store.displayed.length" class="app-stats">
				<thead>
					<!-- While filtering, matches come from the whole list,
						most of it unenriched; fetching on the fly per
						keystroke would be wasteful, so the enrichment
						columns hide instead (legacy behavior). -->
					<tr>
						<th>{{ $i18n( 'rank' ) }}</th>
						<th>{{ $i18n( 'page' ) }}</th>
						<th v-if="!store.search">
							{{ $i18n( 'edits' ) }}
						</th>
						<th v-if="!store.search">
							{{ $i18n( 'editors' ) }}
						</th>
						<th class="app-stats__number">
							{{ $i18n( 'pageviews' ) }}
						</th>
						<th
							v-if="store.shouldShowMobile && !store.search"
							class="app-stats__number"
						>
							{{ $i18n( 'percent-mobile' ) }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="entry in store.displayed"
						:key="entry.article"
						class="app-topviews__row"
						:style="barStyle( entry )"
					>
						<th scope="row" class="app-topviews__rank">
							<span class="app-topviews__rank-number">
								{{ number( entry.rank ) }}
							</span>
							<CdxButton
								class="app-topviews__remove"
								weight="quiet"
								:aria-label="$i18n( 'topviews-remove-page' )"
								:title="$i18n( 'topviews-remove-page' )"
								@click="exclude( entry.article )"
							>
								<CdxIcon :icon="cdxIconClear" size="small" />
							</CdxButton>
						</th>
						<td>
							<a :href="pageUrl( entry.article )" target="_blank">
								{{ entry.article }}
							</a>
						</td>
						<td v-if="!store.search" class="app-stats__number">
							<a
								v-if="edits( entry.article ) !== null"
								:href="historyUrl( entry.article )"
								target="_blank"
							>{{ number( edits( entry.article ) ) }}</a>
							<template v-else>
								?
							</template>
						</td>
						<td v-if="!store.search" class="app-stats__number">
							{{ editors( entry.article ) === null ?
								'?' : number( editors( entry.article ) ) }}
						</td>
						<td class="app-stats__number">
							<a :href="pageviewsUrl( entry.article )" target="_blank">
								{{ number( entry.views ) }}
							</a>
						</td>
						<td
							v-if="store.shouldShowMobile && !store.search"
							class="app-stats__number"
						>
							{{ percentMobile( entry ) }}
						</td>
					</tr>
				</tbody>
			</table>
			<div
				v-if="!store.search && store.offset < store.pageData.length"
				class="app-topviews__more"
			>
				<CdxButton @click="store.showMore()">
					{{ $i18n( 'show-more' ) }}
				</CdxButton>
			</div>
		</figure>
	</div>
	<CdxToastContainer />
	<CdxDialog
		v-model:open="knownOpen"
		:title="$i18n( 'list-false-positives-heading' )"
		:use-close-button="true"
	>
		<!-- i18n message with a link to our own FAQ; no
			user-controlled markup. -->
		<!-- eslint-disable-next-line vue/no-v-html -->
		<p @click="onKnownClick" v-html="knownIntro" />
		<table class="app-stats app-topviews__known-table">
			<thead>
				<tr>
					<th>{{ $i18n( 'page' ) }}</th>
					<th class="app-stats__number">
						{{ $i18n( 'original-rank' ) }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="entry in store.serverExcluded" :key="entry.article">
					<td>
						<a :href="pageUrl( entry.article )" target="_blank">
							{{ entry.article }}
						</a>
					</td>
					<td class="app-stats__number">
						{{ number( entry.rank ) }}
					</td>
				</tr>
			</tbody>
		</table>
	</CdxDialog>
	<FaqDialog
		:open="activeDialog === 'faq'"
		@update:open="onDialogToggle"
	/>
	<UrlStructureDialog
		:open="activeDialog === 'url-structure'"
		@update:open="onDialogToggle"
	/>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
	CdxButton,
	CdxDialog,
	CdxIcon,
	CdxMessage,
	CdxSearchInput,
	CdxToastContainer
} from '@wikimedia/codex';
import { cdxIconClear } from '@wikimedia/codex-icons';
import { useRoute, useRouter } from 'vue-router';
import { useTopviewsStore } from '../stores/topviews.js';
import { usePreferencesStore } from '../stores/preferences.js';
import { useUiStore } from '../stores/ui.js';
import { useQuerySync } from '../composables/useQuerySync.js';
import { formatNumber } from '../lib/format.js';
import { historyUrl as buildHistoryUrl } from '../lib/wikiUrls.js';
import { banana, rawI18n } from '../i18n.js';
import TopviewsSettings from '../apps/topviews/Settings.vue';
import FaqDialog from '../apps/topviews/FaqDialog.vue';
import UrlStructureDialog from '../apps/topviews/UrlStructureDialog.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ExportMenu from '../components/ExportMenu.vue';

const store = useTopviewsStore();
const preferences = usePreferencesStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
// Topviews has its own single date, not the shared range.
useQuerySync( store, { syncSettings: false } );

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

// The /topviews/faq and /topviews/url_structure routes open dialogs
// over the app.
const activeDialog = computed( () => route.meta.dialog ?? null );

function onDialogToggle( open ) {
	if ( !open ) {
		router.replace( { path: '/topviews', query: route.query } );
	}
}

function retry( message ) {
	ui.dismiss( message.id );
	message.onRetry();
}

// The message embeds a link to the FAQ's false-positive entry.
const falsePositiveNotice = computed( () => rawI18n( 'topviews-false-positive' ) );

// "[3 pages] have been automatically excluded as [false positives]."
// — the count opens the known-false-positives dialog, "false
// positives" goes to the FAQ. Anchors survive as message parameters
// (banana's sanitizer only strips them from message content), and
// the dialog click is wired by delegation since the markup comes
// from the message.
const knownOpen = ref( false );
const FAQ_LINK_OPEN = '<a href="/topviews/faq#false_positive" class="app-topviews__faq-link">';

const knownNotice = computed( () => {
	const count = store.serverExcluded.length;
	const pagesLink = '<a href="#" class="app-topviews__known-link">' +
		`${ banana.i18n( 'known-false-positives-link', count ) }</a>`;
	const faqLink = `${ FAQ_LINK_OPEN }${ banana.i18n( 'false-positives', count ) }</a>`;
	return banana.i18n( 'known-false-positives-notice', pagesLink, count, faqLink );
} );

/**
 * Delegated clicks for the message-built links: the count opens the
 * known-false-positives dialog, the FAQ links route client-side (no
 * page reload; the plain href still serves open-in-new-tab).
 *
 * @param {MouseEvent} event
 */
function onKnownClick( event ) {
	if ( event.target.closest( '.app-topviews__known-link' ) ) {
		event.preventDefault();
		knownOpen.value = true;
	} else if ( event.target.closest( '.app-topviews__faq-link' ) ) {
		event.preventDefault();
		knownOpen.value = false;
		router.push( { path: '/topviews/faq', hash: '#false_positive', query: route.query } );
	}
}

// The dialog's lead-in above the table.
const knownIntro = computed( () => banana.i18n(
	'known-false-positives-intro',
	`${ FAQ_LINK_OPEN }${ banana.i18n( 'automatically-removed' ) }</a>`
) );

function exclude( article ) {
	store.excludes = [ ...store.excludes, article ];
}

const edits = ( article ) => {
	const data = store.editData[ article ];
	return data ? Number( data.num_edits ) : null;
};
const editors = ( article ) => {
	const data = store.editData[ article ];
	return data ? Number( data.num_users ) : null;
};

/**
 * "61.4%" — from the yearly dataset directly, or computed against the
 * lazily-fetched mobile views (blank until they arrive).
 *
 * @param {Object} entry
 * @return {string}
 */
function percentMobile( entry ) {
	let percentage;
	if ( store.dateType === 'yearly' ) {
		percentage = String( entry.mobile_percentage ?? '' );
	} else {
		const mobile = store.mobileViews[ entry.article ];
		if ( mobile === undefined ) {
			return '';
		}
		percentage = ( ( mobile / entry.views ) * 100 ).toFixed( 1 );
	}
	if ( percentage === '' ) {
		return '';
	}
	if ( parseFloat( percentage ) === 0 ) {
		percentage = '< 0.1';
	}
	return `${ percentage }%`;
}

const exportFilename = computed( () => `topviews-${ store.date }` );

// The list export mirrors the table (legacy shape): one row per page
// with the enrichment values where they've arrived, "?" otherwise.
function listCsvRows() {
	const header = [ 'Page', 'Edits', 'Editors', 'Views' ];
	if ( store.shouldShowMobile ) {
		header.push( 'Mobile %' );
	}
	return [ header, ...store.pageData.map( ( entry ) => {
		const row = [
			entry.article,
			edits( entry.article ) ?? '?',
			editors( entry.article ) ?? '?',
			entry.views
		];
		if ( store.shouldShowMobile ) {
			row.push( percentMobile( entry ).replace( '%', '' ) );
		}
		return row;
	} ) ];
}

// The rows double as a bar chart: each row's background is shaded
// relative to the top-ranked entry (legacy behavior). The bar is a
// background-image sized to the page's share, since a row can't
// anchor an absolutely-positioned child on our whole browser matrix.
const maxViews = computed( () => store.pageData[ 0 ]?.views ?? 0 );

function barStyle( entry ) {
	const width = maxViews.value ? ( 100 * entry.views ) / maxViews.value : 0;
	return { backgroundSize: `${ width }% 100%` };
}

function pageUrl( article ) {
	return `https://${ store.project }/wiki/` +
		encodeURIComponent( article.replace( / /g, '_' ) );
}

function historyUrl( article ) {
	const [ , end ] = store.periodDates();
	return buildHistoryUrl( store.project, article, { end, edits: edits( article ) } );
}

function pageviewsUrl( article ) {
	const [ start, end ] = store.periodDates();
	const query = new URLSearchParams( {
		project: store.project,
		platform: store.platform,
		start,
		end,
		pages: article.replace( / /g, '_' )
	} );
	return `/pageviews?${ query }`;
}

// The list itself reloads on the core params; the client-side filters
// (mainspace, excludes, the mobile column) only need the visible rows
// re-enriched.
watch(
	() => [ store.project, store.platform, store.date ],
	() => store.load(),
	{ immediate: true }
);
watch(
	() => [ store.mainspace, store.excludes, store.showMobile ],
	() => {
		if ( store.status === 'complete' ) {
			store.ensureEnrichment();
		}
	},
	{ deep: true }
);
</script>

<style lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-topviews__toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: @spacing-50;
	justify-content: space-between;
	margin-bottom: @spacing-50;
}

.app-topviews__search {
	flex: 1;

	@media screen and ( min-width: @min-width-breakpoint-tablet ) {
		max-width: @size-2400;
	}
}

.app-topviews__notice {
	color: @color-subtle;
	font-size: @font-size-small;
	margin: 0;
}

.app-topviews__known-table {
	font-size: @font-size-small;
}

// The shaded backgrounds that make the ranked list read as a bar
// chart, spanning every column. A solid background-image whose
// background-size carries the page's share of the top entry's views,
// grown in on render.
@topviews-bar-color: @background-color-neutral-subtle;

.app-topviews__row {
	animation: app-topviews-bar 1s ease;
	background-image: linear-gradient( @topviews-bar-color, @topviews-bar-color );
	background-position: 0 0;
	background-repeat: no-repeat;
	// Excluding a page can change the scale; existing bars resize
	// smoothly rather than jumping.
	transition: background-size 1s ease;

	.rtl & {
		background-position: 100% 0;
	}
}

@keyframes app-topviews-bar {
	from {
		background-size: 0 100%;
	}
}

// The niche exclude button hides behind the rank number (legacy
// design): hovering the row — or tabbing to the button — swaps them.
.app-topviews__rank {
	position: relative;
}

.app-topviews__remove {
	inset-inline-start: @spacing-25;
	left: 0;
	// Keep the rows compact despite the 32px button hit area.
	min-height: 0;
	// Kept in the tab order and accessibility tree, unlike the
	// legacy display: none.
	opacity: 0;
	padding: 0 @spacing-25;
	position: absolute;
	top: 50%;
	transform: translateY( -50% );
}

.app-topviews__row:hover,
.app-topviews__rank:focus-within {
	.app-topviews__rank-number {
		visibility: hidden;
	}

	.app-topviews__remove {
		opacity: 1;
	}
}

.app-topviews__more {
	margin: @spacing-100 0;
	text-align: center;
}
</style>
