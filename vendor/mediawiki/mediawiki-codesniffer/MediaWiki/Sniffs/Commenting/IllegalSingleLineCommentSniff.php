<?php
/**
 * Detect and fix the inline comments start or end with multiple asterisks.
 * Fail: /*** Comment here *\/
 * Fail: /*** Comments here again ***\/
 * Pass: /* Your comments here *\/
 */

namespace MediaWiki\Sniffs\Commenting;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

class IllegalSingleLineCommentSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [
			T_COMMENT
		];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The index of current token.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();
		$currentToken = $tokens[$stackPtr];

		if ( str_starts_with( $currentToken['content'], '/*' ) ) {
			// Possible inline comment
			if ( !str_ends_with( $currentToken['content'], '*/' ) ) {
				// Whether it's a comment across multiple lines
				$numOfTokens = $phpcsFile->numTokens;
				for ( $i = $stackPtr + 1; $i < $numOfTokens; $i++ ) {
					$token = $tokens[$i];
					if ( ( $token['code'] !== T_COMMENT && $token['code'] !== T_WHITESPACE ) || (
						!str_starts_with( $token['content'], '/*' ) &&
						str_ends_with( $token['content'], '*/' )
					) ) {
						return;
					}
				}
				$fix = $phpcsFile->addFixableError(
					'Missing proper ending of a single line comment',
					$stackPtr,
					'MissingCommentEnding'
				);
				if ( $fix ) {
					$phpcsFile->fixer->replaceToken(
						$stackPtr,
						rtrim( $currentToken['content'] ) . ' */' . $phpcsFile->eolChar
					);
				}
			} else {
				// Determine whether multiple "*" appears right before the "*/"
				if ( preg_match( '/(\*){2,}\//', $currentToken['content'] ) !== 0 ) {
					$fix = $phpcsFile->addFixableWarning(
						'Invalid end of a single line comment',
						$stackPtr,
						'IllegalSingleLineCommentEnd'
					);
					if ( $fix ) {
						$phpcsFile->fixer->replaceToken(
							$stackPtr,
							preg_replace( '/(\*){2,}\//', '*/', $currentToken['content'] )
						);
					}
				}
			}
		}
	}
}
