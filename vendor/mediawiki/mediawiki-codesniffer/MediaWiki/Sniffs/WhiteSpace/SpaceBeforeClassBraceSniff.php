<?php
/**
 * make sure a space before class open brace.
 * fail: class TestClass\t{
 * fail: class TestClass{
 * fail: class TestClass   {
 * pass: class TestClass {
 */

namespace MediaWiki\Sniffs\WhiteSpace;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;
use UnexpectedValueException;

class SpaceBeforeClassBraceSniff implements Sniff {
	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return Tokens::$ooScopeTokens;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The index of current token.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();
		if ( !isset( $tokens[$stackPtr]['scope_opener'] ) ) {
			return;
		}
		$structKeyword = $this->getStructureKeyword( $tokens[$stackPtr]['code'] );
		$openBrace = $tokens[$stackPtr]['scope_opener'];
		// Find previous non-whitespace token from the opening brace
		$pre = $phpcsFile->findPrevious( T_WHITESPACE, $openBrace - 1, null, true );

		$afterClass = $stackPtr;
		if ( $tokens[$stackPtr]['code'] === T_ANON_CLASS && isset( $tokens[$stackPtr]['parenthesis_closer'] ) ) {
			// The anon class could be multi-line, start after the class definition
			$afterClass = $tokens[$stackPtr]['parenthesis_closer'];
		}

		if ( $tokens[$openBrace]['line'] - $tokens[$afterClass]['line'] >= 2 ) {
			// If the class ... { statement is more than two lines, then
			// the { should be on a line by itself.
			if ( $tokens[$pre]['line'] === $tokens[$openBrace]['line'] ) {
				$fix = $phpcsFile->addFixableWarning(
					"Expected $structKeyword open brace to be on a new line",
					$openBrace,
					'BraceNotOnOwnLine'
				);
				if ( $fix ) {
					$phpcsFile->fixer->addNewlineBefore( $openBrace );
				}
			}
			return;
		}
		$spaceCount = 0;
		for ( $start = $pre + 1; $start < $openBrace; $start++ ) {
			$content = $tokens[$start]['content'];
			$contentSize = strlen( $content );
			$spaceCount += $contentSize;
		}

		if ( $spaceCount !== 1 ) {
			$fix = $phpcsFile->addFixableWarning(
				"Expected 1 space before $structKeyword open brace. Found %s.",
				$openBrace,
				'NoSpaceBeforeBrace',
				[ $spaceCount ]
			);
			if ( $fix ) {
				$phpcsFile->fixer->beginChangeset();
				$phpcsFile->fixer->replaceToken( $openBrace, '' );
				$phpcsFile->fixer->addContent( $pre, ' {' );
				$phpcsFile->fixer->endChangeset();
			}
		}

		if ( $tokens[$openBrace]['line'] !== $tokens[$pre]['line'] ) {
			$fix = $phpcsFile->addFixableWarning(
				"Expected $structKeyword open brace to be on the same line as the `$structKeyword` keyword.",
				$openBrace,
				'BraceNotOnSameLine'
			);
			if ( $fix ) {
				$phpcsFile->fixer->beginChangeset();
				for ( $i = $pre + 1; $i < $openBrace; $i++ ) {
					$phpcsFile->fixer->replaceToken( $i, '' );
				}
				$phpcsFile->fixer->endChangeset();
			}
		}
	}

	/**
	 * Returns the keyword used to define the OOP structure of the given type.
	 *
	 * @param int|string $tokenType
	 * @return string
	 */
	private function getStructureKeyword( $tokenType ): string {
		switch ( $tokenType ) {
			case T_CLASS:
			case T_ANON_CLASS:
				return 'class';
			case T_INTERFACE:
				return 'interface';
			case T_TRAIT:
				return 'trait';
			case T_ENUM:
				return 'enum';
			default:
				throw new UnexpectedValueException( "Token $tokenType not handled" );
		}
	}
}
