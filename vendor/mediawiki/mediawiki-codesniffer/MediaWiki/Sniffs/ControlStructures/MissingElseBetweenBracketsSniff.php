<?php

namespace MediaWiki\Sniffs\ControlStructures;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Sniff for missing control structures between closing and opening brackets.
 *
 * Fail: if ( $a ) { functionCall(); } { somethingElse(); }
 * Pass: if ( $a ) { functionCall(); } else { somethingElse(); }
 * Pass: "{{a}} {{b}}"
 *
 * @author Taavi "Majavah" Väänänen
 */
class MissingElseBetweenBracketsSniff implements Sniff {
	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [
			T_CLOSE_CURLY_BRACKET,
		];
	}

	/**
	 * @inheritDoc
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();
		$next = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );

		if ( $tokens[$next]['code'] === T_OPEN_CURLY_BRACKET ) {
			$phpcsFile->addError(
				'Missing `else` between closing an opening and closing bracket',
				$next,
				'Missing'
			);
		}
	}
}
