<?php
/**
 * Verify MediaWiki global variable naming convention.
 * A global name must be prefixed with 'wg'.
 */

namespace MediaWiki\Sniffs\NamingConventions;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;

class ValidGlobalNameSniff implements Sniff {

	/**
	 * https://php.net/manual/en/reserved.variables.argv.php
	 */
	private const PHP_RESERVED = [
		'$GLOBALS',
		'$_SERVER',
		'$_GET',
		'$_POST',
		'$_FILES',
		'$_REQUEST',
		'$_SESSION',
		'$_ENV',
		'$_COOKIE',
		'$php_errormsg',
		'$HTTP_RAW_POST_DATA',
		'$http_response_header',
		'$argc',
		'$argv'
	];

	/**
	 * A list of global variable prefixes allowed.
	 *
	 * @var array
	 */
	public array $allowedPrefixes = [ 'wg' ];

	/** @var string[] */
	public array $ignoreList = [];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_GLOBAL ];
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

		$nameIndex = $phpcsFile->findNext( T_VARIABLE, $stackPtr + 1 );
		if ( !$nameIndex ) {
			// Avoid possibly running in an endless loop below
			return;
		}

		// Note: This requires at least 1 character after the prefix
		$allowedPrefixesPattern = '/^\$(?:' . implode( '|', $this->allowedPrefixes ) . ')(.)/';
		$semicolonIndex = $phpcsFile->findNext( T_SEMICOLON, $stackPtr + 1 );

		while ( $nameIndex < $semicolonIndex ) {
			// Note, this skips dynamic identifiers.
			if ( $tokens[$nameIndex ]['code'] === T_VARIABLE && $tokens[$nameIndex - 1]['code'] !== T_DOLLAR ) {
				$globalName = $tokens[$nameIndex]['content'];

				if ( in_array( $globalName, $this->ignoreList ) ||
					in_array( $globalName, self::PHP_RESERVED )
				) {
					// need to manually increment $nameIndex here since
					// we won't reach the line at the end that does it
					$nameIndex++;
					continue;
				}

				// Determine if a simple error message can be used

				if ( count( $this->allowedPrefixes ) === 1 ) {
					// Skip '$' and forge a valid global variable name
					$expected = '"$' . $this->allowedPrefixes[0] . ucfirst( substr( $globalName, 1 ) ) . '"';

					// Build message telling you the allowed prefix
					$allowedPrefix = '\'' . $this->allowedPrefixes[0] . '\'';
				} else {
					// We already checked for an empty set of allowed prefixes earlier,
					// so if the count is not 1 them it must be multiple;
					// build a list of forged valid global variable names
					$expected = 'one of "$'
						. implode( ucfirst( substr( $globalName, 1 ) . '", "$' ), $this->allowedPrefixes )
						. ucfirst( substr( $globalName, 1 ) )
						. '"';

					// Build message telling you which prefixes are allowed
					$allowedPrefix = 'one of \''
						. implode( '\', \'', $this->allowedPrefixes )
						. '\'';
				}

				// Verify global is prefixed with an allowed prefix
				$isAllowed = preg_match( $allowedPrefixesPattern, $globalName, $matches );
				if ( !$isAllowed ) {
					$phpcsFile->addError(
						'Global variable "%s" is lacking an allowed prefix (%s). Should be %s.',
						$stackPtr,
						'allowedPrefix',
						[ $globalName, $allowedPrefix, $expected ]
					);
				} elseif ( ctype_lower( $matches[1] ) ) {
					$phpcsFile->addError(
						'Global variable "%s" should use CamelCase: %s',
						$stackPtr,
						'CamelCase',
						[ $globalName, $expected ]
					);
				}
			}
			$nameIndex++;
		}
	}
}
