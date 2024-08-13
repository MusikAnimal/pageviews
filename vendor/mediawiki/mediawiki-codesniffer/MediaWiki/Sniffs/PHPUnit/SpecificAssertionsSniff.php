<?php

namespace MediaWiki\Sniffs\PHPUnit;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Replace generic assertions about specific conditions
 *   - assertArrayHasKey (and assertArrayNotHasKey)
 *   - assertContains (and assertNotContains)
 *   - assertStringContainsString (and assertStringNotContainsString)
 *   - assertIsArray (and assertIsNotArray)
 *   - assertEmpty (and assertNotEmpty)
 *
 * @author DannyS712
 * @license GPL-2.0-or-later
 */
class SpecificAssertionsSniff implements Sniff {
	use PHPUnitTestTrait;

	private const ASSERTIONS = [
		'assertTrue' => [
			'array_key_exists' => 'assertArrayHasKey',
			'empty' => 'assertEmpty',
			'in_array' => 'assertContains',
			'is_array' => 'assertIsArray',
		],
		'assertFalse' => [
			'array_key_exists' => 'assertArrayNotHasKey',
			'empty' => 'assertNotEmpty',
			'in_array' => 'assertNotContains',
			'is_array' => 'assertIsNotArray',
			'strpos' => 'assertStringNotContainsString',
		],
		'assertNotFalse' => [
			'strpos' => 'assertStringContainsString',
		],
		'assertIsInt' => [
			'strpos' => 'assertStringContainsString',
		],
	];

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
		$assertion = $tokens[$stackPtr]['content'];

		// We don't care about stuff that's not in a method in a class
		if ( $tokens[$stackPtr]['level'] < 2 || !isset( self::ASSERTIONS[$assertion] ) ) {
			return;
		}

		// now a map of the method name that is within the assertion to the new assertion name
		$relevantReplacements = self::ASSERTIONS[$assertion];

		$opener = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );
		if ( !isset( $tokens[$opener]['parenthesis_closer'] ) ) {
			// Looks like this string is not a method call
			return $opener;
		}

		$method = $phpcsFile->findNext( T_WHITESPACE, $opener + 1, null, true );
		$functionCalled = $tokens[$method]['content'];
		// assertEmpty/assertNotEmpty look for empty() which is T_EMPTY
		if (
			(
				$tokens[$method]['code'] !== T_STRING
				&& $tokens[$method]['code'] !== T_EMPTY
			)
			|| !isset( $relevantReplacements[ $functionCalled ] )
		) {
			return $method;
		}

		$replacementMethod = $relevantReplacements[ $functionCalled ];

		$methodOpener = $phpcsFile->findNext( T_WHITESPACE, $method + 1, null, true );
		if ( !isset( $tokens[$methodOpener]['parenthesis_closer'] ) ) {
			// Looks like this string is not a method call
			return $methodOpener;
		}

		$methodCloser = $tokens[$methodOpener]['parenthesis_closer'];
		$afterMethod = $phpcsFile->findNext( T_WHITESPACE, $methodCloser + 1, null, true );
		if ( !in_array( $tokens[$afterMethod]['code'], [ T_COMMA, T_CLOSE_PARENTHESIS ] ) ) {
			// Not followed by a comma and a second parameter, or a closing parenthesis
			// something more complex is going on
			return;
		}

		$methodContentStart = $phpcsFile->findNext( T_WHITESPACE, $methodOpener + 1, null, true );
		$methodContentEnd = $phpcsFile->findPrevious( T_WHITESPACE, $methodCloser - 1, null, true );

		// Depending on the function, if there is a third parameter we might not be able
		// to fix it. We need $firstComma later, so declare it outside of the if statement,
		// and declare $secondComma here too so that they stay together
		$firstComma = false;
		$secondComma = false;
		if ( $functionCalled === 'in_array' || $functionCalled === 'strpos' ) {
			// Jump over the first two parameters, whatever they may be
			$searchTokens = [
				T_OPEN_CURLY_BRACKET,
				T_OPEN_SQUARE_BRACKET,
				T_OPEN_PARENTHESIS,
				T_OPEN_SHORT_ARRAY,
				T_COMMA
			];
			$next = $phpcsFile->findNext( $searchTokens, $methodOpener + 1, $methodCloser );
			while ( $secondComma === false ) {
				if ( $next === false ) {
					// No token
					break;
				}
				switch ( $tokens[$next]['code'] ) {
					case T_OPEN_CURLY_BRACKET:
					case T_OPEN_SQUARE_BRACKET:
					case T_OPEN_PARENTHESIS:
					case T_OPEN_SHORT_ARRAY:
						if ( isset( $tokens[$next]['parenthesis_closer'] ) ) {
							// jump to closing parenthesis to ignore commas between opener and closer
							$next = $tokens[$next]['parenthesis_closer'];
						} elseif ( isset( $tokens[$next]['bracket_closer'] ) ) {
							// jump to closing bracket
							$next = $tokens[$next]['bracket_closer'];
						}
						break;
					case T_COMMA:
						if ( $firstComma === false ) {
							$firstComma = $next;
						} else {
							$secondComma = $next;
						}
				}
				$next = $phpcsFile->findNext( $searchTokens, $next + 1, $methodCloser );
			}
			if ( $firstComma === false ) {
				// Huh? Bad function call
				return;
			}
			if ( $secondComma !== false && $functionCalled === 'strpos' ) {
				// We can't do the replacement if there is a third parameter
				return;
			}
			if ( $secondComma !== false && $functionCalled === 'in_array' ) {
				// If we wanted to be exact, we would replace in_array with
				// assertContainsEqual, but since that is less specific than
				// assertContains, we always use assertContains, even if the in_array
				// call didn't have a third parameter (true) passed. This *may* result
				// in the autofix causing tests to fail - if the decision to use in_array
				// without a third parameter true was intentional, replace the assertContains
				// with assertContainsEqual manually
				$next = $phpcsFile->findNext( T_WHITESPACE, $secondComma + 1, $methodCloser, true );
				if ( $tokens[$next]['code'] === T_FALSE ) {
					// false is the default, no need for anything with the assertion
					// just need to delete the parameter
					$methodContentEnd = $phpcsFile->findPrevious( T_WHITESPACE, $secondComma - 1, null, true );
				} elseif ( $tokens[$next]['code'] === T_TRUE ) {
					// here we would switch from assertContainsEqual to assertContains
					// but as noted above we're always using assertContains
					$methodContentEnd = $phpcsFile->findPrevious( T_WHITESPACE, $secondComma - 1, null, true );
				} else {
					// third parameter is something else, can't handle
					return;
				}
				// make sure there is nothing else making things weird
				$next = $phpcsFile->findNext( T_WHITESPACE, $next + 1, $methodCloser, true );
				if ( $next ) {
					// something like `true || $var` just to mess with us...
					return;
				}
			}
		}

		$fix = $phpcsFile->addFixableWarning(
			'%s should be used instead of manually using %s with the result of %s',
			$stackPtr,
			$replacementMethod,
			[ $replacementMethod, $assertion, $functionCalled ]
		);
		if ( !$fix ) {
			return;
		}

		$phpcsFile->fixer->beginChangeset();

		// Need to switch the order of parameters from strpos to assertStringContainsString
		if ( $functionCalled === 'strpos' ) {
			// strpos( $param1, $param2 )
			$nonSpaceAfterFirstComma = $phpcsFile->findNext( T_WHITESPACE, $firstComma + 1, null, true );
			$param1 = $phpcsFile->getTokensAsString(
				$methodContentStart,
				$firstComma - $methodContentStart,
				// keep tabs on multiline statements
				true
			);
			$param2 = $phpcsFile->getTokensAsString(
				$nonSpaceAfterFirstComma,
				$methodContentEnd - $nonSpaceAfterFirstComma + 1,
				// keep tabs on multiline statements
				true
			);
			// Remove the params
			for ( $i = $methodContentStart; $i <= $methodContentEnd; $i++ ) {
				if ( $i < $firstComma || $i >= $nonSpaceAfterFirstComma ) {
					$phpcsFile->fixer->replaceToken( $i, '' );
				}
			}
			// We got ride of the content before the comma and the content after,
			// now add the switched content around the comma
			$phpcsFile->fixer->addContent( $nonSpaceAfterFirstComma, $param1 );
			$phpcsFile->fixer->addContentBefore( $firstComma, $param2 );
		}

		$phpcsFile->fixer->replaceToken( $stackPtr, $replacementMethod );
		$phpcsFile->fixer->replaceToken( $method, '' );
		$phpcsFile->fixer->replaceToken( $methodOpener, '' );
		for ( $i = $methodOpener + 1; $i < $methodContentStart; $i++ ) {
			// Whitespace between function ( and the content
			$phpcsFile->fixer->replaceToken( $i, '' );
		}
		for ( $i = $methodContentEnd + 1; $i < $methodCloser; $i++ ) {
			// Whitespace between content and ) (could also include the optional third
			// parameter for in_array)
			$phpcsFile->fixer->replaceToken( $i, '' );
		}
		$phpcsFile->fixer->replaceToken( $methodCloser, '' );

		$phpcsFile->fixer->endChangeset();

		// There is no way the next assertion can be closer than this
		return $tokens[$opener]['parenthesis_closer'] + 4;
	}

}
