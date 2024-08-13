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

/**
 * Share code between FunctionCommentSniff and PropertyDocumentationSniff
 */
trait DocumentationTypeTrait {

	/**
	 * Mapping for swap short types
	 * @var string[]
	 */
	private static $SHORT_TYPE_MAPPING = [
		// @phan-suppress-previous-line PhanReadOnlyPrivateProperty Traits cannot have constants
		'boolean' => 'bool',
		'boolean[]' => 'bool[]',
		'integer' => 'int',
		'integer[]' => 'int[]',
	];

	/**
	 * Mapping for primitive types to case correct
	 * Cannot just detect case due to classes being uppercase
	 *
	 * @var string[]
	 */
	private static $PRIMITIVE_TYPE_MAPPING = [
		// @phan-suppress-previous-line PhanReadOnlyPrivateProperty Traits cannot have constants
		'Array' => 'array',
		'Array[]' => 'array[]',
		'Bool' => 'bool',
		'Bool[]' => 'bool[]',
		'Float' => 'float',
		'Float[]' => 'float[]',
		'Int' => 'int',
		'Int[]' => 'int[]',
		'Mixed' => 'mixed',
		'Mixed[]' => 'mixed[]',
		'Null' => 'null',
		'NULL' => 'null',
		'Null[]' => 'null[]',
		'NULL[]' => 'null[]',
		'Object' => 'object',
		'Object[]' => 'object[]',
		'String' => 'string',
		'String[]' => 'string[]',
		'Callable' => 'callable',
		'Callable[]' => 'callable[]',
	];

	/**
	 * Split PHPDoc comment strings like "bool[] Comment" into type and comment, while respecting
	 * types like `array<int, array<string, bool>>` and `array{id: int, name: string}`.
	 *
	 * @param string $str
	 *
	 * @return array [ string $type, int|null $separatorLength, string $comment ]
	 */
	private function splitTypeAndComment( string $str ): array {
		$brackets = 0;
		$curly = 0;
		$len = strlen( $str );
		for ( $i = 0; $i < $len; $i++ ) {
			$char = $str[$i];
			// Stop at the first space that is not part of a valid pair of brackets
			if ( $char === ' ' && !$brackets && !$curly ) {
				$separatorLength = strspn( $str, ' ', $i );
				return [ substr( $str, 0, $i ), $separatorLength, substr( $str, $i + $separatorLength ) ];
			} elseif ( $char === '>' && $brackets ) {
				$brackets--;
			} elseif ( $char === '<' ) {
				$brackets++;
			} elseif ( $char === '}' && $curly ) {
				$curly--;
			} elseif ( $char === '{' ) {
				$curly++;
			}
		}
		return [ $str, null, '' ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $typesString
	 * @param bool &$fix Set when autofix is needed
	 * @param string $annotation Either "param" or "return" or "var"
	 * @return string Updated $typesString
	 */
	private function fixShortTypes(
		File $phpcsFile,
		int $stackPtr,
		string $typesString,
		bool &$fix,
		string $annotation
	): string {
		$typeList = explode( '|', $typesString );
		foreach ( $typeList as &$type ) {
			// Corrects long types from both upper and lowercase to lowercase shorttype
			$key = lcfirst( $type );
			if ( isset( self::$SHORT_TYPE_MAPPING[$key] ) ) {
				$type = self::$SHORT_TYPE_MAPPING[$key];
				$code = 'NotShort' . str_replace( '[]', 'Array', ucfirst( $type ) ) . ucfirst( $annotation );
				$fix = $phpcsFile->addFixableError(
					'Short type of "%s" should be used for @%s tag',
					$stackPtr,
					$code,
					[ $type, $annotation ]
				) || $fix;
			} elseif ( isset( self::$PRIMITIVE_TYPE_MAPPING[$type] ) ) {
				$type = self::$PRIMITIVE_TYPE_MAPPING[$type];
				$code = 'UppercasePrimitive' . str_replace( '[]', 'Array', ucfirst( $type ) ) . ucfirst( $annotation );
				$fix = $phpcsFile->addFixableError(
					'Lowercase type of "%s" should be used for @%s tag',
					$stackPtr,
					$code,
					[ $type, $annotation ]
				) || $fix;
			}
		}
		return implode( '|', $typeList );
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $typesString
	 * @param bool &$fix Set when autofix is needed
	 * @param string $annotation Either "param" or "return" or "var" + "name" or "type"
	 * @return string Updated $typesString
	 */
	private function fixTrailingPunctuation(
		File $phpcsFile,
		int $stackPtr,
		string $typesString,
		bool &$fix,
		string $annotation
	): string {
		if ( preg_match( '/^(.*)((?:(?![\[\]_{}()])\p{P})+)$/', $typesString, $matches ) ) {
			$typesString = $matches[1];
			$fix = $phpcsFile->addFixableError(
				'%s should not end with punctuation "%s"',
				$stackPtr,
				'NotPunctuation' . str_replace( ' ', '', ucwords( $annotation ) ),
				[ ucfirst( $annotation ), $matches[2] ]
			) || $fix;
		}
		return $typesString;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $typesString
	 * @param bool &$fix Set when autofix is needed
	 * @param string $annotation Either "param" or "return" or "var" + "name" or "type"
	 * @return string Updated $typesString
	 */
	private function fixWrappedParenthesis(
		File $phpcsFile,
		int $stackPtr,
		string $typesString,
		bool &$fix,
		string $annotation
	): string {
		if ( preg_match( '/^([{\[]+)(.*)([\]}]+)$/', $typesString, $matches ) ) {
			$typesString = $matches[2];
			$fix = $phpcsFile->addFixableError(
				'%s should not be wrapped in parenthesis; %s and %s found',
				$stackPtr,
				'NotParenthesis' . str_replace( ' ', '', ucwords( $annotation ) ),
				[ ucfirst( $annotation ), $matches[1], $matches[3] ]
			) || $fix;
		}
		return $typesString;
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $typesString
	 * @param string $annotation Either "param" or "return" or "var"
	 */
	private function maybeAddObjectTypehintError(
		File $phpcsFile,
		int $stackPtr,
		string $typesString,
		string $annotation
	): void {
		$typeList = explode( '|', $typesString );
		foreach ( $typeList as $type ) {
			if ( $type === 'object' || $type === 'object[]' ) {
				$phpcsFile->addWarning(
					'`object` should rarely be used as a typehint. If more specific types are ' .
						'known, list them. If only plain anonymous objects are expected, use ' .
						'`stdClass`. If the intent is indeed to allow any object, mark it with a ' .
						'// phpcs:… comment or set this rule\'s <severity> to 0.',
					$stackPtr,
					'ObjectTypeHint' . ucfirst( $annotation )
				);
			}
		}
	}

	/**
	 * Complain about `type` as a type, its likely to have been autogenerated and isn't
	 * informative (but we don't care about `Type`, since that might be a class name),
	 * see T273806
	 *
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $typesString
	 * @param string $annotation Either "param" or "return" or "var"
	 */
	private function maybeAddTypeTypehintError(
		File $phpcsFile,
		int $stackPtr,
		string $typesString,
		string $annotation
	): void {
		$typeList = explode( '|', $typesString );
		foreach ( $typeList as $type ) {
			if ( $type === 'type' || $type === 'type[]' ) {
				$phpcsFile->addWarning(
					'`type` should not be used as a typehint, the actual type should be used',
					$stackPtr,
					'TypeTypeHint' . ucfirst( $annotation )
				);
			}
		}
	}
}
