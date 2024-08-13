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

namespace MediaWiki\Sniffs\Arrays;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

/**
 * Sniff to enforce the presence or absence of trailing commas in single- and multi-line arrays.
 *
 * By default, this sniff does nothing.
 * Configure it as follows to enforce trailing commas in multi-line arrays
 * while removing them in single-line arrays:
 * <rule ref="MediaWiki.Arrays.TrailingComma">
 *     <properties>
 *         <property name="singleLine" value="false" />
 *         <property name="multiLine" value="true" />
 *     </properties>
 * </rule>
 */
class TrailingCommaSniff implements Sniff {

	/**
	 * Enforce the presence (true) or absence (false) of trailing commas in single-line arrays.
	 * By default (null), do nothing.
	 * @var bool|null
	 */
	public ?bool $singleLine = null;

	/**
	 * Enforce the presence (true) or absence (false) of trailing commas in multi-line arrays.
	 * By default (null), do nothing.
	 * @var bool|null
	 */
	public ?bool $multiLine = null;

	public function register(): array {
		return [ T_CLOSE_SHORT_ARRAY ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void|int
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		if ( $this->singleLine === null && $this->multiLine === null ) {
			// not configured to do anything, skip to end of file
			return $phpcsFile->numTokens;
		}

		$tokens = $phpcsFile->getTokens();

		$lastContentToken = $phpcsFile->findPrevious(
			Tokens::$emptyTokens,
			$stackPtr - 1,
			null,
			true
		);

		$isEmptyArray = $tokens[$lastContentToken]['code'] === T_OPEN_SHORT_ARRAY;
		if ( $isEmptyArray ) {
			// PHP syntax doesn't allow [,] so we can stop early
			return;
		}

		$isMultiline = false;
		for ( $token = $lastContentToken + 1; $token < $stackPtr; $token++ ) {
			if ( str_contains( $tokens[$token]['content'], "\n" ) ) {
				$isMultiline = true;
				break;
			}
		}

		if ( $isMultiline ) {
			$wantTrailingComma = $this->multiLine;
		} else {
			$wantTrailingComma = $this->singleLine;
		}
		if ( $wantTrailingComma === null ) {
			return;
		}

		$hasTrailingComma = $tokens[$lastContentToken]['code'] === T_COMMA;

		$this->checkWarnAndFix(
			$phpcsFile,
			$lastContentToken,
			$hasTrailingComma,
			$wantTrailingComma,
			$isMultiline
		);
	}

	/**
	 * Check whether a warning should be emitted,
	 * emit one if necessary, and fix it if requested.
	 *
	 * @param File $phpcsFile
	 * @param int $token
	 * @param bool $hasTrailingComma Whether the trailing comma *is* present.
	 * @param bool $wantTrailingComma Whether the trailing comma *should* be present.
	 * @param bool $isMultiline Whether the array is multi-line or single-line.
	 * (Only used for the warning message and code at this point.)
	 */
	private function checkWarnAndFix(
		File $phpcsFile,
		int $token,
		bool $hasTrailingComma,
		bool $wantTrailingComma,
		bool $isMultiline
	): void {
		if ( $hasTrailingComma === $wantTrailingComma ) {
			return;
		}

		// possible messages (for grepping):
		// Multi-line array with trailing comma
		// Multi-line array without trailing comma
		// Single-line array with trailing comma
		// Single-line array without trailing comma
		$fix = $phpcsFile->addFixableWarning(
			'%s array %s trailing comma',
			$token,
			$isMultiline ? 'MultiLine' : 'SingleLine',
			[
				$isMultiline ? 'Multi-line' : 'Single-line',
				$wantTrailingComma ? 'without' : 'with',
			]
		);
		if ( !$fix ) {
			return;
		}

		// adding/removing the trailing comma works the same regardless of $isMultiline
		if ( $wantTrailingComma ) {
			$phpcsFile->fixer->addContent( $token, ',' );
		} else {
			$phpcsFile->fixer->replaceToken( $token, '' );
		}
	}

}
