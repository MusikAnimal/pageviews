<?php

namespace MediaWiki\Sniffs\WhiteSpace;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Complain about empty lines between the different `use` statements at the top
 * of a file.
 *
 * We deliberately *do* check for multiple empty lines and remove them all,
 * even though MultipleEmptyLinesSniff takes care of that too.
 *
 * @author DannyS712
 * @license GPL-2.0-or-later
 */
class EmptyLinesBetweenUseSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_USE ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return int
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		// Note: this sniff is triggered by the first `use` in a file, and
		// then goes on to process the rest, before returning $phpcsFile->numTokens
		// so that it is only run once

		if ( !empty( $tokens[$stackPtr]['conditions'] ) ) {
			// Not in the global scope
			return $phpcsFile->numTokens;
		}

		// Every `use` after here, if its for imports (rather than using a trait), should
		// be part of this block, so for each T_USE token
		$priorLine = $tokens[$stackPtr]['line'];

		// Tokens for use statements that are not on the subsequent line, to check
		// for issues (not all are due to empty lines, could have comments)
		$toCheck = [];

		$next = $phpcsFile->findNext( T_USE, $stackPtr + 1 );
		while ( $next !== false ) {
			if ( !empty( $tokens[$next]['conditions'] ) ) {
				// We are past the initial `use` statements for imports
				break;
			}
			if ( $tokens[$next]['line'] !== $priorLine + 1 ) {
				$toCheck[] = $next;
			}
			$priorLine = $tokens[$next]['line'];
			$next = $phpcsFile->findNext( T_USE, $next + 1 );
		}

		if ( !$toCheck ) {
			// No need to process further
			return $phpcsFile->numTokens;
		}

		$linesToRemove = [];
		$fix = false;
		foreach ( $toCheck as $checking ) {
			$prior = $checking - 1;
			while ( isset( $tokens[$prior - 1] )
				&& $tokens[$prior]['code'] === T_WHITESPACE
				&& $tokens[$prior]['line'] !== $tokens[$prior - 1]['line']
			) {
				$prior--;
				$linesToRemove[] = $prior;
			}
			if ( $prior !== $checking - 1 ) {
				// We moved back, so there were empty lines
				// $prior is the pointer for the first line break in the series,
				// show the warning on the first empty line
				$fix = $phpcsFile->addFixableWarning(
					'There should not be empty lines between use statements',
					$prior + 1,
					'Found'
				);
			}
		}

		if ( !$fix ) {
			return $phpcsFile->numTokens;
		}

		$phpcsFile->fixer->beginChangeset();
		foreach ( $linesToRemove as $linePtr ) {
			$phpcsFile->fixer->replaceToken( $linePtr, '' );
		}
		$phpcsFile->fixer->endChangeset();

		return $phpcsFile->numTokens;
	}
}
