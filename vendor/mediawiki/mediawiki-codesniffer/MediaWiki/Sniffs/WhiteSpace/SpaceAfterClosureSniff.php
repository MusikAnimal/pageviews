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

class SpaceAfterClosureSniff implements Sniff {
	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [
			T_CLOSURE,
			T_FN,
		];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr Index of "function" keyword
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();
		$next = $tokens[$stackPtr + 1];
		if ( $next['code'] === T_WHITESPACE ) {
			if ( $next['content'] === ' ' ) {
				return;
			}
			// It's whitespace, but not a single space.
			$token = $tokens[$stackPtr];
			$fix = $phpcsFile->addFixableError(
				'A single space should be after the %s keyword in closures',
				$stackPtr + 1,
				$token['code'] === T_CLOSURE ? 'WrongWhitespaceAfterClosure' : 'WrongWhitespaceAfterArrow',
				[ $token['content'] ]
			);
			if ( $fix ) {
				$phpcsFile->fixer->replaceToken( $stackPtr + 1, ' ' );
			}
		} elseif ( $next['code'] === T_OPEN_PARENTHESIS ) {
			$token = $tokens[$stackPtr];
			$fix = $phpcsFile->addFixableError(
				'A single space should be after the %s keyword in closures',
				$stackPtr,
				$token['code'] === T_CLOSURE ? 'NoWhitespaceAfterClosure' : 'NoWhitespaceAfterArrow',
				[ $token['content'] ]
			);
			if ( $fix ) {
				$phpcsFile->fixer->addContent( $stackPtr, ' ' );
			}
		}
		// else invalid syntax?
	}

}
