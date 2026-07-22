import { ref } from 'vue';
import { defineStore } from 'pinia';

/**
 * Cross-app UI state: user-facing messages (rendered as CdxMessage
 * stacks) and fan-out progress (drives the progress bar).
 */
export const useUiStore = defineStore( 'ui', () => {
	/**
	 * @type {import('vue').Ref<Array<{id: number, type: string, text: string}>>}
	 */
	const messages = ref( [] );
	/**
	 * null when idle, or { done, total } during a chunked fetch.
	 *
	 * @type {import('vue').Ref<?{done: number, total: number}>}
	 */
	const progress = ref( null );
	/**
	 * Whether the preferences (Settings) dialog is open. Set from the
	 * Twig-rendered nav bar via the bridge in app.js.
	 *
	 * @type {import('vue').Ref<boolean>}
	 */
	const preferencesOpen = ref( false );

	let nextId = 1;

	/**
	 * @param {Object} message
	 * @param {'error'|'warning'|'notice'|'success'} [message.type]
	 * @param {string} message.text Localized, ready to display.
	 * @param {Function} [message.onRetry] When given, the message is
	 *   rendered with a "try again" link invoking this callback.
	 * @return {number} Message id, usable with dismiss().
	 */
	function notify( { type = 'notice', text, onRetry } ) {
		const id = nextId++;
		messages.value.push( { id, type, text, onRetry } );
		return id;
	}

	function dismiss( id ) {
		messages.value = messages.value.filter( ( message ) => message.id !== id );
	}

	function clearMessages() {
		messages.value = [];
	}

	function setProgress( done, total ) {
		progress.value = { done, total };
	}

	function clearProgress() {
		progress.value = null;
	}

	return {
		messages,
		progress,
		preferencesOpen,
		notify,
		dismiss,
		clearMessages,
		setProgress,
		clearProgress
	};
} );
