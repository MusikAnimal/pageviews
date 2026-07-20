let promise = null;

async function fetchProjects() {
	try {
		const response = await fetch( '/projects.json' );
		return response.ok ? await response.json() : [];
	} catch {
		return [];
	}
}

export function getProjects() {
	// Assigned before any await runs, so concurrent callers share one fetch.
	promise ??= fetchProjects();
	return promise;
}
