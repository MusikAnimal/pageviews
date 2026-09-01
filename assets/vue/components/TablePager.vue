<template>
	<div class="app-stats-pager">
		<span class="app-stats-pager__status">{{ status }}</span>
		<CdxButton
			weight="quiet"
			:disabled="page === 0"
			:aria-label="$i18n( 'pager-first' )"
			@click="emit( 'go', 0 )"
		>
			<CdxIcon :icon="cdxIconMoveFirst" />
		</CdxButton>
		<CdxButton
			weight="quiet"
			:disabled="page === 0"
			:aria-label="$i18n( 'pager-previous' )"
			@click="emit( 'go', page - 1 )"
		>
			<CdxIcon :icon="cdxIconPrevious" />
		</CdxButton>
		<CdxButton
			weight="quiet"
			:disabled="page === pageCount - 1"
			:aria-label="$i18n( 'pager-next' )"
			@click="emit( 'go', page + 1 )"
		>
			<CdxIcon :icon="cdxIconNext" />
		</CdxButton>
		<CdxButton
			weight="quiet"
			:disabled="page === pageCount - 1"
			:aria-label="$i18n( 'pager-last' )"
			@click="emit( 'go', pageCount - 1 )"
		>
			<CdxIcon :icon="cdxIconMoveLast" />
		</CdxButton>
	</div>
</template>

<script setup>
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import {
	cdxIconMoveFirst,
	cdxIconMoveLast,
	cdxIconNext,
	cdxIconPrevious
} from '@wikimedia/codex-icons';

/**
 * The stats tables' window pager (DataTable renders one above and one
 * below the table). Dumb by design: the state lives in DataTable.
 * The Move* icons auto-flip in RTL.
 */
defineProps( {
	// 0-based current window.
	page: {
		type: Number,
		required: true
	},
	pageCount: {
		type: Number,
		required: true
	},
	// Pre-formatted "1–1,000 of 18,432" text.
	status: {
		type: String,
		required: true
	}
} );

const emit = defineEmits( [ 'go' ] );
</script>
