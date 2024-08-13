<?php

/**
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */

namespace MediaWiki\Sniffs\PHPUnit;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Fix uses of assertEquals/assertNotEquals or assertSame/assertNotSame with the actual value before the expected
 * Currently, only catches assertions where the actual value is a variable, or at least
 * starts with a variable token, and the expected is a literal value or a variable in the form
 * $expected*, or an array of such values (including nested arrays).
 *
 * @author DannyS712
 */
class AssertionOrderSniff implements Sniff {
	use PHPUnitTestTrait;

	private const ASSERTIONS = [
		'assertEquals' => true,
		'assertSame' => true,
		'assertNotEquals' => true,
		'assertNotSame' => true,
	];

	private const LITERALS = [
		T_NULL => T_NULL,
		T_FALSE => T_FALSE,
		T_TRUE => T_TRUE,
		T_LNUMBER => T_LNUMBER,
		T_DNUMBER => T_DNUMBER,
		T_CONSTANT_ENCAPSED_STRING => T_CONSTANT_ENCAPSED_STRING,
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
		if ( $tokens[$stackPtr]['level'] < 2 ) {
			// Needs to be in a method in a class
			return;
		}

		$assertion = $tokens[$stackPtr]['content'];
		if ( !isset( self::ASSERTIONS[$assertion] ) ) {
			// Don't care about this string
			return;
		}

		$opener = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );
		if ( !isset( $tokens[$opener]['parenthesis_closer'] ) ) {
			// Needs to be a method call
			return $opener;
		}

		$fixInfo = $this->getFixInfo( $phpcsFile, $opener );
		if ( !$fixInfo ) {
			// No warning
			return;
		}
		$end = $tokens[$opener]['parenthesis_closer'];

		$fix = $phpcsFile->addFixableWarning(
			'The expected value goes before the actual value in assertions',
			$stackPtr,
			'WrongOrder'
		);
		if ( !$fix ) {
			// There is no way the next assertion can be closer than this
			return $end + 4;
		}

		[ $firstParamStart, $firstComma, $afterSecondParam ] = $fixInfo;
		// The first parameter currently goes from $firstParamStart until $firstComma, and the
		// second parameter goes from after $firstComma until before $afterSecondParam
		$actualParamEnd = $phpcsFile->findPrevious( T_WHITESPACE, $firstComma - 1, null, true );
		$actualParamContent = $phpcsFile->getTokensAsString(
			$firstParamStart,
			$actualParamEnd - $firstParamStart + 1,
			// keep tabs on multiline statements
			true
		);

		$expectedParamStart = $phpcsFile->findNext(
			T_WHITESPACE,
			$firstComma + 1,
			$end,
			true
		);
		$expectedParamEnd = $phpcsFile->findPrevious(
			T_WHITESPACE,
			$afterSecondParam - 1,
			null,
			true
		);
		$expectedParamContent = $phpcsFile->getTokensAsString(
			$expectedParamStart,
			$expectedParamEnd - $expectedParamStart + 1,
			// keep tabs on multiline statements
			true
		);

		$phpcsFile->fixer->beginChangeset();

		// Remove the first parameter that previously held the actual value,
		// and replace with the expected
		$phpcsFile->fixer->replaceToken( $firstParamStart, $expectedParamContent );
		for ( $i = $firstParamStart + 1; $i <= $actualParamEnd; $i++ ) {
			$phpcsFile->fixer->replaceToken( $i, '' );
		}

		// Remove the second parameter that previously held the expeced value,
		// and replace with the actual
		$phpcsFile->fixer->replaceToken( $expectedParamStart, $actualParamContent );
		for ( $i = $expectedParamStart + 1; $i <= $expectedParamEnd; $i++ ) {
			$phpcsFile->fixer->replaceToken( $i, '' );
		}

		$phpcsFile->fixer->endChangeset();

		// There is no way the next assertion can be closer than this
		return $end + 4;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $opener
	 * @return array|false Array with info for fixing, or false for no change
	 */
	private function getFixInfo(
		File $phpcsFile,
		int $opener
	) {
		$tokens = $phpcsFile->getTokens();
		$end = $tokens[$opener]['parenthesis_closer'];

		// Optimize for the most common case: the first parameter is a single token
		// that is a literal, and then there is a comma.
		$firstParam = $phpcsFile->findNext( T_WHITESPACE, $opener + 1, $end, true );
		if ( !$firstParam ) {
			// Assertion is invalid (no parameters) but thats not our problem
			return false;
		}
		if ( isset( self::LITERALS[ $tokens[$firstParam]['code'] ] )
			&& isset( $tokens[$firstParam + 1] )
			&& $tokens[$firstParam + 1]['code'] === T_COMMA
		) {
			return false;
		}

		// Analyze the assertion call
		$currentParam = 1;
		// Whether or not the first parameter has variables or method calls that might
		// make sense to put as the actual parameter instead
		$firstParamVariable = false;
		$firstComma = false;
		$secondComma = false;
		$searchTokens = [
			T_DOUBLE_QUOTED_STRING,
			T_HEREDOC,
			T_START_HEREDOC,
			T_OPEN_CURLY_BRACKET,
			T_OPEN_SQUARE_BRACKET,
			T_OPEN_PARENTHESIS,
			T_OPEN_SHORT_ARRAY,
			T_CLOSE_SHORT_ARRAY,
			T_STRING,
			T_VARIABLE,
			T_COMMA,
		];
		$next = $firstParam;
		// For ignoring commas within a literal array in the actual (but should be expected)
		// parameter, including nested arrays, keep track of the closing of the outermost
		// current array
		$arrayEndIndex = -1;
		while ( $secondComma === false ) {
			if ( $next === false ) {
				// If we are in the first parameter and there is no comma,
				// likely live coding. If we are in the second, then it just
				// means that there is third parameter (message)
				if ( $currentParam === 1 ) {
					return false;
				}
				// Second parameter ended
				break;
			}
			switch ( $tokens[$next]['code'] ) {
				// Some things we just don't handle
				case T_DOUBLE_QUOTED_STRING:
				case T_HEREDOC:
				case T_START_HEREDOC:
					return false;

				case T_OPEN_SHORT_ARRAY:
					// Commas within an array in the second parameter should
					// not be treated as separating parameters to the assertion,
					// the start of a nested array does not change the end of
					// the outer array
					if ( $currentParam === 2
						&& $arrayEndIndex === -1
						&& isset( $tokens[$next]['bracket_closer'] )
					) {
						$arrayEndIndex = $tokens[$next]['bracket_closer'];
						break;
					}
					// Intentional fall through for handling first parameter

				case T_OPEN_CURLY_BRACKET:
				case T_OPEN_SQUARE_BRACKET:
				case T_OPEN_PARENTHESIS:
					// Only skipping to the end of these in the first parameter,
					// need to count them in the second one
					if ( $currentParam === 1 ) {
						if ( isset( $tokens[$next]['parenthesis_closer'] ) ) {
							// jump to closing parenthesis to ignore commas between opener and closer
							$next = $tokens[$next]['parenthesis_closer'];
						} elseif ( isset( $tokens[$next]['bracket_closer'] ) ) {
							// jump to closing bracket
							$next = $tokens[$next]['bracket_closer'];
						}
					}
					break;

				case T_CLOSE_SHORT_ARRAY:
					// If we reached the end of the correct array in the
					// second parameter, further commas should be treated as
					// separating parameters to the assertion
					if ( $next === $arrayEndIndex ) {
						$arrayEndIndex = -1;
					}
					break;

				case T_VARIABLE:
					if ( $currentParam === 2 ) {
						// We are looking at the second parameter, which
						// should be the actual value. Since the actual value
						// includes a variable or function call, its probably correct,
						// unless the variable is named $expected*, in which
						// case we can assume that it was meant to be the
						// expected value, not the actual value
						$expectedVarName = $tokens[$next]['content'];
						// optimize for common case - full name is $expected
						if ( $expectedVarName !== '$expected'
							// but also handle $expectedRes and similar
							&& !str_starts_with( $expectedVarName, '$expected' )
						) {
							return false;
						}
						// Don't set $firstParamVariable if this is the
						// second param
						break;
					}
					$firstParamVariable = true;
					break;

				case T_STRING:
					// Check if its a function call
					$functionOpener = $phpcsFile->findNext(
						T_WHITESPACE,
						$next + 1,
						$end,
						true
					);
					if ( $functionOpener &&
						isset( $tokens[$functionOpener]['parenthesis_closer'] )
					) {
						// Function call, similar to T_VARIABLE handling
						if ( $currentParam === 2 ) {
							return false;
						}
						$firstParamVariable = true;
						// Jump over the function call, no need to wait until
						// the next iteration triggers with T_OPEN_PARENTHESIS
						$next = $tokens[$functionOpener]['parenthesis_closer'];
					}
					break;

				case T_COMMA:
					// Ignore commas within arrays
					if ( $arrayEndIndex !== -1 ) {
						break;
					}
					if ( $currentParam === 1 ) {
						if ( $firstParamVariable === false ) {
							// No need to check the second parameter,
							// the first one had no variables or
							// method calls that would make sense as
							// the actual parameter
							return false;
						}
						$firstComma = $next;
						$currentParam = 2;
					} else {
						// Triggers the end of the while loop
						$secondComma = $next;
					}
					break;
			}
			$next = $phpcsFile->findNext( $searchTokens, $next + 1, $end );
		}

		// If we got here, then there were no variables or methods in the second parameter,
		// which should have been the actual value. Should switch with the first parameter.
		$afterSecondParam = ( $secondComma ?: $end );
		return [ $firstParam, $firstComma, $afterSecondParam ];
	}

}
