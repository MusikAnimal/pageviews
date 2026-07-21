/**
 * Client-side file downloads via Blob URLs. The legacy tool used data:
 * URIs, which truncate large exports in some browsers.
 */

/**
 * Prompt the browser to download the given content as a file.
 *
 * @param {string} filename
 * @param {string} content
 * @param {string} [type] MIME type.
 */
export function downloadFile( filename, content, type = 'text/plain' ) {
	const url = URL.createObjectURL( new Blob( [ content ], { type } ) );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = filename;
	document.body.appendChild( link );
	link.click();
	link.remove();
	URL.revokeObjectURL( url );
}
