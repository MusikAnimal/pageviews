import { nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { banana } from '../i18n.js';
import { useAppToast } from './useAppToast.js';

/**
 * Section deep links for the FAQ and URL Structure dialogs: scroll to
 * the URL's #hash section when the dialog opens, and copy a section's
 * own link to the clipboard.
 *
 * @param {() => boolean} isOpen Whether the dialog is open.
 * @return {{copySectionLink: Function}}
 */
export function useDialogSectionLinks( isOpen ) {
	const route = useRoute();
	const toast = useAppToast();

	// Codex's focus trap gives initial focus to the body's first
	// focusable element — now one of the copy buttons, which pops
	// visibly (they reveal on focus). Retarget the dialog's own focus
	// holder instead, so nothing is highlighted on open and the first
	// Tab moves to the first focusable element. The zero timeout runs
	// after Codex's own (nextTick-deferred) focus pass.
	watch( isOpen, async ( open ) => {
		if ( !open ) {
			return;
		}
		await nextTick();
		setTimeout( () => {
			document.querySelector( '.cdx-dialog-focus-trap' )?.focus();
		} );
	} );

	// Deep links like /faq#agents scroll to that section and flash it.
	watch( () => [ isOpen(), route.hash ], async ( [ open ] ) => {
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
				// Focus the linked section (overriding the on-open
				// retargeting above), so keyboard users tab onward from
				// here into the definition. tabindex="-1" makes it
				// programmatically focusable without joining the tab
				// order itself.
				target.setAttribute( 'tabindex', '-1' );
				target.focus( { preventScroll: true } );
				target.scrollIntoView( { block: 'start', behavior: 'smooth' } );
				target.classList.add( 'app-flash' );
				setTimeout( () => target.classList.remove( 'app-flash' ), 4000 );
			}
		}, 600 );
	}, { immediate: true } );

	/**
	 * Copy a deep link to the given section: just the dialog's route
	 * plus the anchor (/{app}/faq#{id}) — not the full report
	 * permalink, so no query params.
	 *
	 * @param {string} id
	 */
	async function copySectionLink( id ) {
		const url = new URL( window.location );
		url.search = '';
		url.hash = `#${ id }`;
		await navigator.clipboard.writeText( url.toString() );
		toast.success( banana.i18n( 'link-copied' ), { autoDismiss: true } );
	}

	return { copySectionLink };
}
