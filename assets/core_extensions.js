/**
 * Core JavaScript extensions, either to native JS or a library.
 */

String.prototype.descore = function () {
	return this.replace( /_/g, ' ' );
};
String.prototype.score = function () {
	return this.replace( / /g, '_' );
};
String.prototype.upcase = function () {
	return this.charAt( 0 ).toUpperCase() + this.slice( 1 );
};
String.prototype.escape = function () {
	const entityMap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
		'/': '&#x2F;'
	};

	return this.replace( /[&<>"'\/]/g, ( s ) => entityMap[ s ] );
};

// remove duplicate values from Array
Array.prototype.unique = function () {
	return [ ...new Set( this ) ];
};
