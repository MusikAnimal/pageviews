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
 * Sniff to warn when there is a space between a variable expression and [
 *
 * @author DannyS712
 */
class SpaceBeforeBracketSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_OPEN_SQUARE_BRACKET ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		// Check if the open bracket is preceded by whitespace
		$priorToken = $tokens[$stackPtr - 1];
		if ( $priorToken['code'] !== T_WHITESPACE ) {
			return;
		}

		// Skip newlines
		$lastNonWhitespace = $phpcsFile->findPrevious(
			T_WHITESPACE,
			$stackPtr - 1,
			null,
			true
		);
		if ( $lastNonWhitespace &&
			$tokens[$lastNonWhitespace]['line'] !== $tokens[$stackPtr]['line']
		) {
			return;
		}

		$fix = $phpcsFile->addFixableWarning(
			'Do not include whitespace between variable expression and array offset',
			$stackPtr - 1,
			'SpaceFound'
		);

		if ( $fix ) {
			$phpcsFile->fixer->replaceToken( $stackPtr - 1, '' );
		}
	}
}
