import { cruise } from 'dependency-cruiser'
import type { ICruiseResult, IDependency } from 'dependency-cruiser'
import path from 'path'
import fs from 'fs'
import { Project, SyntaxKind } from 'ts-morph'
import type { ImportGraph, ModuleNode, ImportEdge, ExportInfo, ExportKind, Directive, ModuleRole } from '../types.js'

export interface AnalysisConfig {
  srcDir: string
  tsConfigPath: string
  exclude: string[]
}

export async function extractImportGraph(config: AnalysisConfig): Promise<ImportGraph> {
  if (!fs.existsSync(config.srcDir)) {
    throw new Error(`srcDir does not exist: ${config.srcDir}`)
  }

  const srcDirResolved = path.resolve(config.srcDir)
  console.log(`[analyze] Scanning: ${srcDirResolved}`)

  const safeExcludePatterns = config.exclude.filter(
    (p) => !p.includes('*') && !p.startsWith('!') && p !== 'node_modules'
  )

  const cruiseResult = await cruise([config.srcDir], {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: config.tsConfigPath },
    doNotFollow: {
      path: ['node_modules', ...safeExcludePatterns],
    },
    ruleSet: {},
  })

  const cruiseOutput = cruiseResult.output as ICruiseResult

  function toRelative(fullPath: string): string {
    const resolved = path.resolve(fullPath)
    if (resolved.startsWith(srcDirResolved + path.sep) || resolved === srcDirResolved) {
      return path.relative(srcDirResolved, resolved)
    }
    return fullPath
  }

  const modules: ModuleNode[] = cruiseOutput.modules.map((m) => {
    const relativePath = toRelative(m.source)
    const basename = path.basename(relativePath)
    const isBarrel = basename === 'index.ts' || basename === 'index.js'
    return {
      path: relativePath,
      isBarrel,
      exports: [],
      directives: [],
    }
  })

  const edges: ImportEdge[] = []
  for (const m of cruiseOutput.modules) {
    const sourcePath = toRelative(m.source)

    for (const dep of m.dependencies as IDependency[]) {
      if (!dep.followable || dep.coreModule || dep.couldNotResolve) continue

      const targetPath = toRelative(dep.resolved)
      const types = dep.dependencyTypes.filter((t) => t !== 'local')

      edges.push({
        source: sourcePath,
        target: targetPath,
        dependencyTypes: types.length > 0 ? types : dep.dependencyTypes,
      })
    }
  }

  console.log(`[analyze] Found ${modules.length} modules, ${edges.length} edges`)

  return { modules, edges }
}

export async function extractSymbolMap(config: AnalysisConfig): Promise<ModuleNode[]> {
  if (!fs.existsSync(config.srcDir)) {
    throw new Error(`srcDir does not exist: ${config.srcDir}`)
  }

  const srcDirResolved = path.resolve(config.srcDir)

  const project = new Project({
    tsConfigFilePath: config.tsConfigPath,
    skipFileDependencyResolution: true, // CRITICAL - prevent OOM
    skipLoadingLibFiles: true,          // CRITICAL - prevent OOM
  })

  const globs = [
    `${srcDirResolved}/**/*.ts`,
    `!${srcDirResolved}/**/*.test.ts`,
    `!${srcDirResolved}/**/*.spec.ts`,
    `!${srcDirResolved}/**/*.tsx`,
    ...config.exclude.map(p => `!${path.resolve(p)}`),
  ]
  const sourceFiles = project.addSourceFilesAtPaths(globs)

  const resultModules: ModuleNode[] = []

  for (const sourceFile of sourceFiles) {
    const relPath = path.relative(srcDirResolved, sourceFile.getFilePath())
    const exports: ExportInfo[] = []
    const directives: Directive[] = []

    const statements = sourceFile.getStatements()
    const firstStatement = statements[0]
    if (firstStatement?.getKind() === SyntaxKind.ExpressionStatement) {
      const text = firstStatement.getText().replace(/['"]/g, '').trim()
      if (text === 'use client') directives.push('use client')
      if (text === 'use server') directives.push('use server')
    }

    const exportedDecls = sourceFile.getExportedDeclarations()
    for (const [name, decls] of exportedDecls) {
      if (name === 'default') continue
      const decl = decls[0]
      if (!decl) continue

      let kind: ExportKind = 'variable'
      switch (decl.getKind()) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
          kind = name.startsWith('use') ? 'hook' : 'function'
          break
        case SyntaxKind.ClassDeclaration:
          kind = 'class'
          break
        case SyntaxKind.TypeAliasDeclaration:
          kind = 'type'
          break
        case SyntaxKind.InterfaceDeclaration:
          kind = 'interface'
          break
        case SyntaxKind.EnumDeclaration:
          kind = 'enum'
          break
        default:
          kind = 'variable'
      }

      exports.push({ name, kind })
    }

    const basename = path.basename(relPath)
    const isBarrel = basename === 'index.ts' || basename === 'index.js'
    const hasComponents = exports.some(e => e.kind === 'component')
    const hasHooks = exports.some(e => e.kind === 'hook')
    const hasServices = exports.some(e => e.kind === 'class' && e.name.includes('Service'))

    let role: ModuleRole = 'unknown'
    if (isBarrel) role = 'util'
    else if (directives.includes('use client') || hasComponents) role = 'component'
    else if (hasHooks) role = 'hook'
    else if (hasServices || exports.some(e => e.kind === 'class')) role = 'service'
    else if (exports.length > 0 && exports.every(e => e.kind === 'type' || e.kind === 'interface')) role = 'type'
    else role = 'util'

    resultModules.push({
      path: relPath,
      isBarrel,
      exports,
      directives,
      role,
      lineCount: sourceFile.getEndLineNumber(),
    })
  }

  return resultModules
}
