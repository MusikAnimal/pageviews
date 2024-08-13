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
 * @license GPL-2.0-or-later
 * @file
 */

namespace MediaWiki\Sniffs\Commenting;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

class PropertyDocumentationSniff implements Sniff {

	use DocumentationTypeTrait;

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_VARIABLE ];
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

		// Only for class properties
		$scopes = array_keys( $tokens[$stackPtr]['conditions'] );
		$scope = array_pop( $scopes );
		if ( isset( $tokens[$stackPtr]['nested_parenthesis'] )
			|| $scope === null
			|| ( $tokens[$scope]['code'] !== T_CLASS && $tokens[$scope]['code'] !== T_TRAIT )
		) {
			return;
		}

		$find = Tokens::$emptyTokens;
		$find[] = T_STATIC;
		$find[] = T_NULLABLE;
		$find[] = T_STRING;
		$visibilityPtr = $phpcsFile->findPrevious( $find, $stackPtr - 1, null, true );
		if ( !$visibilityPtr || ( $tokens[$visibilityPtr]['code'] !== T_VAR &&
			!isset( Tokens::$scopeModifiers[ $tokens[$visibilityPtr]['code'] ] ) )
		) {
			return;
		}
		$commentEnd = $phpcsFile->findPrevious( [ T_WHITESPACE ], $visibilityPtr - 1, null, true );
		if ( $tokens[$commentEnd]['code'] === T_COMMENT ) {
			// Inline comments might just be closing comments for
			// control structures or functions instead of function comments
			// using the wrong comment type. If there is other code on the line,
			// assume they relate to that code.
			$prev = $phpcsFile->findPrevious( $find, $commentEnd - 1, null, true );
			if ( $prev !== false && $tokens[$prev]['line'] === $tokens[$commentEnd]['line'] ) {
				$commentEnd = $prev;
			}
		}
		if ( $tokens[$commentEnd]['code'] !== T_DOC_COMMENT_CLOSE_TAG
			&& $tokens[$commentEnd]['code'] !== T_COMMENT
		) {
			$memberProps = $phpcsFile->getMemberProperties( $stackPtr );
			if ( $memberProps['type'] === '' ) {
				$phpcsFile->addError(
					'Missing class property doc comment',
					$stackPtr,
					// Messages used: MissingDocumentationPublic, MissingDocumentationProtected,
					// MissingDocumentationPrivate
					'MissingDocumentation' . ucfirst( $memberProps['scope'] )
				);
			}
			return;
		}
		if ( $tokens[$commentEnd]['code'] === T_COMMENT ) {
			$phpcsFile->addError( 'You must use "/**" style comments for a class property comment',
			$stackPtr, 'WrongStyle' );
			return;
		}
		if ( $tokens[$commentEnd]['line'] !== $tokens[$visibilityPtr]['line'] - 1 ) {
			$error = 'There must be no blank lines after the class property comment';
			$phpcsFile->addError( $error, $commentEnd, 'SpacingAfter' );
		}
		$commentStart = $tokens[$commentEnd]['comment_opener'];
		foreach ( $tokens[$commentStart]['comment_tags'] as $tag ) {
			$tagText = $tokens[$tag]['content'];
			if ( strcasecmp( $tagText, '@inheritDoc' ) === 0 || $tagText === '@deprecated' ) {
				// No need to validate deprecated properties or those that inherit
				// their documentation
				return;
			}
		}

		$this->processVar( $phpcsFile, $commentStart, $stackPtr );
	}

	/**
	 * Process the var doc comments.
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param int $commentStart The position in the stack where the comment started.
	 * @param int $stackPtr The position in the stack where the property itself started (T_VARIABLE)
	 */
	private function processVar( File $phpcsFile, int $commentStart, int $stackPtr ): void {
		$tokens = $phpcsFile->getTokens();
		$var = null;
		foreach ( $tokens[$commentStart]['comment_tags'] as $ptr ) {
			$tag = $tokens[$ptr]['content'];
			if ( $tag !== '@var' ) {
				continue;
			}
			if ( $var ) {
				$error = 'Only 1 @var tag is allowed in a class property comment';
				$phpcsFile->addError( $error, $ptr, 'DuplicateVar' );
				return;
			}
			$var = $ptr;
		}
		if ( $var !== null ) {
			$varTypeSpacing = $var + 1;
			// Check spaces before var
			if ( $tokens[$varTypeSpacing]['code'] === T_DOC_COMMENT_WHITESPACE ) {
				$expectedSpaces = 1;
				$currentSpaces = strlen( $tokens[$varTypeSpacing]['content'] );
				if ( $currentSpaces !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces before var type; %s found',
						$varTypeSpacing,
						'SpacingBeforeVarType',
						[ $expectedSpaces, $currentSpaces ]
					);
					if ( $fix ) {
						$phpcsFile->fixer->replaceToken( $varTypeSpacing, ' ' );
					}
				}
			}
			$varType = $var + 2;
			$content = '';
			if ( $tokens[$varType]['code'] === T_DOC_COMMENT_STRING ) {
				$content = $tokens[$varType]['content'];
			}
			if ( $content === '' ) {
				$error = 'Var type missing for @var tag in class property comment';
				$phpcsFile->addError( $error, $var, 'MissingVarType' );
				return;
			}
			[ $type, $separatorLength, $comment ] = $this->splitTypeAndComment( $content );
			$fixType = false;
			// Check for unneeded punctuation
			$type = $this->fixTrailingPunctuation(
				$phpcsFile,
				$varType,
				$type,
				$fixType,
				'var type'
			);
			$type = $this->fixWrappedParenthesis(
				$phpcsFile,
				$varType,
				$type,
				$fixType,
				'var type'
			);
			// Check the type for short types
			$type = $this->fixShortTypes( $phpcsFile, $varType, $type, $fixType, 'var' );
			$this->maybeAddObjectTypehintError(
				$phpcsFile,
				$varType,
				$type,
				'var'
			);
			$this->maybeAddTypeTypehintError(
				$phpcsFile,
				$varType,
				$type,
				'var'
			);
			// Check spacing after type
			if ( $comment !== '' ) {
				$expectedSpaces = 1;
				if ( $separatorLength !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces after var type; %s found',
						$varType,
						'SpacingAfterVarType',
						[ $expectedSpaces, $separatorLength ]
					);
					if ( $fix ) {
						$fixType = true;
						$separatorLength = $expectedSpaces;
					}
				}
			}
			if ( $fixType ) {
				$phpcsFile->fixer->replaceToken(
					$varType,
					$type . ( $comment !== '' ? str_repeat( ' ', $separatorLength ) . $comment : '' )
				);
			}
		} elseif ( $phpcsFile->getMemberProperties( $stackPtr )['type'] === '' ) {
			$error = 'Missing type or @var tag in class property comment';
			$phpcsFile->addError( $error, $tokens[$commentStart]['comment_closer'], 'MissingVar' );
		}
	}

}
