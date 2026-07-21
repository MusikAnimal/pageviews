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

	let nextId = 1;

	/**
	 * @param {Object} message
	 * @param {'error'|'warning'|'notice'|'success'} [message.type]
	 * @param {string} message.text Localized, ready to display.
	 * @return {number} Message id, usable with dismiss().
	 */
	function notify( { type = 'notice', text } ) {
		const id = nextId++;
		messages.value.push( { id, type, text } );
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
		notify,
		dismiss,
		clearMessages,
		setProgress,
		clearProgress
	};
} );
