import ts from 'typescript';

/** Conservative JS/TS comparison: uncertain syntax and reflective code retain drift. */
function declaredName(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.flatMap((declaration) => ts.isIdentifier(declaration.name) ? [declaration.name.text] : []);
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) return statement.name ? [statement.name.text] : [];
  return [];
}
function fingerprint(file: string, content: string): string | undefined {
  if (!/\.[cm]?[jt]sx?$/.test(file) || /\b(?:eval|with)\s*\(/.test(content)) return undefined;
  const options: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, noLib: true, noResolve: true, allowJs: true };
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => name === file ? source : undefined;
  const program = ts.createProgram([file], options, host);
  if (program.getSyntacticDiagnostics(source).length) return undefined;
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ removeComments: true });
  const publicTypes: string[] = [];
  const referenced = new Set<ts.Declaration>();
  const collectPublicType = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      for (const declaration of checker.getSymbolAtLocation(node)?.declarations ?? []) {
        if (referenced.has(declaration) || declaration.getSourceFile() !== source) continue;
        if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
          referenced.add(declaration);
          collectPublicType(declaration);
        }
      }
    }
    ts.forEachChild(node, collectPublicType);
  };
  const typeText = (node: ts.Node | undefined) => {
    if (!node) return '';
    collectPublicType(node);
    return printer.printNode(ts.EmitHint.Unspecified, node, source);
  };
  const signature = (node: ts.SignatureDeclaration) => JSON.stringify({
    parameters: node.parameters.map((parameter) => ({ type: typeText(parameter.type), optional: !!parameter.questionToken, rest: !!parameter.dotDotDotToken })),
    returns: typeText(node.type), typeParameters: node.typeParameters?.map(typeText),
  });
  const initializers = new Set<ts.Node>();
  const initializerTypes = (node: ts.Node): void => {
    if (initializers.has(node)) return;
    initializers.add(node);
    if (ts.isFunctionLike(node)) { publicTypes.push(signature(node)); return; }
    if (ts.isTypeNode(node)) { publicTypes.push(typeText(node)); return; }
    if (ts.isIdentifier(node)) for (const declaration of checker.getSymbolAtLocation(node)?.declarations ?? []) {
      if (declaration.getSourceFile() === source && (ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration))) initializerTypes(declaration);
    }
    ts.forEachChild(node, initializerTypes);
  };
  const exportedNames = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.moduleSpecifier || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) return undefined;
      for (const element of statement.exportClause.elements) exportedNames.add((element.propertyName ?? element.name).text);
    } else if (ts.isExportAssignment(statement)) {
      if (!ts.isIdentifier(statement.expression)) return undefined;
      exportedNames.add(statement.expression.text);
    }
  }
  const declaredNames = new Set(source.statements.flatMap(declaredName));
  if ([...exportedNames].some((name) => !declaredNames.has(name))) return undefined;
  for (const statement of source.statements) {
    const exported = (ts.canHaveModifiers(statement) && !!ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
      declaredName(statement).some((name) => exportedNames.has(name));
    if (!exported) continue;
    if (!(ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) || ts.isVariableStatement(statement))) return undefined;
    if (ts.isFunctionDeclaration(statement)) publicTypes.push(signature(statement));
    if (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      publicTypes.push(...statement.typeParameters?.map(typeText) ?? []);
    }
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) publicTypes.push(printer.printNode(ts.EmitHint.Unspecified, statement, source));
    if (ts.isClassDeclaration(statement)) for (const member of statement.members) {
      if (ts.canHaveModifiers(member) && ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)) continue;
      if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) publicTypes.push(signature(member));
      if (ts.isPropertyDeclaration(member)) publicTypes.push(JSON.stringify({ type: typeText(member.type), optional: !!member.questionToken }));
    }
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) return undefined;
      publicTypes.push(typeText(declaration.type));
      if (declaration.initializer) initializerTypes(declaration.initializer);
    }
  }
  publicTypes.push(...[...referenced].map((declaration) => printer.printNode(ts.EmitHint.Unspecified, declaration, source)));
  const locals = new Map<ts.Symbol, string>();
  const protectedSymbols = new Set<ts.Symbol>();
  const collect = (node: ts.Node): void => {
    if (ts.isShorthandPropertyAssignment(node)) {
      const symbol = checker.getShorthandAssignmentValueSymbol(node);
      if (symbol) protectedSymbols.add(symbol);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && ts.findAncestor(node, ts.isFunctionLike)) {
      let initializer = node.initializer;
      while (initializer && (ts.isParenthesizedExpression(initializer) || ts.isAsExpression(initializer) ||
        ts.isTypeAssertionExpression(initializer) || ts.isSatisfiesExpression(initializer) || ts.isNonNullExpression(initializer))) initializer = initializer.expression;
      if (!(initializer && (ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer) || ts.isClassExpression(initializer)))) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol) locals.set(symbol, `__testweave_local_${locals.size}`);
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(source);
  const transformed = ts.transform(source, [(context) => {
    const visit: ts.Visitor = (node) => {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const name = symbol && !protectedSymbols.has(symbol) ? locals.get(symbol) : undefined;
        if (name) return ts.factory.createIdentifier(name);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.SourceFile;
  }]);
  try {
    const printed = ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0]!);
    const output = ts.transpileModule(printed, { fileName: file, compilerOptions: { ...options, removeComments: true } }).outputText;
    const parsed = ts.createSourceFile(file, output, ts.ScriptTarget.Latest, true);
    function structure(node: ts.Node): unknown {
      const children: unknown[] = [];
      ts.forEachChild(node, (child) => { children.push(structure(child)); });
      return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & ts.NodeFlags.BlockScoped : 0, children.length ? children : 'text' in node ? node.text : node.getText(parsed)];
    }
    return JSON.stringify([publicTypes, structure(parsed)]);
  } finally { transformed.dispose(); }
}
export function isCosmeticChange(file: string, before: string | undefined, after: string | undefined): boolean {
  if (before === undefined || after === undefined) return false;
  const previous = fingerprint(file, before);
  return previous !== undefined && previous === fingerprint(file, after);
}
