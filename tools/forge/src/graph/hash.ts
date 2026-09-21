/**
 * Content addressing.
 *
 * A node's address is the hash of its type, its normalised params, and the
 * addresses of everything feeding it. Two nodes share an address exactly when
 * they would produce the same value, so the address is a sound cache key.
 *
 * This is what makes iteration cheap: change one node's aperture and only that
 * node and its descendants get new addresses. Everything upstream, and every
 * unrelated branch, hits cache. ComfyUI approximates this; here it falls out of
 * the data model.
 */
import { createHash } from "node:crypto";
import type { Graph } from "./types.js";
import type { NodeRegistry } from "./validate.js";

/**
 * Serialise a value so that structurally equal values yield identical strings.
 * Object keys are sorted, because `{a:1,b:2}` and `{b:2,a:1}` must not produce
 * different cache keys.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * Address every node reachable from the graph's outputs.
 *
 * `order` must be a dependency order, so each node's upstream addresses are
 * known by the time it is reached.
 */
export function addressGraph(
  graph: Graph,
  registry: NodeRegistry,
  order: readonly string[],
): Map<string, string> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const addresses = new Map<string, string>();

  for (const id of order) {
    const node = byId.get(id);
    if (!node) continue;
    const def = registry.get(node.type);
    // Hash the parsed params rather than the raw ones, so two spellings of the
    // same intent (a default left out vs. written explicitly) share an address.
    const params = def ? def.parseParams(node.params) : node.params;

    const upstream = Object.entries(node.inputs ?? {})
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([port, sourceId]) => `${port}=${addresses.get(sourceId) ?? "unresolved"}`)
      .join(",");

    addresses.set(id, sha256(`${node.type}\u0000${stableStringify(params)}\u0000${upstream}`));
  }

  return addresses;
}
