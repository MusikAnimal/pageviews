<?php
/**
 * Sniff to warn when keywords are used as functions, such as:
 * Pass: clone $obj
 * Fail: clone( $obj )
 * Pass: require 'path/to/file.php';
 * Fail: require( 'path/to/file' );
 *
 * Covers:
 * * clone
 * * require
 * * require_once
 * * include
 * * include_once
 */

namespace MediaWiki\Sniffs\ExtraCharacters;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

class ParenthesesAroundKeywordSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [
			T_CLONE,
			T_REQUIRE,
			T_REQUIRE_ONCE,
			T_INCLUDE,
			T_INCLUDE_ONCE,
			T_BREAK,
			T_CONTINUE,
		];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		$opener = $phpcsFile->findNext( [ T_WHITESPACE ], $stackPtr + 1, null, true );
		if ( $opener === false ||
			$tokens[$opener]['code'] !== T_OPEN_PARENTHESIS ||
			!isset( $tokens[$opener]['parenthesis_closer'] )
		) {
			// not a whitespace and parenthesis after the keyword, possible a comment or live coding
			return;
		}

		$fix = $phpcsFile->addFixableWarning(
			'%s keyword must not be used as a function.',
			$opener,
			'ParenthesesAroundKeywords',
			[ $tokens[$stackPtr]['content'] ]
		);

		if ( $fix ) {
			$phpcsFile->fixer->beginChangeset();
			if ( $tokens[$stackPtr + 1]['code'] !== T_WHITESPACE ) {
				// Ensure the both tokens are not mangled together without space
				$phpcsFile->fixer->addContent( $stackPtr, ' ' );
			}

			$phpcsFile->fixer->replaceToken( $opener, '' );
			// remove whitespace after the opener
			if ( $tokens[$opener + 1]['code'] === T_WHITESPACE ) {
				$phpcsFile->fixer->replaceToken( $opener + 1, '' );
			}

			$closer = $tokens[$opener]['parenthesis_closer'];
			$phpcsFile->fixer->replaceToken( $closer, '' );
			// remove whitespace before the closer
			if ( $tokens[$closer - 1]['code'] === T_WHITESPACE ) {
				$phpcsFile->fixer->replaceToken( $closer - 1, '' );
			}
			$phpcsFile->fixer->endChangeset();
		}
	}
}
