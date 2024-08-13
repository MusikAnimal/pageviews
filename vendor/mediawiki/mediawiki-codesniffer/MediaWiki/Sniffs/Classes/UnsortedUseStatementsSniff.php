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

namespace MediaWiki\Sniffs\Classes;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

class UnsortedUseStatementsSniff implements Sniff {

	// Preferred order is classes → functions → constants
	private const ORDER = [ 'function' => 1, 'const' => 2 ];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_USE ];
	}

	/**
	 * @inheritDoc
	 *
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @return int|void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		// In case this is a `use` of a class (or constant or function) within
		// a bracketed namespace rather than in the global scope, update the end
		// accordingly
		$useScopeEnd = $phpcsFile->numTokens;

		if ( !empty( $tokens[$stackPtr]['conditions'] ) ) {
			// We only care about use statements in the global scope, or the
			// equivalent for bracketed namespace (use statements in the namespace
			// and not in any class, etc.)
			$scope = array_key_first( $tokens[$stackPtr]['conditions'] );
			if ( count( $tokens[$stackPtr]['conditions'] ) === 1
				// @phan-suppress-next-line PhanTypeArraySuspiciousNullable False positive
				&& $tokens[$stackPtr]['conditions'][$scope] === T_NAMESPACE
			) {
				$useScopeEnd = $tokens[$scope]['scope_closer'];
			} else {
				return $tokens[$scope]['scope_closer'] ?? $stackPtr;
			}
		}

		$useStatementList = $this->makeUseStatementList( $phpcsFile, $stackPtr, $useScopeEnd );
		// Nothing to do, bail out as fast as possible
		if ( count( $useStatementList ) <= 1 ) {
			return;
		}

		$sortedStatements = $this->sortByFullQualifiedClassName( $useStatementList );
		// Continue *after* the last use token to not process it twice
		$afterLastUse = end( $useStatementList )['end'] + 1;

		if ( $useStatementList === $sortedStatements ) {
			return $afterLastUse;
		}

		$fix = $phpcsFile->addFixableWarning(
			'Use statements are not alphabetically sorted',
			$stackPtr,
			'UnsortedUse'
		);
		if ( !$fix ) {
			return $afterLastUse;
		}

		// Find how much whitespace there was before the T_USE for the first
		// use statement, so that we can indent the rest the same amount,
		// used for bracketed namespaces
		$leadingWhitespace = '';
		$firstOnLine = $phpcsFile->findFirstOnLine(
			[ T_WHITESPACE ],
			$stackPtr
		);

		$phpcsFile->fixer->beginChangeset();

		// If there was no leading whitespace, we will be inserting the
		// sorted list in the location of the first T_USE, but if there
		// was whitespace, insert at the start of that line
		$insertPoint = $stackPtr;
		if ( $firstOnLine ) {
			$insertPoint = $firstOnLine;
			for ( $iii = $firstOnLine; $iii < $stackPtr; $iii++ ) {
				if ( $tokens[$iii]['code'] === T_WHITESPACE ) {
					// Handle tabs converted to spaces automatically
					// by using orig_content if available
					$leadingWhitespace .= $tokens[$iii]['orig_content'] ?? $tokens[$iii]['content'];
					// Remove the whitespace from before the first
					// use statement, will be added back when the
					// statement is rewritten
					$phpcsFile->fixer->replaceToken( $iii, '' );
				}
			}
		}

		foreach ( $useStatementList as $statement ) {
			// Remove any whitespace before the start, so that it
			// doesn't add up for use statements in a bracketed namespace
			$thisLine = $tokens[ $statement['start'] ]['line'];
			$i = $statement['start'] - 1;
			while ( $tokens[$i]['line'] === $thisLine &&
				$tokens[$i]['code'] === T_WHITESPACE
			) {
				$phpcsFile->fixer->replaceToken( $i, '' );
				$i--;
			}
			for ( $i = $statement['start']; $i <= $statement['end']; $i++ ) {
				$phpcsFile->fixer->replaceToken( $i, '' );
			}
			// Also remove the newline at the end of the line, if there is one
			if ( $tokens[$i]['code'] === T_WHITESPACE
				&& $tokens[$i]['line'] < $tokens[$i + 1]['line']
			) {
				$phpcsFile->fixer->replaceToken( $i, '' );
			}
		}

		foreach ( $sortedStatements as $statement ) {
			$phpcsFile->fixer->addContent( $insertPoint, $leadingWhitespace );
			$phpcsFile->fixer->addContent( $insertPoint, $statement['originalContent'] );
			$phpcsFile->fixer->addNewline( $insertPoint );
		}

		$phpcsFile->fixer->endChangeset();

		return $afterLastUse;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param int $useScopeEnd
	 * @return array[]
	 */
	private function makeUseStatementList( File $phpcsFile, int $stackPtr, int $useScopeEnd ): array {
		$tokens = $phpcsFile->getTokens();
		$next = $stackPtr;
		$list = [];

		do {
			$originalContent = '';
			$group = 0;
			$sortKey = '';
			$collectSortKey = false;
			$start = $next;

			// The end condition here is for when a file ends directly after a "use"
			// in the case of statements in the global scope, or to properly limit the
			// search in case of a bracketed namespace
			for ( ; $next < $useScopeEnd; $next++ ) {
				[ 'code' => $code, 'content' => $content ] = $tokens[$next];
				$originalContent .= $content;

				if ( $code === T_STRING ) {
					// Reserved keywords "function" and "const" can not appear anywhere else
					if ( strcasecmp( $content, 'function' ) === 0
						|| strcasecmp( $content, 'const' ) === 0
					) {
						$group = self::ORDER[ strtolower( $content ) ];
					} elseif ( !$sortKey ) {
						// The first non-reserved string is where the class name starts
						$collectSortKey = true;
					}
				} elseif ( $code === T_AS ) {
					// The string after an "as" is not part of the class name any more
					$collectSortKey = false;
				} elseif ( $code === T_SEMICOLON && $sortKey ) {
					$list[] = [
						'start' => $start,
						'end' => $next,
						'originalContent' => $originalContent,
						'group' => $group,
						// No need to trim(), no spaces or leading backslashes have been collected
						'sortKey' => strtolower( $sortKey ),
					];

					// Try to find the next "use" token after the current one
					// We don't care about the end of the findNext since that is enforced
					// via the for condition
					$next = $phpcsFile->findNext( Tokens::$emptyTokens, $next + 1, null, true );
					break;
				} elseif ( isset( Tokens::$emptyTokens[$code] ) ) {
					// We never want any space or comment in the sort key
					continue;
				} elseif ( $code !== T_USE && $code !== T_NS_SEPARATOR ) {
					// Unexpected token, stop searching for more "use" keywords
					break 2;
				}

				if ( $collectSortKey ) {
					$sortKey .= $content;
				}
			}
		} while ( $next && isset( $tokens[$next] ) && $tokens[$next]['code'] === T_USE );

		return $list;
	}

	/**
	 * @param array[] $list
	 * @return array[]
	 */
	private function sortByFullQualifiedClassName( array $list ): array {
		usort( $list, static function ( array $a, array $b ) {
			if ( $a['group'] !== $b['group'] ) {
				return $a['group'] <=> $b['group'];
			}
			// Can't use strnatcasecmp() because it behaves different, compared to e.g. PHPStorm
			return strnatcmp( $a['sortKey'], $b['sortKey'] );
		} );

		return $list;
	}

}
