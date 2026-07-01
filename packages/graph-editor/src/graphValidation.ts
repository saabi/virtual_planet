import {
	isWarning,
	validateGraphFull,
	type GraphDocument,
	type ValidationIssue,
	type ValidationResult
} from '@virtual-planet/graph';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationHighlightIndex {
	nodeErrors: ReadonlySet<string>;
	nodeWarnings: ReadonlySet<string>;
	ports: ReadonlyMap<string, IssueSeverity>;
	edges: ReadonlySet<string>;
}

export function fullValidation(doc: GraphDocument): ValidationResult {
	return validateGraphFull(doc);
}

export function countValidationSeverity(issues: ValidationIssue[]): {
	errors: number;
	warnings: number;
} {
	let errors = 0;
	let warnings = 0;
	for (const issue of issues) {
		if (isWarning(issue)) warnings += 1;
		else errors += 1;
	}
	return { errors, warnings };
}

/** Message shown when compile/preview must not run (errors only). */
export function incompleteGraphMessage(result: ValidationResult): string | null {
	const { errors, warnings } = countValidationSeverity(result.issues);
	if (errors === 0) return null;
	const warnSuffix =
		warnings > 0 ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : '';
	return `Graph incomplete: ${errors} error${errors === 1 ? '' : 's'}${warnSuffix}`;
}

export function buildValidationHighlightIndex(issues: ValidationIssue[]): ValidationHighlightIndex {
	const nodeErrors = new Set<string>();
	const nodeWarnings = new Set<string>();
	const ports = new Map<string, IssueSeverity>();
	const edges = new Set<string>();

	const markNode = (nodeId: string, severity: IssueSeverity) => {
		if (severity === 'error') nodeErrors.add(nodeId);
		else nodeWarnings.add(nodeId);
	};

	const markPort = (nodeId: string, portId: string, severity: IssueSeverity) => {
		const key = `${nodeId}:${portId}`;
		const existing = ports.get(key);
		if (existing === 'error' || severity === 'error') ports.set(key, 'error');
		else ports.set(key, severity);
	};

	for (const issue of issues) {
		const severity: IssueSeverity = isWarning(issue) ? 'warning' : 'error';
		switch (issue.kind) {
			case 'unresolved-primitive':
			case 'dangling-node':
				markNode(issue.node, severity);
				break;
			case 'unknown-node':
				markNode(issue.node, severity);
				edges.add(issue.edge);
				break;
			case 'unconnected-input':
				markPort(issue.node, issue.port, severity);
				markNode(issue.node, severity);
				break;
			case 'no-output-path':
				markPort(issue.node, issue.port, 'error');
				markNode(issue.node, 'error');
				break;
			case 'unknown-port':
			case 'type-mismatch':
			case 'space-mismatch':
			case 'bad-direction':
				edges.add(issue.edge);
				break;
			case 'multiple-inputs':
				markPort(issue.node, issue.port, severity);
				markNode(issue.node, severity);
				break;
			default: {
				const _exhaustive: never = issue;
				void _exhaustive;
			}
		}
	}

	return { nodeErrors, nodeWarnings, ports, edges };
}

export function formatValidationIssue(issue: ValidationIssue): string {
	switch (issue.kind) {
		case 'unconnected-input':
			return `Unconnected input ${issue.node}.${issue.port}`;
		case 'unresolved-primitive':
			return `Unknown primitive ${issue.primitive} on node ${issue.node}`;
		case 'no-output-path':
			return `Output ${issue.output} references missing ${issue.node}.${issue.port}`;
		case 'dangling-node':
			return `Node ${issue.node} is not connected to any output`;
		case 'unknown-node':
			return `Edge ${issue.edge} references missing node ${issue.node}`;
		case 'unknown-port':
			return `Edge ${issue.edge}: unknown port ${issue.node}.${issue.port}`;
		case 'type-mismatch':
			return `Edge ${issue.edge}: type mismatch ${issue.from} → ${issue.to}`;
		case 'space-mismatch':
			return `Edge ${issue.edge}: space mismatch ${issue.from} → ${issue.to}`;
		case 'bad-direction':
			return `Edge ${issue.edge}: invalid ${issue.end} port direction`;
		case 'multiple-inputs':
			return `Input ${issue.node}.${issue.port} has ${issue.count} incoming edges (max 1)`;
		default: {
			const _exhaustive: never = issue;
			return String(_exhaustive);
		}
	}
}

export function issueFocusTarget(
	issue: ValidationIssue
): { nodeId?: string; edgeId?: string } {
	switch (issue.kind) {
		case 'unconnected-input':
		case 'unresolved-primitive':
		case 'dangling-node':
		case 'no-output-path':
		case 'multiple-inputs':
			return { nodeId: issue.node };
		case 'unknown-node':
		case 'unknown-port':
		case 'type-mismatch':
		case 'space-mismatch':
		case 'bad-direction':
			return { edgeId: issue.edge };
		default: {
			const _exhaustive: never = issue;
			void _exhaustive;
			return {};
		}
	}
}
