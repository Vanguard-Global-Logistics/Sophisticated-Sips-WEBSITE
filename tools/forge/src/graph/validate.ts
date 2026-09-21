/**
 * Static graph validation.
 *
 * Everything checkable without running anything is checked here: duplicate ids,
 * unknown node types, dangling edges, port-type mismatches, unsatisfied required
 * inputs, cycles, and unreachable outputs. Callers get every problem at once
 * rather than one per run, because fixing a graph one error at a time is the
 * single most tedious part of working in ComfyUI.
 */
import type { AnyNodeDefinition, Graph } from "./types.js";

export interface ValidationIssue {
  readonly nodeId: string | null;
  readonly message: string;
}

export class GraphValidationError extends Error {
  readonly issues: readonly ValidationIssue[];
  constructor(issues: readonly ValidationIssue[]) {
    super(
      `graph validation failed with ${issues.length} issue(s):\n` +
        issues.map((i) => `  - ${i.nodeId ? `[${i.nodeId}] ` : ""}${i.message}`).join("\n"),
    );
    this.name = "GraphValidationError";
    this.issues = issues;
  }
}

export type NodeRegistry = ReadonlyMap<string, AnyNodeDefinition>;

/** Collect every structural and type problem in `graph`. Empty means valid. */
export function collectIssues(graph: Graph, registry: NodeRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map<string, (typeof graph.nodes)[number]>();

  for (const node of graph.nodes) {
    if (byId.has(node.id)) {
      issues.push({ nodeId: node.id, message: `duplicate node id "${node.id}"` });
      continue;
    }
    byId.set(node.id, node);
    if (!registry.has(node.type)) {
      issues.push({ nodeId: node.id, message: `unknown node type "${node.type}"` });
    }
  }

  for (const node of graph.nodes) {
    const def = registry.get(node.type);
    if (!def) continue;

    // Params must parse. A node whose params are wrong is a node that would
    // have failed mid-render, so surface it now.
    try {
      def.parseParams(node.params);
    } catch (error) {
      issues.push({
        nodeId: node.id,
        message: `invalid params: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    const wired = node.inputs ?? {};
    for (const [portName, sourceId] of Object.entries(wired)) {
      const portSpec = def.inputs[portName];
      if (!portSpec) {
        issues.push({
          nodeId: node.id,
          message:
            `input "${portName}" is not a port on ${node.type} ` +
            `(expected one of: ${Object.keys(def.inputs).join(", ") || "none"})`,
        });
        continue;
      }
      const source = byId.get(sourceId);
      if (!source) {
        issues.push({
          nodeId: node.id,
          message: `input "${portName}" refers to missing node "${sourceId}"`,
        });
        continue;
      }
      const sourceDef = registry.get(source.type);
      if (!sourceDef) continue;
      if (sourceDef.output.type !== portSpec.type) {
        issues.push({
          nodeId: node.id,
          message:
            `input "${portName}" expects ${portSpec.type}, but "${sourceId}" ` +
            `(${source.type}) emits ${sourceDef.output.type}`,
        });
      }
    }

    for (const [portName, spec] of Object.entries(def.inputs)) {
      if (!spec.optional && !(portName in wired)) {
        issues.push({
          nodeId: node.id,
          message: `required input "${portName}" (${spec.type}) is not connected`,
        });
      }
    }
  }

  for (const outputId of graph.outputs) {
    if (!byId.has(outputId)) {
      issues.push({ nodeId: null, message: `declared output "${outputId}" is not a node` });
    }
  }
  if (graph.outputs.length === 0) {
    issues.push({ nodeId: null, message: "graph declares no outputs" });
  }

  issues.push(...findCycles(graph, byId));
  return issues;
}

export function validateGraph(graph: Graph, registry: NodeRegistry): void {
  const issues = collectIssues(graph, registry);
  if (issues.length > 0) throw new GraphValidationError(issues);
}

/**
 * Depth-first cycle detection. Reports each cycle once, naming the path, since
 * "there is a cycle" without the path is nearly useless on a large graph.
 */
function findCycles(
  graph: Graph,
  byId: ReadonlyMap<string, (typeof graph.nodes)[number]>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const state = new Map<string, "visiting" | "done">();
  const reported = new Set<string>();

  const visit = (id: string, path: string[]): void => {
    const current = state.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      const start = path.indexOf(id);
      const cycle = path.slice(start === -1 ? 0 : start).concat(id);
      const key = [...cycle].sort().join("|");
      if (!reported.has(key)) {
        reported.add(key);
        issues.push({ nodeId: id, message: `cycle: ${cycle.join(" -> ")}` });
      }
      return;
    }
    state.set(id, "visiting");
    const node = byId.get(id);
    for (const sourceId of Object.values(node?.inputs ?? {})) {
      if (byId.has(sourceId)) visit(sourceId, [...path, id]);
    }
    state.set(id, "done");
  };

  for (const node of graph.nodes) visit(node.id, []);
  return issues;
}

/**
 * Nodes in dependency order, restricted to those the declared outputs actually
 * need. Assumes the graph already validated, so it is acyclic.
 */
export function topologicalOrder(graph: Graph, registry: NodeRegistry): string[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const order: string[] = [];
  const seen = new Set<string>();

  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return;
    for (const sourceId of Object.values(node.inputs ?? {})) visit(sourceId);
    order.push(id);
  };

  for (const outputId of graph.outputs) visit(outputId);
  void registry;
  return order;
}
