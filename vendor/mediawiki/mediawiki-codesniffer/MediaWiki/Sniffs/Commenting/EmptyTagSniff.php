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

namespace MediaWiki\Sniffs\Commenting;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

/**
 * Check for tags with nothing after them
 *
 * @author DannyS712
 */
class EmptyTagSniff implements Sniff {

	private const DISALLOWED_EMPTY_TAGS = [
		// There are separate sniffs that cover @param, @return, @throws, and @covers
		'@access' => '@access',
		'@author' => '@author',
		'@dataProvider' => '@dataProvider',
		'@depends' => '@depends',
		'@group' => '@group',
		'@license' => '@license',
		'@link' => '@link',
		'@see' => '@see',
		'@since' => '@since',
		'@suppress' => '@suppress',
	];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_DOC_COMMENT_OPEN_TAG ];
	}

	/**
	 * Processes this test, when one of its tokens is encountered.
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param int $stackPtr The position of the current token in the stack passed in $tokens.
	 *
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();
		// Delay this because we typically (when there are no errors) don't need it
		$where = null;

		foreach ( $tokens[$stackPtr]['comment_tags'] as $tag ) {
			$content = $tokens[$tag]['content'];

			if ( !isset( self::DISALLOWED_EMPTY_TAGS[$content] ) ||
				!isset( $tokens[$tag + 2] ) ||
				// The tag is "not empty" only when it's followed by something on the same line
				( $tokens[$tag + 2]['code'] === T_DOC_COMMENT_STRING &&
					$tokens[$tag + 2]['line'] === $tokens[$tag]['line'] )
			) {
				continue;
			}

			if ( !$where ) {
				$where = $this->findContext( $phpcsFile, $tokens[$stackPtr]['comment_closer'] + 1 );
			}

			$phpcsFile->addError(
				'Content missing for %s tag in %s comment',
				$tag,
				ucfirst( $where ) . ucfirst( substr( $content, 1 ) ),
				[ $content, $where ]
			);
		}
	}

	/**
	 * @param File $phpcsFile
	 * @param int $start
	 *
	 * @return string Either "property" or "function"
	 */
	private function findContext( File $phpcsFile, int $start ): string {
		$tokens = $phpcsFile->getTokens();
		$skip = array_merge(
			Tokens::$emptyTokens,
			Tokens::$methodPrefixes,
			[
				// Skip outdated `var` keywords as well
				T_VAR,
				// Skip type hints, e.g. in `public ?Foo\Bar $var`
				T_STRING,
				T_NS_SEPARATOR,
				T_NULLABLE,
			]
		);
		$next = $phpcsFile->findNext( $skip, $start, null, true );
		return $tokens[$next]['code'] === T_VARIABLE ? 'property' : $tokens[$next]['content'];
	}

}
