<?php

namespace MediaWiki\Sniffs\NamingConventions;

use MediaWiki\Sniffs\PHPUnit\PHPUnitTestTrait;
use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

/**
 * Make sure function names follow lower camel case
 *
 * This ignores methods in the form on(Something) where the class
 * implements an interface with the name (Something)Hook, to avoid
 * sending warnings for code in MediaWiki extensions and skins for
 * hook handlers where the method cannot be renamed because it is
 * inherited from the hook interface
 *
 * @author DannyS712
 */
class LowerCamelFunctionsNameSniff implements Sniff {

	use PHPUnitTestTrait;

	// Magic methods.
	private const MAGIC_METHODS = [
		'__construct' => true,
		'__destruct' => true,
		'__call' => true,
		'__callstatic' => true,
		'__get' => true,
		'__set' => true,
		'__isset' => true,
		'__unset' => true,
		'__sleep' => true,
		'__wakeup' => true,
		'__tostring' => true,
		'__set_state' => true,
		'__clone' => true,
		'__invoke' => true,
		'__serialize' => true,
		'__unserialize' => true,
		'__debuginfo' => true
	];

	// A list of non-magic methods with double underscore.
	private const METHOD_DOUBLE_UNDERSCORE = [
		'__soapcall' => true,
		'__getlastrequest' => true,
		'__getlastresponse' => true,
		'__getlastrequestheaders' => true,
		'__getlastresponseheaders' => true,
		'__getfunctions' => true,
		'__gettypes' => true,
		'__dorequest' => true,
		'__setcookie' => true,
		'__setlocation' => true,
		'__setsoapheaders' => true
	];

	/**
	 * @inheritDoc
	 */
	public function register(): array {
		return [ T_FUNCTION ];
	}

	/**
	 * @param File $phpcsFile
	 * @param int $stackPtr The current token index.
	 * @return void
	 */
	public function process( File $phpcsFile, $stackPtr ) {
		$originalFunctionName = $phpcsFile->getDeclarationName( $stackPtr );
		if ( $originalFunctionName === null ) {
			return;
		}

		$lowerFunctionName = strtolower( $originalFunctionName );
		if ( isset( self::METHOD_DOUBLE_UNDERSCORE[$lowerFunctionName] ) ||
			isset( self::MAGIC_METHODS[$lowerFunctionName] )
		) {
			// Method is excluded from this sniff
			return;
		}

		$containsUnderscores = str_contains( $originalFunctionName, '_' );
		if ( $originalFunctionName[0] === $lowerFunctionName[0] &&
			( !$containsUnderscores || $this->isTestFunction( $phpcsFile, $stackPtr ) )
		) {
			// Everything is ok when the first letter is lowercase and there are no underscores
			// (except in tests where they are allowed)
			return;
		}

		if ( $containsUnderscores ) {
			// Check for MediaWiki hooks
			// Only matters if there is an underscore, all hook handlers have methods beginning
			// with "on" and so start with lowercase
			if ( $this->shouldIgnoreHookHandler( $phpcsFile, $stackPtr, $originalFunctionName ) ) {
				return;
			}
		}

		$tokens = $phpcsFile->getTokens();
		foreach ( $tokens[$stackPtr]['conditions'] as $code ) {
			if ( !isset( Tokens::$ooScopeTokens[$code] ) ) {
				continue;
			}

			$phpcsFile->addError(
				'Method name "%s" should use lower camel case.',
				$stackPtr,
				'FunctionName',
				[ $originalFunctionName ]
			);
		}
	}

	/**
	 * Check if the method should be ignored because it is a hook handler and the method
	 * name is inherited from an interface
	 *
	 * @param File $phpcsFile
	 * @param int $stackPtr
	 * @param string $functionName
	 * @return bool
	 */
	private function shouldIgnoreHookHandler(
		File $phpcsFile,
		int $stackPtr,
		string $functionName
	): bool {
		$matches = [];
		if ( !( preg_match( '/^on([A-Z]\S+)$/', $functionName, $matches ) ) ) {
			return false;
		}

		// Method name looks like a hook handler, check if the class implements
		// a hook by that name

		$classToken = $this->getClassToken( $phpcsFile, $stackPtr );
		if ( !$classToken ) {
			// Not within a class, don't skip
			return false;
		}

		$implementedInterfaces = $phpcsFile->findImplementedInterfaceNames( $classToken );
		if ( !$implementedInterfaces ) {
			// Not implementing the hook interface
			return false;
		}

		$hookMethodName = $matches[1];
		$hookInterfaceName = $hookMethodName . 'Hook';

		// We need to account for the interface name in both the fully qualified form,
		// and just the interface name. If we have the fully qualified form, explode()
		// will return an array of the different namespaces and sub namespaces, with the
		// last entry being the actual interface name, and if we just have the interface
		// name, explode() will return an array of just that string
		foreach ( $implementedInterfaces as $interface ) {
			$parts = explode( '\\', $interface );
			if ( end( $parts ) === $hookInterfaceName ) {
				return true;
			}
		}
		return false;
	}

}
