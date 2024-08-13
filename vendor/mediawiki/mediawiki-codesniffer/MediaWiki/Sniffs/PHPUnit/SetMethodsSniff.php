<?php

namespace MediaWiki\Sniffs\PHPUnit;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Replace calls to MockBuilder::setMethods (deprecated in PHPUnit 8) with MockBuilder::onlyMethods. This is based
 * on the assumption that most such calls do not intend to add new methods (which would require using addMethods).
 * As such, this sniff only serves as a first automatic step, but manual review of replacements is necessary
 * (which shouldn't be hard anyway, as PHPUnit will fail hard if the wrong method is used).
 * This is also not going to trigger for setMethods() calls that don't belong to MockBuilder.
 */
class SetMethodsSniff implements Sniff {
	use PHPUnitTestTrait;

	/**
	 * @inheritDoc
	 */
	public function register(): array {
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
		$tokContent = $tokens[$stackPtr]['content'];

		// We don't care about stuff that's not in a method in a class
		if ( $tokens[$stackPtr]['level'] < 2 || $tokContent !== 'setMethods' ) {
			return;
		}

		$parOpener = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );
		if ( $tokens[$parOpener]['code'] !== T_OPEN_PARENTHESIS ) {
			return;
		}

		$fix = $phpcsFile->addFixableWarning(
			'setMethods is deprecated in PHPUnit 8 and should be replaced with onlyMethods ' .
				'or addMethods',
			$stackPtr,
			'SetMethods'
		);
		if ( !$fix ) {
			return;
		}

		$phpcsFile->fixer->replaceToken( $stackPtr, 'onlyMethods' );
		// Special case: onlyMethods() takes an empty array, not null.
		$firstArgToken = $phpcsFile->findNext( T_WHITESPACE, $parOpener + 1, null, true );
		if ( $tokens[$firstArgToken]['code'] === T_NULL ) {
			$phpcsFile->fixer->replaceToken( $firstArgToken, '[]' );
		}
		return $stackPtr + 1;
	}

}
