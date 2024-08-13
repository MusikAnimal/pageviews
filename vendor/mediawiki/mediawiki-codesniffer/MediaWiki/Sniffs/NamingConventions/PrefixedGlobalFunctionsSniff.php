<?php
/**
 * Verify that global functions start with a valid prefix
 *
 * For MediaWiki code, the valid prefixes are `wf` (or `ef` in some legacy
 * extension code, per https://www.mediawiki.org/wiki/Manual:Coding_conventions/PHP#Naming),
 * by default the sniff only allows `wf`, but repositories
 * can configure this via the `allowedPrefixes` property.
 */

namespace MediaWiki\Sniffs\NamingConventions;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

class PrefixedGlobalFunctionsSniff implements Sniff {

	/** @var string[] */
	public array $ignoreList = [];

	/**
	 * A list of global function prefixes allowed.
	 *
	 * @var string[]
	 */
	public array $allowedPrefixes = [ 'wf' ];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_FUNCTION ];
	}

	/**
	 * @var int[] array containing the first locations of namespaces in files that we have seen so far.
	 */
	private array $firstNamespaceLocations = [];

	/**
	 * @param File $phpcsFile
	 * @param int $ptr The current token index.
	 *
	 * @return bool Does a namespace statement exist before this position in the file?
	 */
	private function tokenIsNamespaced( File $phpcsFile, int $ptr ): bool {
		$fileName = $phpcsFile->getFilename();

		// Check if we already know if the token is namespaced or not
		if ( !isset( $this->firstNamespaceLocations[$fileName] ) ) {
			// If not scan the whole file at once looking for namespacing or lack of and set in the statics.
			$tokens = $phpcsFile->getTokens();
			$numTokens = $phpcsFile->numTokens;
			for ( $tokenIndex = 0; $tokenIndex < $numTokens; $tokenIndex++ ) {
				$token = $tokens[$tokenIndex];
				if ( $token['code'] === T_NAMESPACE && !isset( $token['scope_opener'] ) ) {
					// In the format of "namespace Foo;", which applies to everything below
					$this->firstNamespaceLocations[$fileName] = $tokenIndex;
					break;
				}

				if ( isset( $token['scope_closer'] ) ) {
					// Skip any non-zero level code as it can not contain a relevant namespace
					$tokenIndex = $token['scope_closer'];
					continue;
				}
			}

			// Nothing found, just save unreachable token index
			if ( !isset( $this->firstNamespaceLocations[$fileName] ) ) {
				$this->firstNamespaceLocations[$fileName] = $numTokens;
			}
		}

		// Return if the token was namespaced.
		return $ptr > $this->firstNamespaceLocations[$fileName];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return int|void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		// If there are no prefixes specified, we have nothing to do for this file
		if ( $this->allowedPrefixes === [] ) {
			// @codeCoverageIgnoreStart
			return $phpcsFile->numTokens;
			// @codeCoverageIgnoreEnd
		}

		$tokens = $phpcsFile->getTokens();

		// Check if function is global
		if ( $tokens[$stackPtr]['level'] !== 0 ) {
			return;
		}

		$name = $phpcsFile->getDeclarationName( $stackPtr );
		if ( $name === null || in_array( $name, $this->ignoreList ) ) {
			return;
		}

		foreach ( $this->allowedPrefixes as $allowedPrefix ) {
			if ( str_starts_with( $name, $allowedPrefix ) ) {
				return;
			}
		}

		if ( $this->tokenIsNamespaced( $phpcsFile, $stackPtr ) ) {
			return;
		}

		// From ValidGlobalNameSniff
		if ( count( $this->allowedPrefixes ) === 1 ) {
			// Build message telling you the allowed prefix
			$allowedPrefix = '\'' . $this->allowedPrefixes[0] . '\'';

			// Forge a valid global function name
			$expected = $this->allowedPrefixes[0] . ucfirst( $name ) . "()";
		} else {
			// Build message telling you which prefixes are allowed
			$allowedPrefix = 'one of \''
				. implode( '\', \'', $this->allowedPrefixes )
				. '\'';

			// Build a list of forged valid global function names
			$expected = 'one of "'
				. implode( ucfirst( $name ) . '()", "', $this->allowedPrefixes )
				. ucfirst( $name )
				. '()"';
		}
		$phpcsFile->addError(
			'Global function "%s()" is lacking a valid prefix (%s). It should be %s.',
			$stackPtr,
			'allowedPrefix',
			[ $name, $allowedPrefix, $expected ]
		);
	}
}
