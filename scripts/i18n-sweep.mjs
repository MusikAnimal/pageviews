// i18n key sweep (per-app porting playbook, step 4): every message key
// referenced in the frontend and Twig must exist in i18n/en.json, and
// every en.json key must be documented in qqq.json. Run via:
//   docker exec pageviews-node-1 npm run i18n:sweep
// Exits non-zero on findings. Dynamically-built keys can't be found by
// grep — when adding one, enumerate it in the hand-maintained list
// below.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Strings that look like keys but aren't (documentation examples).
const IGNORE = new Set( [ 'message-key' ] );

const root = process.cwd();
const en = JSON.parse( readFileSync( join( root, 'i18n/en.json' ), 'utf8' ) );
const defined = new Set( Object.keys( en ) );

const used = new Map(); // key => Set of files

function record( key, file ) {
	if ( IGNORE.has( key ) ) {
		return;
	}
	if ( !used.has( key ) ) {
		used.set( key, new Set() );
	}
	used.get( key ).add( file.replace( root + '/', '' ) );
}

function* walk( dir ) {
	for ( const name of readdirSync( dir ) ) {
		const path = join( dir, name );
		if ( statSync( path ).isDirectory() ) {
			yield* walk( path );
		} else if ( /\.(vue|js|mjs|twig)$/.test( name ) && !/\.test\.js$/.test( name ) ) {
			yield path;
		}
	}
}

// Literal usages. Sources: $i18n(...) in templates, banana.i18n(...) /
// rawI18n(...) / banana.getMessage(...) in JS, msg(...) in Twig,
// v-i18n-html directive args and array bindings.
const patterns = [
	/\$i18n\(\s*'([^']+)'/g,
	/banana\.i18n\(\s*'([^']+)'/g,
	/rawI18n\(\s*'([^']+)'/g,
	/banana\.getMessage\(\s*'([^']+)'/g,
	/\bmsg\(\s*'([^']+)'/g,
	/v-i18n-html:([a-z0-9-]+)/g,
	/v-i18n-html="\[?\s*'([^']+)'/g
];

for ( const file of [ ...walk( join( root, 'assets' ) ), ...walk( join( root, 'templates' ) ), ...walk( join( root, 'src' ) ) ] ) {
	const text = readFileSync( file, 'utf8' );
	for ( const pattern of patterns ) {
		for ( const match of text.matchAll( pattern ) ) {
			record( match[ 1 ], file );
		}
	}
	// i18n keys inside server-side error envelopes: [ 'msg-key', ... ]
	// passed as the $i18n argument to ApiException/invalidParameter.
	for ( const match of text.matchAll( /\[\s*'((?:api|param)-[a-z0-9-]+)'/g ) ) {
		record( match[ 1 ], file );
	}
}

// Dynamically-built keys, enumerated by hand:
const APPS = [ 'pageviews', 'langviews', 'topviews', 'siteviews',
	'massviews', 'redirectviews', 'userviews', 'mediaviews' ];
for ( const app of APPS ) {
	record( app, 'templates/base.html.twig (nav loop)' );
}
// base.html.twig title/description for the apps ported so far
// (pageviews' title key is special-cased to 'title').
record( 'title', 'templates/base.html.twig' );
for ( const app of [ 'pageviews', 'siteviews', 'mediaviews', 'langviews' ] ) {
	if ( app !== 'pageviews' ) {
		record( `${ app }-title`, 'templates/base.html.twig' );
	}
	record( `${ app }-description`, 'templates/base.html.twig' );
}
// Date presets: banana.i18n( range ) over these names.
for ( const range of [ 'this-week', 'this-month', 'last-month', 'this-year', 'last-year', 'all-time' ] ) {
	record( range, 'assets/vue/components/DateRangeInput.vue (presets)' );
}
// StatsTable / Totals average label.
record( 'daily-average', 'assets/vue/apps/pageviews (dateType label)' );
record( 'monthly-average', 'assets/vue/apps/pageviews (dateType label)' );

let failed = false;

const missing = [ ...used.keys() ].filter( ( key ) => !defined.has( key ) ).sort();
if ( missing.length ) {
	failed = true;
	console.log( 'MISSING KEYS:' );
	for ( const key of missing ) {
		console.log( `  ${ key }  ←  ${ [ ...used.get( key ) ].join( ', ' ) }` );
	}
} else {
	console.log( `OK: all ${ used.size } referenced keys exist in en.json.` );
}

// qqq must document every en.json key (translatewiki requirement).
const qqq = JSON.parse( readFileSync( join( root, 'i18n/qqq.json' ), 'utf8' ) );
const undocumented = Object.keys( en )
	.filter( ( key ) => key !== '@metadata' && !( key in qqq ) );
if ( undocumented.length ) {
	failed = true;
	console.log( `\nIN en.json BUT NOT qqq.json: ${ undocumented.join( ', ' ) }` );
} else {
	console.log( 'OK: every en.json key is documented in qqq.json.' );
}

process.exit( failed ? 1 : 0 );
