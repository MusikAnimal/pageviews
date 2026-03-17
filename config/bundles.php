<?php

declare( strict_types = 1 );

return [
	Symfony\Bundle\FrameworkBundle\FrameworkBundle::class => [ 'all' => true ],
	Doctrine\Bundle\DoctrineBundle\DoctrineBundle::class => [ 'all' => true ],
	Wikimedia\ToolforgeBundle\ToolforgeBundle::class => [ 'dev' => true ],
	Symfony\Bundle\TwigBundle\TwigBundle::class => [ 'all' => true ],
	Symfony\Bundle\WebProfilerBundle\WebProfilerBundle::class => [ 'dev' => true, 'test' => true ],
	Twig\Extra\TwigExtraBundle\TwigExtraBundle::class => [ 'all' => true ],
];
