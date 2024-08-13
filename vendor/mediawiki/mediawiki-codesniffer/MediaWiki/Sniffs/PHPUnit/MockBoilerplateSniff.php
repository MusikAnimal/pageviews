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
 * Simplify set up of mocks in PHPUnit test cases:
 *   ->will( $this->returnValue( ... ) ) becomes ->willReturn( ... )
 *        as well as other ->will() shortcuts, see PHPUnit docs table 8.1
 *   ->with( $this->equalTo( ... ) ) becomes ->with( ... ), for any number of parameters provided,
 *        since equalTo() is the default constraint checked if a value is provided (as long as the
 *        equalTo() call only had a single parameter)
 *   ->exactly( 1 ) becomes ->once()
 *   ->exactly( 0 ) becomes ->never()
 *
 * Potential future improvements include
 *   - replace unneeded $this->any() calls, i.e.
 *     ->expects( $this->any() )->method( ... ) becomes ->method( ... )
 *
 *   - apply the with() replacements to withConsecutive() as well
 *
 * @author DannyS712
 */
class MockBoilerplateSniff implements Sniff {
	use PHPUnitTestTrait;

	/** @var array */
	private const RELEVANT_METHODS = [
		'exactly' => 'exactly',
		'will' => 'will',
		'with' => 'with',
	];

	/** @var array */
	private const WILL_REPLACEMENTS = [
		'returnValue' => 'willReturn',
		'returnArgument' => 'willReturnArgument',
		'returnCallback' => 'willReturnCallback',
		'returnValueMap' => 'willReturnMap',
		'onConsecutiveCalls' => 'willReturnOnConsecutiveCalls',
		'returnSelf' => 'willReturnSelf',
		'throwException' => 'willThrowException',
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

		$methodName = $tokens[$stackPtr]['content'];
		if ( !isset( self::RELEVANT_METHODS[ $methodName ] ) ) {
			// Not a method we care about
			return;
		}

		$methodOpener = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );
		if ( !isset( $tokens[$methodOpener]['parenthesis_closer'] ) ) {
			// Needs to be a method call
			return $methodOpener + 1;
		}

		switch ( $methodName ) {
			case 'exactly':
				return $this->handleExactly( $phpcsFile, $stackPtr, $methodOpener );
			case 'will':
				return $this->handleWill( $phpcsFile, $stackPtr, $methodOpener );
			case 'with':
				return $this->handleWith( $phpcsFile, $methodOpener );
		}
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param int $exactlyOpener
	 *
	 * @return void|int
	 */
	public function handleExactly( File $phpcsFile, $stackPtr, $exactlyOpener ) {
		$tokens = $phpcsFile->getTokens();

		$exactlyCloser = $tokens[$exactlyOpener]['parenthesis_closer'];

		$exactlyNumPtr = $phpcsFile->findNext(
			T_WHITESPACE,
			$exactlyOpener + 1,
			$exactlyCloser,
			true
		);
		if ( !$exactlyNumPtr
			|| $tokens[$exactlyNumPtr]['code'] !== T_LNUMBER
		) {
			// Not going to be ->exactly( 0 ) or ->exactly( 1 )
			return;
		}

		// Figure out if it is indeed 0 or 1
		if ( $tokens[$exactlyNumPtr]['content'] === '0' ) {
			$exactlyShortcut = 'never';
		} elseif ( $tokens[$exactlyNumPtr]['content'] === '1' ) {
			$exactlyShortcut = 'once';
		} else {
			// no shortcut
			return;
		}

		// Make sure it is only the 0 or 1, not something like ->exactly( 1 + $num )
		$afterNum = $phpcsFile->findNext( T_WHITESPACE, $exactlyNumPtr + 1, $exactlyCloser, true );
		if ( $afterNum ) {
			return;
		}

		// For reference, here are the different pointers we have stored
		//
		//          $exactlyNumPtr
		//  $stackPtr   |     $exactlyCloser
		//     \        |      /
		//  ->exactly(  0     )
		//           |
		//    $exactlyOpener
		//
		// ($exactlyNumPtr could point to a 1 instead of a 0)
		// and we want to replace from $stackPtr until $exactlyCloser with the shortcut
		// plus a ()

		$warningName = ( $exactlyShortcut === 'never' ? 'ExactlyNever' : 'ExactlyOnce' );
		$fix = $phpcsFile->addFixableWarning(
			'Matcher ->exactly( %s ) should be replaced with shortcut ->%s()',
			$stackPtr,
			$warningName,
			[ $tokens[$exactlyNumPtr]['content'], $exactlyShortcut ]
		);

		if ( !$fix ) {
			// There is no way the next issue can be closer than this
			return $exactlyCloser;
		}

		$phpcsFile->fixer->beginChangeset();

		// Remove from after $stackPtr up to and including $exactlyCloser, so that if
		// they are split over multiple lines we don't leave an ugly mess
		for ( $i = $stackPtr + 1; $i <= $exactlyCloser; $i++ ) {
			$phpcsFile->fixer->replaceToken( $i, '' );
		}
		// Replace $stackPtr's exactly with the shortcut
		$phpcsFile->fixer->replaceToken( $stackPtr, $exactlyShortcut . '()' );

		$phpcsFile->fixer->endChangeset();

		// There is no way the next issue can be closer that this
		return $exactlyCloser;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param int $willOpener
	 *
	 * @return void|int
	 */
	public function handleWill( File $phpcsFile, $stackPtr, $willOpener ) {
		$tokens = $phpcsFile->getTokens();

		$willCloser = $tokens[$willOpener]['parenthesis_closer'];

		$thisPtr = $phpcsFile->findNext( T_WHITESPACE, $willOpener + 1, $willCloser, true );
		if ( !$thisPtr
			|| $tokens[$thisPtr]['code'] !== T_VARIABLE
			|| $tokens[$thisPtr]['content'] !== '$this'
		) {
			// Not going to be $this->
			return;
		}

		$objectOperatorPtr = $phpcsFile->findNext( T_WHITESPACE, $thisPtr + 1, $willCloser, true );
		if ( !$objectOperatorPtr
			|| $tokens[$objectOperatorPtr]['code'] !== T_OBJECT_OPERATOR
		) {
			// Not $this->
			return;
		}

		$methodStubPtr = $phpcsFile->findNext( T_WHITESPACE, $objectOperatorPtr + 1, $willCloser, true );
		if ( !$methodStubPtr
			|| $tokens[$methodStubPtr]['code'] !== T_STRING
			|| !isset( self::WILL_REPLACEMENTS[ $tokens[$methodStubPtr]['content'] ] )
		) {
			// Not $this-> followed by a method name we care about
			return;
		}

		$stubOpener = $phpcsFile->findNext( T_WHITESPACE, $methodStubPtr + 1, $willCloser, true );
		if ( !$stubOpener
			|| !isset( $tokens[$stubOpener]['parenthesis_closer'] )
		) {
			// String is not a method name
			return;
		}
		$stubCloser = $tokens[$stubOpener]['parenthesis_closer'];

		// Okay, so we found something that might be worth replacing, in the form
		//     ->will( $this->returnValue( ... ) )
		// or similar. Make sure there is nothing between the end of the stub and the parenthesis
		// closer for the ->will() call
		$afterStub = $phpcsFile->findNext( T_WHITESPACE, $stubCloser + 1, $willCloser, true );
		if ( $afterStub ) {
			return;
		}

		// For reference, here are the different pointers we have stored
		//
		//    $willOpener    $methodStubPtr
		//           \              |                 $willCloser
		// $stackPtr  |  $thisPtr   |   $stubOpener  /
		//      |     |  |          |        |       |
		//   ->will   (  $this -> returnValue( ... ) )
		//                     |                   |
		//           $objectOperatorPtr      $stubCloser
		//
		// What we want to do is to remove the inner stub, i.e. replace
		//     $this->returnValue( ... )
		// with just the
		//     ...
		// and then update the outer ->will( ... ) to use the shortcut
		//    ->willReturnValue( ... )
		$stubMethod = $tokens[$methodStubPtr]['content'];
		$willReplacement = self::WILL_REPLACEMENTS[ $stubMethod ];

		$fix = $phpcsFile->addFixableWarning(
			'Use the shortcut %s() rather that manually stubbing a method with %s()',
			$stackPtr,
			$stubMethod,
			[ $willReplacement, $stubMethod ]
		);

		if ( !$fix ) {
			// There is no way the next issue can be closer than this
			return $willCloser;
		}

		$phpcsFile->fixer->beginChangeset();

		// To be consistent with whitespace around the parenthesis, we will keep
		// the original parenthesis from $stubOpener and $stubCloser and the whitespace
		// within them.
		// Step 1: remove everything from after $stubCloser up to and including $willCloser
		for ( $i = $stubCloser + 1; $i <= $willCloser; $i++ ) {
			$phpcsFile->fixer->replaceToken( $i, '' );
		}

		// Step 2: remove everything from $willOpener up to, but not including, $stubOpener
		for ( $i = $willOpener; $i < $stubOpener; $i++ ) {
			$phpcsFile->fixer->replaceToken( $i, '' );
		}

		// Step 3: replace 'will' with the correct shortcut method
		$phpcsFile->fixer->replaceToken( $stackPtr, $willReplacement );

		$phpcsFile->fixer->endChangeset();

		// There is no way the next issue can be closer that this
		return $willCloser;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $withOpener
	 *
	 * @return int
	 */
	public function handleWith( File $phpcsFile, $withOpener ) {
		$tokens = $phpcsFile->getTokens();

		$withCloser = $tokens[$withOpener]['parenthesis_closer'];

		// For every use of `$this->equalTo( ... )` between $withOpener and $withCloser,
		// add a warning, and if fixing, replace with just the inner contents

		// Use a for loop so that we can call findNext() after each continue
		// phpcs:ignore Generic.CodeAnalysis.JumbledIncrementer.Found
		for (
			$thisPtr = $phpcsFile->findNext( T_VARIABLE, $withOpener + 1, $withCloser );
			$thisPtr;
			$thisPtr = $phpcsFile->findNext( T_VARIABLE, $thisPtr + 1, $withCloser )
		) {
			// Needs to be $this
			if ( $tokens[$thisPtr]['content'] !== '$this' ) {
				continue;
			}
			// Needs to be $this->
			$objectOperatorPtr = $phpcsFile->findNext(
				T_WHITESPACE,
				$thisPtr + 1,
				$withCloser,
				true
			);
			if ( !$objectOperatorPtr
				|| $tokens[$objectOperatorPtr]['code'] !== T_OBJECT_OPERATOR
			) {
				continue;
			}

			// Needs to be $this->equalTo
			$methodPtr = $phpcsFile->findNext(
				T_WHITESPACE,
				$objectOperatorPtr + 1,
				$withCloser,
				true
			);
			// if its $this->logicalNot() or similar we want to skip past the closing
			// parenthesis, just make sure its a function call here
			if ( !$methodPtr
				|| $tokens[$methodPtr]['code'] !== T_STRING
			) {
				continue;
			}
			// Needs to be $this->equalTo( ... )
			$methodOpener = $phpcsFile->findNext(
				T_WHITESPACE,
				$methodPtr + 1,
				$withCloser,
				true
			);
			if ( !$methodOpener
				|| !isset( $tokens[$methodOpener]['parenthesis_closer'] )
			) {
				// String is not a method name
				continue;
			}
			$methodCloser = $tokens[$methodOpener]['parenthesis_closer'];
			if ( $tokens[$methodPtr]['content'] !== 'equalTo' ) {
				$thisPtr = $methodCloser;
				continue;
			}

			// Check for equalTo() with a second parameter, which we cannot fix
			$shouldSkip = false;
			$searchFor = [ T_COMMA, T_OPEN_PARENTHESIS ];
			for (
				$checkIndex = $phpcsFile->findNext( $searchFor, $methodOpener + 1, $methodCloser );
				$checkIndex;
				$checkIndex = $phpcsFile->findNext( $searchFor, $checkIndex + 1, $methodCloser )
			) {
				if ( $tokens[$checkIndex]['code'] === T_OPEN_PARENTHESIS
					&& isset( $tokens[$checkIndex]['parenthesis_closer'] )
				) {
					// Jump past any parentheses in a function call within
					// the equalTo(), eg $this->equalTo( add( 2, 3 ) )
					$checkIndex = $tokens[$checkIndex]['parenthesis_closer'];
				} elseif ( $tokens[$checkIndex]['code'] === T_COMMA ) {
					// equalTo() with multiple parameters, should not be removed
					$shouldSkip = true;
					break;
				}
			}
			if ( $shouldSkip ) {
				// Next $this->equalTo() cannot be until after the current one
				$thisPtr = $methodCloser;
				continue;
			}

			// Add a warning and maybe fix
			$fix = $phpcsFile->addFixableWarning(
				'Default constraint equalTo() is unneeded and should be removed',
				$methodPtr,
				'ConstraintEqualTo'
			);
			if ( !$fix ) {
				// Next $this->equalTo() cannot be until after the current one
				$thisPtr = $methodCloser;
				continue;
			}
			// For reference, here are the different pointers we have stored
			//
			//    $objectOperatorPtr
			//         \
			// $thisPtr |     $methodOpener   $methodCloser
			//   \      |           |         |
			//  $this   -> equalTo  (   ...   )
			//              /
			//          $methodPtr
			// Find the first and last non-whitespace parts of the ... and only keep
			// those
			$equalContentStart = $phpcsFile->findNext(
				T_WHITESPACE,
				$methodOpener + 1,
				$methodCloser,
				true
			);
			$equalContentEnd = $phpcsFile->findPrevious(
				T_WHITESPACE,
				$methodCloser - 1,
				$methodOpener,
				true
			);
			$phpcsFile->fixer->beginChangeset();

			// Step 1: remove from after $equalContentEnd up to and including $methodCloser
			for ( $i = $equalContentEnd + 1; $i <= $methodCloser; $i++ ) {
				$phpcsFile->fixer->replaceToken( $i, '' );
			}

			// Step 2: remove from $thisPtr up to, but not including, $equalContentStart
			for ( $i = $thisPtr; $i < $equalContentStart; $i++ ) {
				$phpcsFile->fixer->replaceToken( $i, '' );
			}

			$phpcsFile->fixer->endChangeset();

			// There is no way the next issue can be closer that this
			$thisPtr = $methodCloser;
		}
		return $withCloser;
	}

}
