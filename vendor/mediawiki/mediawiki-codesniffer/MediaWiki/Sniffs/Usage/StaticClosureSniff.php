<?php

/**
 * Use static closure when the inner body does not use $this
 *
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

namespace MediaWiki\Sniffs\Usage;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

class StaticClosureSniff implements Sniff {

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_CLOSURE ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$prevClosureToken = $phpcsFile->findPrevious( Tokens::$emptyTokens, $stackPtr - 1, null, true );
		if ( $prevClosureToken === false ) {
			return;
		}

		$tokens = $phpcsFile->getTokens();
		$containsNonStaticStatements = false;
		$unclearSituation = false;

		$searchToken = [
			T_VARIABLE,
			T_DOUBLE_QUOTED_STRING,
			T_HEREDOC,
			T_PARENT,
			T_SELF,
			T_STATIC,
			T_CLOSURE,
			T_ANON_CLASS,
		];
		$end = $tokens[$stackPtr]['scope_closer'];

		// Search for tokens which indicates that this cannot be a static closure
		$next = $phpcsFile->findNext( $searchToken, $tokens[$stackPtr]['scope_opener'] + 1, $end );
		while ( $next !== false ) {
			$code = $tokens[$next]['code'];
			switch ( $code ) {
				case T_VARIABLE:
					if ( $tokens[$next]['content'] === '$this' ) {
						$containsNonStaticStatements = true;
					}
					break;

				case T_DOUBLE_QUOTED_STRING:
				case T_HEREDOC:
					if ( preg_match( '/\${?this\b/', $tokens[$next]['content'] ) ) {
						$containsNonStaticStatements = true;
					}
					break;

				case T_PARENT:
				case T_SELF:
				case T_STATIC:
					// Use of consts are allowed in static closures
					$nextToken = $phpcsFile->findNext( Tokens::$emptyTokens, $next + 1, $end, true );
					// In case of T_STATIC ignore the static keyword on closures
					if ( $nextToken !== false
						&& $tokens[$nextToken]['code'] !== T_CLOSURE
						&& !$this->isStaticClassProperty( $phpcsFile, $tokens, $nextToken, $end )
					) {
						$prevToken = $phpcsFile->findPrevious( Tokens::$emptyTokens, $next - 1, null, true );
						// Okay on "new self"
						if ( $prevToken === false || $tokens[$prevToken]['code'] !== T_NEW ) {
							// php allows to call non-static method with self:: or parent:: or static::
							// That is normally a static call, but keep it as is, because it is unclear
							// and can break when changing.
							// Also keep unknown token sequences or unclear syntax
							$unclearSituation = true;
						}
					}
					if ( $nextToken !== false ) {
						// Skip over analyzed tokens
						$next = $nextToken;
					}
					break;

				case T_CLOSURE:
					// Skip arguments and use parameter for closure, which can contains T_SELF as type hint
					// But search also inside nested closures for $this
					if ( isset( $tokens[$next]['scope_opener'] ) ) {
						$next = $tokens[$next]['scope_opener'];
					}
					break;

				case T_ANON_CLASS:
					if ( isset( $tokens[$next]['scope_closer'] ) ) {
						// Skip to the end of the anon class because $this in anon is not relevant for this sniff
						$next = $tokens[$next]['scope_closer'];
					}
					break;
			}
			$next = $phpcsFile->findNext( $searchToken, $next + 1, $end );
		}

		if ( $unclearSituation ) {
			// Keep everything as is
			return;
		}

		if ( $tokens[$prevClosureToken]['code'] === T_STATIC ) {
			if ( $containsNonStaticStatements ) {
				$fix = $phpcsFile->addFixableError(
					'Cannot not use static closure in class context',
					$stackPtr,
					'NonStaticClosure'
				);
				if ( $fix ) {
					$phpcsFile->fixer->beginChangeset();

					do {
						$phpcsFile->fixer->replaceToken( $prevClosureToken, '' );
						$prevClosureToken++;
					} while ( $prevClosureToken < $stackPtr );

					$phpcsFile->fixer->endChangeset();
				}
			}
		} elseif ( !$containsNonStaticStatements ) {
			$fix = $phpcsFile->addFixableWarning(
				'Use static closure',
				$stackPtr,
				'StaticClosure'
			);
			if ( $fix ) {
				$phpcsFile->fixer->addContentBefore( $stackPtr, 'static ' );
			}
		}

		// also check inner closure for static
	}

	/**
	 * Check if this is a class property like const or static field of format self::const
	 * @param File $phpcsFile
	 * @param array $tokens
	 * @param int &$stackPtr Non-empty token after self/parent/static
	 * @param int $end
	 * @return bool
	 */
	private function isStaticClassProperty( File $phpcsFile, array $tokens, int &$stackPtr, int $end ): bool {
		// No ::, no const
		if ( $tokens[$stackPtr]['code'] !== T_DOUBLE_COLON ) {
			return false;
		}

		// the const is a T_STRING, but also method calls are T_STRING
		// okay with (static) variables
		$stackPtr = $phpcsFile->findNext( Tokens::$emptyTokens, $stackPtr + 1, $end, true );
		if ( $stackPtr === false || $tokens[$stackPtr]['code'] !== T_STRING ) {
			return $stackPtr !== false && $tokens[$stackPtr]['code'] === T_VARIABLE;
		}

		// const is a T_STRING without parenthesis after it
		$stackPtr = $phpcsFile->findNext( Tokens::$emptyTokens, $stackPtr + 1, $end, true );
		return $stackPtr !== false && $tokens[$stackPtr]['code'] !== T_OPEN_PARENTHESIS;
	}
}
