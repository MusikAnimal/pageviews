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

namespace MediaWiki\Sniffs\WhiteSpace;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

/**
 * Check for tabs or extra spaces between the keyword `function` and the function name
 *
 * @author DannyS712
 */
class WhiteSpaceBeforeFunctionSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_FUNCTION ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void|int
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		$next = $stackPtr + 1;
		$nextToken = $tokens[ $next ];

		// Must be followed by a single space and then the function name
		if ( $nextToken['content'] !== ' ' || $tokens[ $next + 1 ]['code'] === T_WHITESPACE ) {
			$funcName = $phpcsFile->findNext( T_WHITESPACE, $next + 1, null, true );

			$fix = $phpcsFile->addFixableError(
				'Extra whitespace found after the `function` keyword; only a single space should be used',
				$stackPtr + 1,
				'ExtraWhiteSpaceFound'
			);

			if ( $fix ) {
				$phpcsFile->fixer->beginChangeset();

				// Ensure "function" is followed by one space
				$phpcsFile->fixer->replaceToken( $next, ' ' );

				// Remove anything else before the function name
				for ( $i = $next + 1; $i < $funcName; $i++ ) {
					$phpcsFile->fixer->replaceToken( $i, '' );
				}
				$phpcsFile->fixer->endChangeset();
			}
		}
	}
}
