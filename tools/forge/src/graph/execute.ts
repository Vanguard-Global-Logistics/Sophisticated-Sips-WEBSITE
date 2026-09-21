/**
 * Graph execution.
 *
 * Validates, addresses, then runs nodes in dependency order, consulting the
 * cache before each one. The run is deliberately sequential: nodes that cost
 * money should not be fired off in parallel speculatively, and an early failure
 * should stop the spend rather than race ahead.
 */
import { addressGraph } from "./hash.js";
import type { ExecutionContext, Graph, ImageBackend } from "./types.js";
import { topologicalOrder, validateGraph, type NodeRegistry } from "./validate.js";

/** Somewhere to keep node values between runs. In-memory by default. */
export interface ResultCache {
  get(address: string): Promise<unknown | undefined>;
  set(address: string, value: unknown): Promise<void>;
}

export class MemoryCache implements ResultCache {
  readonly #entries = new Map<string, unknown>();
  async get(address: string): Promise<unknown | undefined> {
    return this.#entries.get(address);
  }
  async set(address: string, value: unknown): Promise<void> {
    this.#entries.set(address, value);
  }
  get size(): number {
    return this.#entries.size;
  }
}

export interface RunOptions {
  readonly backend: ImageBackend;
  readonly cache?: ResultCache;
  /** Skip billable nodes and report what they would have cost. */
  readonly dryRun?: boolean;
  readonly log?: (message: string) => void;
}

export interface NodeTrace {
  readonly id: string;
  readonly type: string;
  readonly address: string;
  readonly status: "computed" | "cached" | "skipped-dry-run";
  readonly durationMs: number;
}

export interface RunResult {
  /** Values of the graph's declared output nodes, keyed by node id. */
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly trace: readonly NodeTrace[];
  /**
   * A reproducibility record: the graph, every node address, and the backend
   * that served it. Persist this beside an image and the image is accounted for.
   */
  readonly manifest: RunManifest;
}

export interface RunManifest {
  readonly backend: string;
  readonly dryRun: boolean;
  readonly createdAt: string;
  readonly addresses: Readonly<Record<string, string>>;
  readonly graph: Graph;
}

export async function runGraph(
  graph: Graph,
  registry: NodeRegistry,
  options: RunOptions,
): Promise<RunResult> {
  validateGraph(graph, registry);

  const order = topologicalOrder(graph, registry);
  const addresses = addressGraph(graph, registry, order);
  const cache = options.cache ?? new MemoryCache();
  const dryRun = options.dryRun ?? false;
  const log = options.log ?? (() => {});
  const ctx: ExecutionContext = { backend: options.backend, dryRun, log };

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const values = new Map<string, unknown>();
  const trace: NodeTrace[] = [];

  for (const id of order) {
    const node = byId.get(id);
    if (!node) continue;
    // Validation already proved every node type resolves.
    const def = registry.get(node.type)!;
    const address = addresses.get(id)!;
    const started = Date.now();

    const cached = await cache.get(address);
    if (cached !== undefined) {
      values.set(id, cached);
      trace.push({
        id,
        type: node.type,
        address,
        status: "cached",
        durationMs: Date.now() - started,
      });
      log(`cache hit  ${id} (${node.type})`);
      continue;
    }

    if (dryRun && def.billable) {
      // Leave the value unset. Anything downstream that genuinely needs it will
      // fail loudly rather than quietly rendering from a placeholder.
      trace.push({
        id,
        type: node.type,
        address,
        status: "skipped-dry-run",
        durationMs: Date.now() - started,
      });
      log(`dry run    ${id} (${node.type}) - billable, not executed`);
      continue;
    }

    const inputs: Record<string, unknown> = {};
    for (const [port, sourceId] of Object.entries(node.inputs ?? {})) {
      inputs[port] = values.get(sourceId);
    }

    let value: unknown;
    try {
      value = await def.run({ params: def.parseParams(node.params), inputs, ctx });
    } catch (error) {
      throw new NodeExecutionError(id, node.type, error);
    }

    values.set(id, value);
    await cache.set(address, value);
    trace.push({
      id,
      type: node.type,
      address,
      status: "computed",
      durationMs: Date.now() - started,
    });
    log(`computed   ${id} (${node.type})`);
  }

  const outputs: Record<string, unknown> = {};
  for (const outputId of graph.outputs) outputs[outputId] = values.get(outputId);

  return {
    outputs,
    trace,
    manifest: {
      backend: options.backend.name,
      dryRun,
      createdAt: new Date().toISOString(),
      addresses: Object.fromEntries(addresses),
      graph,
    },
  };
}

export class NodeExecutionError extends Error {
  readonly nodeId: string;
  readonly nodeType: string;
  constructor(nodeId: string, nodeType: string, cause: unknown) {
    super(
      `node "${nodeId}" (${nodeType}) failed: ` +
        (cause instanceof Error ? cause.message : String(cause)),
    );
    this.name = "NodeExecutionError";
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.cause = cause;
  }
}
