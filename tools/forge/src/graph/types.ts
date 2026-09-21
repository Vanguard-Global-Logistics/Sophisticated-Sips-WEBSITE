/**
 * Graph model.
 *
 * A workflow is a directed acyclic graph of nodes. Each node declares typed
 * input and output ports; edges carry a value from one node's output port to
 * another's input port. Unlike ComfyUI, where a mismatched connection surfaces
 * as a Python traceback partway through a render, every structural and type
 * error here is caught by `validateGraph` before a single node runs — which
 * matters when running a node costs money.
 */

/** Runtime tag for what flows along an edge. */
export type PortType =
  | "shot"       // a SolvedShot
  | "prompt"     // a CompiledPrompt
  | "image"      // an ImageRef
  | "number"
  | "string"
  | "json";

export interface PortSpec {
  readonly type: PortType;
  readonly description: string;
  /** An input with `optional: true` may be left unconnected. */
  readonly optional?: boolean;
}

/** A node's static contract: what it accepts, what it emits, what it costs. */
export interface NodeDefinition<
  Params = unknown,
  Inputs extends Record<string, unknown> = Record<string, unknown>,
  Output = unknown,
> {
  readonly type: string;
  readonly summary: string;
  readonly inputs: Readonly<Record<string, PortSpec>>;
  readonly output: PortSpec;
  /** Validate and normalise this node's literal params. Throws on bad input. */
  readonly parseParams: (raw: unknown) => Params;
  /**
   * Whether running this node spends the owner's money. Cost-bearing nodes are
   * never executed during a dry run, and are always cache-checked first.
   */
  readonly billable?: boolean;
  readonly run: (args: {
    readonly params: Params;
    readonly inputs: Inputs;
    readonly ctx: ExecutionContext;
  }) => Promise<Output>;
}

/**
 * A node definition with its generics erased.
 *
 * A registry holds definitions with mutually incompatible param and input
 * types, so there is no single sound type parameter that fits them all. The
 * erasure is confined to this alias and to the registry lookup; each node's
 * own `parseParams` re-establishes the type at the point of use.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNodeDefinition = NodeDefinition<any, any, unknown>;

/** A node instance inside a graph. */
export interface GraphNode {
  readonly id: string;
  readonly type: string;
  readonly params?: unknown;
  /** Map of this node's input port name -> the upstream node id feeding it. */
  readonly inputs?: Readonly<Record<string, string>>;
}

export interface Graph {
  readonly nodes: readonly GraphNode[];
  /** Node ids whose values are the graph's result. */
  readonly outputs: readonly string[];
}

/** A generated or uploaded image the backend can address. */
export interface ImageRef {
  readonly id: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly url?: string;
  /** Which backend minted this reference; ids are not portable across them. */
  readonly backend: string;
}

export interface ExecutionContext {
  readonly backend: ImageBackend;
  /** When true, billable nodes must not call the backend. */
  readonly dryRun: boolean;
  readonly log: (message: string) => void;
}

/** What a rendering backend must provide. Local and hosted both implement it. */
export interface ImageBackend {
  readonly name: string;
  /** Credits (or an equivalent unit) a text-to-image call would cost. */
  estimateTextToImage(req: TextToImageRequest): Promise<number>;
  textToImage(req: TextToImageRequest): Promise<ImageRef>;
  estimateUpscale(req: UpscaleRequest): Promise<number>;
  upscale(req: UpscaleRequest): Promise<ImageRef>;
}

export interface TextToImageRequest {
  readonly prompt: string;
  readonly negative?: string;
  readonly model: string;
  readonly aspectRatio: string;
  readonly resolution: string;
  readonly seed?: number;
}

export interface UpscaleRequest {
  readonly image: ImageRef;
  readonly targetWidthPx: number;
  readonly targetHeightPx: number;
}
