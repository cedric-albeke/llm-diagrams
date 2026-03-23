// ============================================
// Phase 1 Output: Static Analysis Types
// ============================================

export type ExportKind = 'function' | 'class' | 'type' | 'interface' | 'variable' | 'component' | 'hook' | 'context' | 'enum';

export interface ExportInfo {
  name: string;
  kind: ExportKind;
}

export type Directive = 'use client' | 'use server';

export interface ModuleNode {
  path: string;           // relative to srcDir
  isBarrel: boolean;      // true if only re-exports, no original declarations
  exports: ExportInfo[];
  directives: Directive[];
  role?: ModuleRole;      // classification added by graph-utils
  lineCount?: number;     // added by ts-morph
}

export type ModuleRole = 'component' | 'hook' | 'service' | 'util' | 'config' | 'type' | 'context' | 'unknown';

export interface ImportEdge {
  source: string;         // path of importing module
  target: string;         // path of imported module (resolved, not alias)
  dependencyTypes: string[];
}

export interface ImportGraph {
  modules: ModuleNode[];
  edges: ImportEdge[];
}

// ============================================
// Phase 2 Output: LLM Reasoning Types
// ============================================

export type ModuleGroupRole = 'frontend' | 'backend' | 'shared' | 'external';

export interface ModuleGroup {
  name: string;           // human-readable name, e.g. "Payment Processing"
  description: string;
  files: string[];        // relative file paths
  role: ModuleGroupRole;
}

export type RelationshipStyle = 'sync' | 'async' | 'data';

export interface ModuleRelationship {
  from: string;           // group name
  to: string;             // group name
  label: string;
  style: RelationshipStyle;
}

export interface ArchitectureGraph {
  groups: ModuleGroup[];
  relationships: ModuleRelationship[];
  c4Level: 1 | 2;
}

// ============================================
// Phase 3 Output: Layout Types
// ============================================

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  group?: string;
  color?: string;
}

export interface BendPoint {
  x: number;
  y: number;
}

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  bendPoints?: BendPoint[];
}

export interface LayoutZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export interface LayoutedDiagram {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  zones: LayoutZone[];
}

// ============================================
// Phase 4: Rendering Types
// ============================================

export type OutputFormat = 'excalidraw' | 'mermaid' | 'canvas' | 'svg' | 'png';

export interface RenderOptions {
  format: OutputFormat[];
  outputDir: string;
}

export interface RenderResult {
  format: string;
  filePath: string;
  success: boolean;
  error?: string;
}

// ============================================
// Pipeline Result Types
// ============================================

export interface PhaseResult {
  phase: 'analyze' | 'reason' | 'layout' | 'render';
  success: boolean;
  duration: number;
  error?: string;
}

export interface PipelineResult {
  phases: PhaseResult[];
  outputs: RenderResult[];
  duration: number;
}

// ============================================
// Config Types
// ============================================

export type LLMProvider = 'anthropic' | 'claude-subscription' | 'none';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export type LayoutDirection = 'RIGHT' | 'DOWN';

export interface StyleConfig {
  direction: LayoutDirection;
  colorScheme: Record<string, string>;
  fontSize: number;
}

export interface ArchDiagramConfig {
  srcDir: string;
  tsConfigPath: string;
  exclude: string[];
  outputDir: string;
  llm: LLMConfig;
  style: StyleConfig;
}

// ============================================
// LLM Prompt/Response Types (for reason.ts)
// ============================================

export interface FileSummary {
  filePath: string;
  purpose: string;
  role: ModuleRole;
}
