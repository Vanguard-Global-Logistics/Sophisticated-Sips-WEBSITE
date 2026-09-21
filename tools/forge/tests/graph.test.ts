import { describe, expect, it } from "vitest";
import { MockBackend } from "../src/backends/mock.js";
import { MemoryCache, runGraph } from "../src/graph/execute.js";
import { GraphValidationError, collectIssues } from "../src/graph/validate.js";
import { stableStringify } from "../src/graph/hash.js";
import { builtinRegistry } from "../src/nodes/index.js";
import type { Graph, ImageRef } from "../src/graph/types.js";

const registry = builtinRegistry();

const rigParams = {
  subject: "a barista pulling a shot, steam catching the window light",
  camera: "eos_r5",
  lens: "canon_85_12",
  focalMm: 85,
  aperture: 1.2,
  subjectDistanceM: 1.5,
  shutterSeconds: 1 / 2500,
  iso: 400,
  film: "portra_400",
  lighting: "rembrandt",
};

function graph(overrides: Partial<Record<string, unknown>> = {}): Graph {
  return {
    nodes: [
      { id: "rig", type: "camera_rig", params: { ...rigParams, ...overrides } },
      { id: "prompt", type: "compile_prompt", inputs: { shot: "rig" } },
      {
        id: "base",
        type: "render",
        params: { model: "seedream_v4_5", aspectRatio: "16:9", resolution: "2k", seed: 7 },
        inputs: { prompt: "prompt" },
      },
      {
        id: "final",
        type: "resolution_ladder",
        params: { target: "8k", aspectRatio: "16:9" },
        inputs: { image: "base" },
      },
    ],
    outputs: ["final"],
  };
}

describe("validation", () => {
  it("accepts a well-formed graph", () => {
    expect(collectIssues(graph(), registry)).toEqual([]);
  });

  it("reports a port-type mismatch before anything runs", () => {
    const bad: Graph = {
      nodes: [
        { id: "rig", type: "camera_rig", params: rigParams },
        // A shot wired straight into render, which wants a prompt.
        {
          id: "base",
          type: "render",
          params: { model: "m", aspectRatio: "16:9", resolution: "2k" },
          inputs: { prompt: "rig" },
        },
      ],
      outputs: ["base"],
    };
    const issues = collectIssues(bad, registry);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/expects prompt.*emits shot/);
  });

  it("reports every problem at once rather than the first", () => {
    const bad: Graph = {
      nodes: [
        { id: "a", type: "no_such_node" },
        { id: "a", type: "compile_prompt" },
        { id: "b", type: "compile_prompt", inputs: { shot: "missing" } },
        { id: "c", type: "compile_prompt" },
      ],
      outputs: ["nowhere"],
    };
    const issues = collectIssues(bad, registry);
    const text = issues.map((i) => i.message).join("\n");
    expect(issues.length).toBeGreaterThanOrEqual(4);
    expect(text).toMatch(/duplicate node id/);
    expect(text).toMatch(/unknown node type/);
    expect(text).toMatch(/refers to missing node/);
    expect(text).toMatch(/declared output "nowhere"/);
  });

  it("names the path of a cycle", () => {
    const cyclic: Graph = {
      nodes: [
        { id: "x", type: "compile_prompt", inputs: { shot: "y" } },
        { id: "y", type: "compile_prompt", inputs: { shot: "x" } },
      ],
      outputs: ["x"],
    };
    const text = collectIssues(cyclic, registry)
      .map((i) => i.message)
      .join("\n");
    expect(text).toMatch(/cycle: /);
  });

  it("flags an unconnected required input", () => {
    const bad: Graph = {
      nodes: [{ id: "p", type: "compile_prompt" }],
      outputs: ["p"],
    };
    expect(collectIssues(bad, registry).map((i) => i.message).join()).toMatch(
      /required input "shot"/,
    );
  });

  it("rejects invalid node params", () => {
    const issues = collectIssues(graph({ camera: "not_a_camera" }), registry);
    expect(issues.map((i) => i.message).join()).toMatch(/"camera" must be one of/);
  });

  it("runGraph refuses to execute an invalid graph", async () => {
    const bad: Graph = { nodes: [{ id: "p", type: "compile_prompt" }], outputs: ["p"] };
    await expect(runGraph(bad, registry, { backend: new MockBackend() })).rejects.toThrow(
      GraphValidationError,
    );
  });
});

describe("execution", () => {
  it("runs the full pipeline and reaches the 8K target", async () => {
    const backend = new MockBackend();
    const result = await runGraph(graph(), registry, { backend });
    const final = result.outputs.final as ImageRef;
    expect(final.widthPx).toBe(7680);
    expect(final.heightPx).toBe(4320);
    expect(result.trace.every((t) => t.status === "computed")).toBe(true);
  });

  it("records a manifest naming the backend and every node address", async () => {
    const result = await runGraph(graph(), registry, { backend: new MockBackend() });
    expect(result.manifest.backend).toBe("mock");
    expect(Object.keys(result.manifest.addresses).sort()).toEqual([
      "base",
      "final",
      "prompt",
      "rig",
    ]);
  });

  it("skips billable nodes on a dry run", async () => {
    const backend = new MockBackend();
    const result = await runGraph(graph(), registry, { backend, dryRun: true });
    expect(backend.calls).toHaveLength(0);
    const skipped = result.trace.filter((t) => t.status === "skipped-dry-run").map((t) => t.id);
    expect(skipped).toEqual(["base", "final"]);
  });
});

describe("content-addressed cache", () => {
  it("re-runs nothing when the graph is unchanged", async () => {
    const cache = new MemoryCache();
    const first = new MockBackend();
    await runGraph(graph(), registry, { backend: first, cache });
    expect(first.calls.length).toBeGreaterThan(0);

    const second = new MockBackend();
    const result = await runGraph(graph(), registry, { backend: second, cache });
    expect(second.calls).toHaveLength(0);
    expect(result.trace.every((t) => t.status === "cached")).toBe(true);
  });

  it("re-runs only what an aperture change actually affects", async () => {
    const cache = new MemoryCache();
    await runGraph(graph(), registry, { backend: new MockBackend(), cache });

    // Aperture feeds the rig, so rig/prompt/base change; but the ladder's own
    // params are untouched, so it is only its input that differs.
    const backend = new MockBackend();
    const result = await runGraph(graph({ aperture: 2.8 }), registry, { backend, cache });
    const statuses = Object.fromEntries(result.trace.map((t) => [t.id, t.status]));
    expect(statuses).toEqual({
      rig: "computed",
      prompt: "computed",
      base: "computed",
      final: "computed",
    });
  });

  it("hits cache for a branch untouched by the change", async () => {
    const cache = new MemoryCache();
    const g = graph();
    await runGraph(g, registry, { backend: new MockBackend(), cache });

    // Changing only the ladder target leaves rig, prompt and base addressable
    // exactly as before.
    const changed: Graph = {
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === "final" ? { ...n, params: { target: "4k", aspectRatio: "16:9" } } : n,
      ),
    };
    const result = await runGraph(changed, registry, { backend: new MockBackend(), cache });
    const statuses = Object.fromEntries(result.trace.map((t) => [t.id, t.status]));
    expect(statuses.rig).toBe("cached");
    expect(statuses.prompt).toBe("cached");
    expect(statuses.base).toBe("cached");
    expect(statuses.final).toBe("computed");
  });
});

describe("stableStringify", () => {
  it("is insensitive to key order", () => {
    expect(stableStringify({ a: 1, b: [2, { d: 4, c: 3 }] })).toBe(
      stableStringify({ b: [2, { c: 3, d: 4 }], a: 1 }),
    );
  });

  it("treats an absent key and an undefined value alike", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});
