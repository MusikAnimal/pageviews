<?php
/**
 * This file was copied from PHP_CodeSniffer before being modified
 * File: Standards/PEAR/Sniffs/Commenting/FunctionCommentSniff.php
 * From repository: https://github.com/squizlabs/PHP_CodeSniffer
 *
 * Parses and verifies the doc comments for functions.
 *
 * PHP version 5
 *
 * @category PHP
 * @package PHP_CodeSniffer
 * @author Greg Sherwood <gsherwood@squiz.net>
 * @author Marc McIntyre <mmcintyre@squiz.net>
 * @copyright 2006-2014 Squiz Pty Ltd (ABN 77 084 670 600)
 * @license https://github.com/squizlabs/PHP_CodeSniffer/blob/master/licence.txt BSD-3-Clause
 * @link http://pear.php.net/package/PHP_CodeSniffer
 */

namespace MediaWiki\Sniffs\Commenting;

use MediaWiki\Sniffs\PHPUnit\PHPUnitTestTrait;
use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

class FunctionCommentSniff implements Sniff {

	use DocumentationTypeTrait;
	use PHPUnitTestTrait;

	/**
	 * Standard class methods that
	 * don't require documentation
	 */
	private const SKIP_STANDARD_METHODS = [
		'__toString',
		'__destruct',
		'__sleep',
		'__wakeup',
		'__clone',
		'__invoke',
		'__call',
		'__callStatic',
		'__get',
		'__set',
		'__isset',
		'__unset',
		'__serialize',
		'__unserialize',
		'__set_state',
		'__debugInfo',
	];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_FUNCTION ];
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
		$funcName = $phpcsFile->getDeclarationName( $stackPtr );
		if ( $funcName === null || in_array( $funcName, self::SKIP_STANDARD_METHODS ) ) {
			// Don't require documentation for an obvious method
			return;
		}

		$tokens = $phpcsFile->getTokens();
		$find = Tokens::$methodPrefixes;
		$find[] = T_WHITESPACE;
		$searchBefore = $stackPtr;
		$linesBetweenDocAndFunction = 1;
		do {
			$commentEnd = $phpcsFile->findPrevious( $find, $searchBefore - 1, null, true );
			// Allow attributes between doc block and function, T306941
			if ( isset( $tokens[$commentEnd]['attribute_opener'] ) ) {
				$searchBefore = $tokens[$commentEnd]['attribute_opener'];
				// Attributes should be on their own lines
				$linesBetweenDocAndFunction++;
				continue;
			}
			break;
		} while ( true );
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
			// Function has no documentation; check if this is allowed or not
			$methodProps = $phpcsFile->getMethodProperties( $stackPtr );
			$methodParams = $phpcsFile->getMethodParameters( $stackPtr );
			$hasReturnType = $methodProps['return_type'] !== '' || $funcName === '__construct';
			$hasParams = $methodParams !== [];
			$getterWithoutParams = !$hasParams && preg_match( '/^(get|is)[A-Z]/', $funcName );
			$allParamsTyped = true;
			foreach ( $methodParams as $parameter ) {
				if ( $parameter['type_hint'] === '' ) {
					$allParamsTyped = false;
					break;
				}
			}
			// Enforce strict return type or @return documentation for interfaces/abstract methods,
			// but only if they are entirely undocumented at the moment
			$returnsValue = $this->functionReturnsValue( $phpcsFile, $stackPtr ) ?? true;
			$isFullyTyped = $allParamsTyped && ( $hasReturnType || !$returnsValue );
			$isTestFile = $this->isTestFile( $phpcsFile, $stackPtr );
			// A function is *allowed* to omit the documentation comment
			// (but in many cases, documentation comments still make sense, and are not discouraged)
			// if it is fully typed (parameter and return type declarations), or in a test file,
			// or has no parameters and is not a getter.
			// The last exception, allowing parameterless non-getters to omit their return type, may be removed later.
			if ( !$isFullyTyped && !$isTestFile && ( $getterWithoutParams || $hasParams ) ) {
				$phpcsFile->addError(
					'Missing function doc comment',
					$stackPtr,
					// Messages used: MissingDocumentationPublic, MissingDocumentationProtected,
					// MissingDocumentationPrivate
					'MissingDocumentation' . ucfirst( $methodProps['scope'] )
				);
			}
			return;
		}
		if ( $tokens[$commentEnd]['code'] === T_COMMENT ) {
			$phpcsFile->addError(
				'You must use "/**" style comments for a function comment',
				$stackPtr,
				'WrongStyle'
			);
			return;
		}
		if ( $tokens[$commentEnd]['line'] !== $tokens[$stackPtr]['line'] - $linesBetweenDocAndFunction ) {
			$phpcsFile->addError(
				'There must be no blank lines after the function comment',
				$commentEnd,
				'SpacingAfter'
			);
		}
		$commentStart = $tokens[$commentEnd]['comment_opener'];

		foreach ( $tokens[$commentStart]['comment_tags'] as $tag ) {
			$tagText = $tokens[$tag]['content'];
			if ( strcasecmp( $tagText, '@inheritDoc' ) === 0 || $tagText === '@deprecated' ) {
				// No need to validate deprecated functions or those that inherit
				// their documentation
				return;
			}
		}

		// Don't validate functions with {@inheritDoc}, per T270830
		// Not available in comment_tags, need to check manually
		$end = reset( $tokens[$commentStart]['comment_tags'] ) ?: $commentEnd;
		$rawComment = $phpcsFile->getTokensAsString( $commentStart + 1, $end - $commentStart - 1 );
		if ( stripos( $rawComment, '{@inheritDoc}' ) !== false ) {
			return;
		}

		if ( $funcName !== '__construct' ) {
			$this->processReturn( $phpcsFile, $stackPtr, $commentStart );
		}
		$this->processThrows( $phpcsFile, $commentStart );
		$this->processParams( $phpcsFile, $stackPtr, $commentStart );
	}

	/**
	 * Process the return comment of this function comment.
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param int $stackPtr The position of the current token in the stack passed in $tokens.
	 * @param int $commentStart The position in the stack where the comment started.
	 */
	protected function processReturn( File $phpcsFile, int $stackPtr, int $commentStart ): void {
		$tokens = $phpcsFile->getTokens();

		$hasReturnType = $phpcsFile->getMethodProperties( $stackPtr )['return_type'] !== '';
		// Assume interfaces/abstract methods don't return anything when they have some comment
		// already, no matter what the comment says
		$returnsValue = $this->functionReturnsValue( $phpcsFile, $stackPtr ) ?? false;

		$returnPtr = null;
		foreach ( $tokens[$commentStart]['comment_tags'] as $ptr ) {
			if ( $tokens[$ptr]['content'] !== '@return' ) {
				continue;
			}
			if ( $returnPtr ) {
				$phpcsFile->addError( 'Only 1 @return tag is allowed in a function comment', $ptr, 'DuplicateReturn' );
				return;
			}
			$returnPtr = $ptr;
		}
		if ( $returnPtr !== null ) {
			$retTypeSpacingPtr = $returnPtr + 1;
			// Check spaces before type
			if ( $tokens[$retTypeSpacingPtr]['code'] === T_DOC_COMMENT_WHITESPACE ) {
				$expectedSpaces = 1;
				$currentSpaces = strlen( $tokens[$retTypeSpacingPtr]['content'] );
				if ( $currentSpaces !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces before return type; %s found',
						$retTypeSpacingPtr,
						'SpacingBeforeReturnType',
						[ $expectedSpaces, $currentSpaces ]
					);
					if ( $fix ) {
						$phpcsFile->fixer->replaceToken( $retTypeSpacingPtr, ' ' );
					}
				}
			}
			$retTypePtr = $returnPtr + 2;
			$content = '';
			if ( $tokens[$retTypePtr]['code'] === T_DOC_COMMENT_STRING ) {
				$content = $tokens[$retTypePtr]['content'];
			}
			if ( $content === '' ) {
				$phpcsFile->addError(
					'Return type missing for @return tag in function comment',
					$returnPtr,
					'MissingReturnType'
				);
				return;
			}
			[ $type, $separatorLength, $comment ] = $this->splitTypeAndComment( $content );
			$fixType = false;
			// Check for unneeded punctuation
			$type = $this->fixTrailingPunctuation(
				$phpcsFile,
				$retTypePtr,
				$type,
				$fixType,
				'return type'
			);
			$type = $this->fixWrappedParenthesis(
				$phpcsFile,
				$retTypePtr,
				$type,
				$fixType,
				'return type'
			);
			// Check the type for short types
			$type = $this->fixShortTypes( $phpcsFile, $retTypePtr, $type, $fixType, 'return' );
			$this->maybeAddObjectTypehintError(
				$phpcsFile,
				$retTypePtr,
				$type,
				'return'
			);
			$this->maybeAddTypeTypehintError(
				$phpcsFile,
				$retTypePtr,
				$type,
				'return'
			);
			// Check spacing after type
			if ( $comment !== '' ) {
				$expectedSpaces = 1;
				if ( $separatorLength !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces after return type; %s found',
						$retTypePtr,
						'SpacingAfterReturnType',
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
					$retTypePtr,
					$type . ( $comment !== '' ? str_repeat( ' ', $separatorLength ) . $comment : '' )
				);
			}
		} elseif ( $returnsValue && !$hasReturnType && !$this->isTestFunction( $phpcsFile, $stackPtr ) ) {
			$phpcsFile->addError(
				'Missing return type or @return tag in function comment',
				$tokens[$commentStart]['comment_closer'],
				'MissingReturn'
			);
		}
	}

	private function functionReturnsValue( File $phpcsFile, int $stackPtr ): ?bool {
		$tokens = $phpcsFile->getTokens();

		// Interfaces or abstract functions don't have a body
		if ( !isset( $tokens[$stackPtr]['scope_closer'] ) ) {
			return null;
		}

		for ( $i = $tokens[$stackPtr]['scope_closer'] - 1; $i > $stackPtr; $i-- ) {
			$token = $tokens[$i];
			if ( isset( $token['scope_condition'] ) ) {
				$scope = $tokens[$token['scope_condition']]['code'];
				if ( $scope === T_FUNCTION || $scope === T_CLOSURE || $scope === T_ANON_CLASS ) {
					// Skip to the other side of the closure/inner function and continue
					$i = $token['scope_condition'];
					continue;
				}
			}
			if ( $token['code'] === T_YIELD || $token['code'] === T_YIELD_FROM ) {
				return true;
			} elseif ( $token['code'] === T_RETURN &&
				// Ignore empty `return;` and continue searching
				isset( $tokens[$i + 1] ) && $tokens[$i + 1]['code'] !== T_SEMICOLON
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Process any throw tags that this function comment has.
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param int $commentStart The position in the stack where the comment started.
	 */
	protected function processThrows( File $phpcsFile, int $commentStart ): void {
		$tokens = $phpcsFile->getTokens();
		foreach ( $tokens[$commentStart]['comment_tags'] as $tag ) {
			if ( $tokens[$tag]['content'] !== '@throws' ) {
				continue;
			}
			// Check spaces before exception
			if ( $tokens[$tag + 1]['code'] === T_DOC_COMMENT_WHITESPACE ) {
				$expectedSpaces = 1;
				$currentSpaces = strlen( $tokens[$tag + 1]['content'] );
				if ( $currentSpaces !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces before exception type; %s found',
						$tag + 1,
						'SpacingBeforeExceptionType',
						[ $expectedSpaces, $currentSpaces ]
					);
					if ( $fix ) {
						$phpcsFile->fixer->replaceToken( $tag + 1, ' ' );
					}
				}
			}
			$exception = '';
			$comment = '';
			$separatorLength = null;
			if ( $tokens[$tag + 2]['code'] === T_DOC_COMMENT_STRING ) {
				[ $exception, $separatorLength, $comment ] = $this->splitTypeAndComment( $tokens[$tag + 2]['content'] );
			}
			if ( $exception === '' ) {
				$phpcsFile->addError(
					'Exception type missing for @throws tag in function comment',
					$tag,
					'InvalidThrows'
				);
				continue;
			}
			$fixType = false;
			$exception = $this->fixWrappedParenthesis(
				$phpcsFile,
				$tag,
				$exception,
				$fixType,
				'exception type'
			);
			// Check spacing after exception
			if ( $comment !== '' ) {
				$expectedSpaces = 1;
				if ( $separatorLength !== $expectedSpaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces after exception type; %s found',
						$tag + 2,
						'SpacingAfterExceptionType',
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
					$tag + 2,
					$exception . ( $comment !== '' ? str_repeat( ' ', $separatorLength ) . $comment : '' )
				);
			}
		}
	}

	/**
	 * Process the function parameter comments.
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param int $stackPtr The position of the current token in the stack passed in $tokens.
	 * @param int $commentStart The position in the stack where the comment started.
	 */
	protected function processParams( File $phpcsFile, int $stackPtr, int $commentStart ): void {
		$tokens = $phpcsFile->getTokens();
		$params = [];
		foreach ( $tokens[$commentStart]['comment_tags'] as $pos => $tag ) {
			if ( $tokens[$tag]['content'] !== '@param' ) {
				continue;
			}

			$paramSpace = 0;
			$type = '';
			$typeSpace = 0;
			$var = '';
			$varSpace = 0;
			$comment = '';
			$commentFirst = '';
			if ( $tokens[$tag + 1]['code'] === T_DOC_COMMENT_WHITESPACE ) {
				$paramSpace = strlen( $tokens[$tag + 1]['content'] );
			}
			if ( $tokens[$tag + 2]['code'] === T_DOC_COMMENT_STRING ) {
				preg_match( '/^
						# Match parameter type and separator as a group of
						((?:
							# plain letters
							[^&$.\{\[]
							|
							# or pairs of braces around plain letters, never single braces
							\{ [^&$.\{\}]* \}
							|
							# or pairs of brackets around plain letters, never single brackets
							\[ [^&$.\[\]]* \]
							|
							# allow & on intersect types, but not as pass-by-ref
							& [^$.\[\]]
						)*) (?:
							# Match parameter name with variadic arg or surround by {} or []
							( (?: \.\.\. | [\[\{] )? [&$] \S+ )
							# Match optional rest of line
							(?: (\s+) (.*) )?
						)? /x',
					$tokens[$tag + 2]['content'],
					$matches
				);
				$untrimmedType = $matches[1] ?? '';
				$type = rtrim( $untrimmedType );
				$typeSpace = strlen( $untrimmedType ) - strlen( $type );
				if ( isset( $matches[2] ) ) {
					$var = $matches[2];
					if ( isset( $matches[4] ) ) {
						$varSpace = strlen( $matches[3] );
						$commentFirst = $matches[4];
						$comment = $commentFirst;
						// Any strings until the next tag belong to this comment.
						$end = $tokens[$commentStart]['comment_tags'][$pos + 1] ??
							$tokens[$commentStart]['comment_closer'];
						for ( $i = $tag + 3; $i < $end; $i++ ) {
							if ( $tokens[$i]['code'] === T_DOC_COMMENT_STRING ) {
								$comment .= ' ' . $tokens[$i]['content'];
							}
						}
					}
				} else {
					$phpcsFile->addError( 'Missing parameter name', $tag, 'MissingParamName' );
				}
			} else {
				$phpcsFile->addError( 'Missing parameter type', $tag, 'MissingParamType' );
			}

			$isPassByReference = str_starts_with( $var, '&' );
			// Remove the pass by reference to allow compare with varargs
			if ( $isPassByReference ) {
				$var = substr( $var, 1 );
			}

			$isLegacyVariadicArg = str_ends_with( $var, ',...' );
			$isVariadicArg = str_starts_with( $var, '...$' );
			// Remove the variadic indicator from the doc name to compare it against the real
			// name, so that we can allow both formats.
			if ( $isLegacyVariadicArg ) {
				$var = substr( $var, 0, -4 );
			} elseif ( $isVariadicArg ) {
				$var = substr( $var, 3 );
			}

			$params[] = [
				'tag' => $tag,
				'type' => $type,
				'var' => $var,
				'variadic_arg' => $isVariadicArg,
				'legacy_variadic_arg' => $isLegacyVariadicArg,
				'pass_by_reference' => $isPassByReference,
				'comment' => $comment,
				'comment_first' => $commentFirst,
				'param_space' => $paramSpace,
				'type_space' => $typeSpace,
				'var_space' => $varSpace,
			];
		}
		$realParams = $phpcsFile->getMethodParameters( $stackPtr );
		$foundParams = [];
		// We want to use ... for all variable length arguments, so added
		// this prefix to the variable name so comparisons are easier.
		foreach ( $realParams as $pos => $param ) {
			if ( $param['variable_length'] === true ) {
				$realParams[$pos]['name'] = '...' . $param['name'];
			}
		}
		foreach ( $params as $pos => $param ) {
			if ( $param['var'] === '' ) {
				continue;
			}
			// Check number of spaces before type (after @param)
			$spaces = 1;
			if ( $param['param_space'] !== $spaces ) {
				$fix = $phpcsFile->addFixableWarning(
					'Expected %s spaces before parameter type; %s found',
					$param['tag'],
					'SpacingBeforeParamType',
					[ $spaces, $param['param_space'] ]
				);
				if ( $fix ) {
					$phpcsFile->fixer->replaceToken( $param['tag'] + 1, str_repeat( ' ', $spaces ) );
				}
			}
			// Check if type is provided
			if ( $param['type'] === '' ) {
				$phpcsFile->addError(
					'Expected parameter type before parameter name "%s"',
					$param['tag'],
					'NoParamType',
					[ $param['var'] ]
				);
			} else {
				// Check number of spaces after the type.
				if ( $param['type_space'] !== $spaces ) {
					$fix = $phpcsFile->addFixableWarning(
						'Expected %s spaces after parameter type; %s found',
						$param['tag'],
						'SpacingAfterParamType',
						[ $spaces, $param['type_space'] ]
					);
					if ( $fix ) {
						$this->replaceParamComment(
							$phpcsFile,
							$param,
							[ 'type_space' => $spaces ]
						);
					}
				}

			}
			$fixVar = false;
			$var = $this->fixTrailingPunctuation(
				$phpcsFile,
				$param['tag'],
				$param['var'],
				$fixVar,
				'param name'
			);
			$var = $this->fixWrappedParenthesis(
				$phpcsFile,
				$param['tag'],
				$var,
				$fixVar,
				'param name'
			);
			if ( $fixVar ) {
				$this->replaceParamComment(
					$phpcsFile,
					$param,
					[ 'var' => $var ]
				);
			}
			// Make sure the param name is correct.
			$defaultNull = false;
			if ( isset( $realParams[$pos] ) ) {
				$realName = $realParams[$pos]['name'];
				// If difference is pass by reference, add or remove & from documentation
				if ( $param['pass_by_reference'] !== $realParams[$pos]['pass_by_reference'] ) {
					$fix = $phpcsFile->addFixableError(
						'Pass-by-reference for parameter %s does not match ' .
							'pass-by-reference of variable name %s',
						$param['tag'],
						'ParamPassByReference',
						[ $var, $realName ]
					);
					if ( $fix ) {
						$this->replaceParamComment(
							$phpcsFile,
							$param,
							[ 'pass_by_reference' => $realParams[$pos]['pass_by_reference'] ]
						);
					}
					$param['pass_by_reference'] = $realParams[$pos]['pass_by_reference'];
				}
				if ( $realName !== $var ) {
					if (
						str_starts_with( $realName, '...$' ) &&
						( $param['legacy_variadic_arg'] || $param['variadic_arg'] )
					) {
						// Mark all variants as found
						$foundParams[] = "...$var";
						$foundParams[] = "$var,...";
					} else {
						$code = 'ParamNameNoMatch';
						$error = 'Doc comment for parameter %s does not match ';
						if ( strcasecmp( $var, $realName ) === 0 ) {
							$error .= 'case of ';
							$code = 'ParamNameNoCaseMatch';
						}
						$error .= 'actual variable name %s';
						$phpcsFile->addError( $error, $param['tag'], $code, [ $var, $realName ] );
					}
				}
				$defaultNull = ( $realParams[$pos]['default'] ?? '' ) === 'null';
			} elseif ( $param['variadic_arg'] || $param['legacy_variadic_arg'] ) {
				$phpcsFile->addError(
					'Variadic parameter documented but not present in the signature',
					$param['tag'],
					'VariadicDocNotSignature'
				);
			} else {
				$phpcsFile->addError( 'Superfluous parameter comment', $param['tag'], 'ExtraParamComment' );
			}
			$foundParams[] = $var;
			$fixType = false;
			// Check for unneeded punctuation on parameter type
			$type = $this->fixWrappedParenthesis(
				$phpcsFile,
				$param['tag'],
				$param['type'],
				$fixType,
				'param type'
			);
			// Check the short type of boolean and integer
			$type = $this->fixShortTypes( $phpcsFile, $param['tag'], $type, $fixType, 'param' );
			$this->maybeAddObjectTypehintError(
				$phpcsFile,
				$param['tag'],
				$type,
				'param'
			);
			$this->maybeAddTypeTypehintError(
				$phpcsFile,
				$param['tag'],
				$type,
				'param'
			);
			$explodedType = $type === '' ? [] : explode( '|', $type );
			$nullableDoc = str_starts_with( $type, '?' );
			$nullFound = false;
			foreach ( $explodedType as $index => $singleType ) {
				$singleType = lcfirst( $singleType );
				// Either an explicit null, or mixed, which null is a
				// part of (T218324)
				if ( $singleType === 'null' || $singleType === 'mixed' ) {
					$nullFound = true;
				} elseif ( str_ends_with( $singleType, '[optional]' ) ) {
					$fix = $phpcsFile->addFixableError(
						'Key word "[optional]" on "%s" should not be used',
						$param['tag'],
						'NoOptionalKeyWord',
						[ $param['type'] ]
					);
					if ( $fix ) {
						$explodedType[$index] = substr( $singleType, 0, -10 );
						$fixType = true;
					}
				}
			}
			if (
				isset( $realParams[$pos] ) && $nullableDoc && $defaultNull &&
				!$realParams[$pos]['nullable_type']
			) {
				// Don't offer autofix, as changing a signature is somewhat delicate
				$phpcsFile->addError(
					'Use nullable type("%s") for parameters documented as nullable',
					$realParams[$pos]['token'],
					'PHP71NullableDocOptionalArg',
					[ $type ]
				);
			} elseif ( $defaultNull && !( $nullFound || $nullableDoc ) ) {
				// Check if the default of null is in the type list
				$fix = $phpcsFile->addFixableError(
					'Default of null should be declared in @param tag',
					$param['tag'],
					'DefaultNullTypeParam'
				);
				if ( $fix ) {
					$explodedType[] = 'null';
					$fixType = true;
				}
			}

			if ( $fixType ) {
				$this->replaceParamComment(
					$phpcsFile,
					$param,
					[ 'type' => implode( '|', $explodedType ) ]
				);
			}
			if ( $param['comment'] === '' ) {
				continue;
			}
			// Check number of spaces after the var name.
			if ( $param['var_space'] !== $spaces &&
				ltrim( $param['comment'] ) !== ''
			) {
				$fix = $phpcsFile->addFixableWarning(
					'Expected %s spaces after parameter name; %s found',
					$param['tag'],
					'SpacingAfterParamName',
					[ $spaces, $param['var_space'] ]
				);
				if ( $fix ) {
					$this->replaceParamComment(
						$phpcsFile,
						$param,
						[ 'var_space' => $spaces ]
					);
				}
			}
			// Warn if the parameter is documented as variadic, but the signature doesn't have
			// the splat operator
			if (
				( $param['variadic_arg'] || $param['legacy_variadic_arg'] ) &&
				isset( $realParams[$pos] ) &&
				$realParams[$pos]['variable_length'] === false
			) {
				$legacyName = $param['legacy_variadic_arg'] ? "$var,..." : "...$var";
				$phpcsFile->addError(
					'Splat operator missing for documented variadic parameter "%s"',
					$realParams[$pos]['token'],
					'MissingSplatVariadicArg',
					[ $legacyName ]
				);
			}
		}
		$missingParams = [];
		$hasUntypedParams = false;
		foreach ( $realParams as $param ) {
			$hasUntypedParams = $hasUntypedParams || $param['type_hint'] === '';
			if ( !in_array( $param['name'], $foundParams ) ) {
				$missingParams[] = $param['name'];
			}
		}
		$isTestFunction = $this->isTestFunction( $phpcsFile, $stackPtr );
		// Report missing comments, unless *all* parameters have types.
		// As an exception, tests are allowed to omit comments an long as they omit *all* comments.
		if ( $hasUntypedParams && ( !$isTestFunction || $foundParams !== [] ) ) {
			foreach ( $missingParams as $neededParam ) {
				$phpcsFile->addError(
					'Doc comment for parameter "%s" missing',
					$commentStart,
					'MissingParamTag',
					[ $neededParam ]
				);
			}
		}
	}

	/**
	 * Replace a {@}param comment
	 *
	 * @param File $phpcsFile The file being scanned.
	 * @param array $param Array of the @param
	 * @param array $fixParam Array with fixes to @param. Only provide keys to replace
	 */
	protected function replaceParamComment( File $phpcsFile, array $param, array $fixParam ): void {
		// Use the old value for unchanged keys
		$fixParam += $param;

		// Build the new line
		$content = $fixParam['type'] .
			str_repeat( ' ', $fixParam['type_space'] ) .
			( $fixParam['pass_by_reference'] ? '&' : '' ) .
			( $fixParam['variadic_arg'] ? '...' : '' ) .
			$fixParam['var'] .
			( $fixParam['legacy_variadic_arg'] ? ',...' : '' ) .
			str_repeat( ' ', $fixParam['var_space'] ) .
			$fixParam['comment_first'];
		$phpcsFile->fixer->replaceToken( $fixParam['tag'] + 2, $content );
	}

}
