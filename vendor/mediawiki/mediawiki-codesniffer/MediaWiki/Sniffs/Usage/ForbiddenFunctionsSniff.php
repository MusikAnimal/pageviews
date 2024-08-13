<?php
/**
 * Copyright (C) 2017 Kunal Mehta <legoktm@member.fsf.org>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

namespace MediaWiki\Sniffs\Usage;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

/**
 * Use e.g. <exclude name="MediaWiki.Usage.ForbiddenFunctions.eval" /> in your .phpcs.xml to remove
 * a function from the predefined list of forbidden functions.
 *
 * You can also add entries or modify existing ones. Note that an empty `value=""` won't work. Use
 * "null" for forbidden functions and any other non-empty value for replacements.
 *
 * <rule ref="MediaWiki.Usage.ForbiddenFunctions">
 *     <properties>
 *         <property name="forbiddenFunctions" type="array">
 *             <element key="eval" value="null" />
 *             <element key="sizeof" value="count" />
 *         </property>
 *     </properties>
 * </rule>
 */
class ForbiddenFunctionsSniff implements Sniff {

	/**
	 * Predefined list of deprecated functions and their replacements, or any empty value for
	 * forbidden functions.
	 */
	private const FORBIDDEN_FUNCTIONS = [
		'chop' => 'rtrim',
		'diskfreespace' => 'disk_free_space',
		'doubleval' => 'floatval',
		'ini_alter' => 'ini_set',
		'is_integer' => 'is_int',
		'is_long' => 'is_int',
		'is_double' => 'is_float',
		'is_real' => 'is_float',
		'is_writeable' => 'is_writable',
		'join' => 'implode',
		'key_exists' => 'array_key_exists',
		'pos' => 'current',
		'sizeof' => 'count',
		'strchr' => 'strstr',
		'assert' => false,
		'eval' => false,
		'extract' => false,
		'compact' => false,
		// Deprecated in PHP 7.2
		'create_function' => false,
		'each' => false,
		'parse_str' => false,
		'mb_parse_str' => false,
		// MediaWiki wrappers for external program execution should be used,
		// forbid PHP's (https://secure.php.net/manual/en/ref.exec.php)
		'escapeshellarg' => false,
		'escapeshellcmd' => false,
		'exec' => false,
		'passthru' => false,
		'popen' => false,
		'proc_open' => false,
		'shell_exec' => false,
		'system' => false,
		'isset' => false,
		// resource type is going away in PHP 8.0+ (T260735)
		'is_resource' => false,
		// define third parameter is deprecated in 7.3
		'define' => false,
	];

	/**
	 * Functions that are forbidden (per above) but allowed with a specific number of arguments
	 */
	private const ALLOWED_ARG_COUNT = [
		'parse_str' => 2,
		'mb_parse_str' => 2,
		'isset' => 1,
		'define' => 2,
	];

	/**
	 * @var string[] Key-value pairs as provided via .phpcs.xml. Maps deprecated function names to
	 *  their replacement, or the literal string "null" for forbidden functions.
	 */
	public $forbiddenFunctions = [];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_STRING, T_EVAL, T_ISSET ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$tokens = $phpcsFile->getTokens();

		$nextToken = $phpcsFile->findNext( T_WHITESPACE, $stackPtr + 1, null, true );
		if ( $tokens[$nextToken]['code'] !== T_OPEN_PARENTHESIS ||
			!isset( $tokens[$nextToken]['parenthesis_closer'] )
		) {
			return;
		}

		// Check if the function is one of the bad ones
		$funcName = $tokens[$stackPtr]['content'];
		if ( array_key_exists( $funcName, $this->forbiddenFunctions ) ) {
			$replacement = $this->forbiddenFunctions[$funcName];
			if ( $replacement === $funcName ) {
				return;
			}
		} elseif ( array_key_exists( $funcName, self::FORBIDDEN_FUNCTIONS ) ) {
			$replacement = self::FORBIDDEN_FUNCTIONS[$funcName];
		} else {
			return;
		}

		$ignore = [
			T_DOUBLE_COLON => true,
			T_OBJECT_OPERATOR => true,
			T_NULLSAFE_OBJECT_OPERATOR => true,
			T_FUNCTION => true,
			T_CONST => true,
		];

		// Check to make sure it's a PHP function (not $this->, etc.)
		$prevToken = $phpcsFile->findPrevious( T_WHITESPACE, $stackPtr - 1, null, true );
		if ( isset( $ignore[$tokens[$prevToken]['code']] ) ) {
			return;
		}

		// Check argument count
		$allowedArgCount = self::ALLOWED_ARG_COUNT[$funcName] ?? null;
		if ( $allowedArgCount !== null &&
			$this->argCount( $phpcsFile, $nextToken ) == $allowedArgCount
		) {
			// Nothing to replace
			return;
		}

		// The hard-coded FORBIDDEN_FUNCTIONS can use false, but values from .phpcs.xml are always
		// strings. We use the same special string "null" as in the Generic.PHP.ForbiddenFunctions
		// sniff.
		if ( $replacement && $replacement !== 'null' ) {
			$fix = $phpcsFile->addFixableWarning(
				'Use %s() instead of %s',
				$stackPtr,
				$funcName,
				[ $replacement, $funcName ]
			);
			if ( $fix ) {
				$phpcsFile->fixer->replaceToken( $stackPtr, $replacement );
			}
		} else {
			$phpcsFile->addWarning(
				$allowedArgCount !== null
					? '%s should be used with %s argument(s)'
					: '%s should not be used',
				$stackPtr,
				$funcName,
				[ $funcName, $allowedArgCount ]
			);
		}
	}

	/**
	 * Return the number of arguments between the $parenthesis as opener and its closer
	 * Ignoring commas between brackets to support nested argument lists
	 *
	 * @param File $phpcsFile
	 * @param int $parenthesis The parenthesis token index.
	 * @return int
	 */
	private function argCount( File $phpcsFile, int $parenthesis ): int {
		$tokens = $phpcsFile->getTokens();
		$end = $tokens[$parenthesis]['parenthesis_closer'];
		$next = $phpcsFile->findNext( Tokens::$emptyTokens, $parenthesis + 1, $end, true );
		$argCount = 0;

		if ( $next !== false ) {
			// Something found, there is at least one argument
			$argCount++;

			$searchTokens = [
				T_OPEN_CURLY_BRACKET,
				T_OPEN_SQUARE_BRACKET,
				T_OPEN_SHORT_ARRAY,
				T_OPEN_PARENTHESIS,
				T_COMMA
			];
			while ( $next !== false ) {
				switch ( $tokens[$next]['code'] ) {
					case T_OPEN_CURLY_BRACKET:
					case T_OPEN_SQUARE_BRACKET:
					case T_OPEN_PARENTHESIS:
						if ( isset( $tokens[$next]['parenthesis_closer'] ) ) {
							// jump to closing parenthesis to ignore commas between opener and closer
							$next = $tokens[$next]['parenthesis_closer'];
						}
						break;
					case T_OPEN_SHORT_ARRAY:
						if ( isset( $tokens[$next]['bracket_closer'] ) ) {
							// jump to closing bracket to ignore commas between opener and closer
							$next = $tokens[$next]['bracket_closer'];
						}
						break;
					case T_COMMA:
						$argCount++;
						break;
				}

				$next = $phpcsFile->findNext( $searchTokens, $next + 1, $end );
			}
		}

		return $argCount;
	}

}
