<?php

declare( strict_types = 1 );

namespace App\Command;

use App\Security\ApiTokenIssuer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Mints an API access token for curl debugging and ops:
 *
 *   curl -H "Authorization: Bearer $(bin/console app:api-token)" ...
 */
#[AsCommand( name: 'app:api-token', description: 'Mint an API access token' )]
class MintApiTokenCommand extends Command {

	public function __construct( private readonly ApiTokenIssuer $issuer ) {
		parent::__construct();
	}

	protected function configure(): void {
		$this->addOption(
			'ttl',
			null,
			InputOption::VALUE_REQUIRED,
			'Token lifetime in seconds',
			(string)ApiTokenIssuer::DEFAULT_TTL
		);
	}

	protected function execute( InputInterface $input, OutputInterface $output ): int {
		$output->writeln( $this->issuer->mint( 'anon', (int)$input->getOption( 'ttl' ) ) );
		return Command::SUCCESS;
	}
}
