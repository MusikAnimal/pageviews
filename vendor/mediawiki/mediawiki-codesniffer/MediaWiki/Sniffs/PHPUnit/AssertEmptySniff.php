<?php

namespace MediaWiki\Sniffs\PHPUnit;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Warn when using PHPUnit's looser assertEmpty()
 *
 * @author DannyS712
 * @license GPL-2.0-or-later
 */
class AssertEmptySniff implements Sniff {
	use PHPUnitTestTrait;

	/**
	 * @inheritDoc
	 */
	public function register() {
		return [ T_STRING ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 *
	 * @return void|int
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		if ( !$this->isTestFile( $phpcsFile, $stackPtr ) ) {
			return $phpcsFile->numTokens;
		}

		$tokens = $phpcsFile->getTokens();

		// Only check code in a method in a class
		if ( $tokens[$stackPtr]['level'] < 2 ) {
			return;
		}

		// Ensure its the right method name
		if ( $tokens[$stackPtr]['content'] !== 'assertEmpty' ) {
			return;
		}

		$openParen = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );

		// If the next non-whitespace token isn't parenthesis, its not a call to assertEmpty
		if ( !isset( $tokens[$openParen]['parenthesis_closer'] ) ) {
			return $openParen;
		}

		$phpcsFile->addWarning(
			'assertEmpty performs loose comparisons and should not be used.',
			$stackPtr,
			'AssertEmptyUsed'
		);

		// Minimum number of tokens before the next possible assertEmpty
		return $tokens[$openParen]['parenthesis_closer'] + 4;
	}

}
