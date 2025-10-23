import type { Rule } from "eslint";
import type { CallExpression, ImportDeclaration, ImportExpression } from "estree";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AliasUtils = typeof import("../../alias-utils.cjs");

const {
  loadAliasMap,
  isAliasPath,
  isDisallowedImport
} = require(path.resolve(__dirname, "../../../alias-utils.cjs")) as AliasUtils;

const getLiteralValue = (node: ImportDeclaration | CallExpression | ImportExpression) => {
  if (node.type === "ImportDeclaration") {
    return typeof node.source.value === "string" ? node.source.value : null;
  }

  if (node.type === "ImportExpression") {
    return node.source.type === "Literal" && typeof node.source.value === "string"
      ? node.source.value
      : null;
  }

  if (node.type === "CallExpression") {
    const [firstArg] = node.arguments;

    if (!firstArg || firstArg.type !== "Literal") {
      return null;
    }

    return typeof firstArg.value === "string" ? firstArg.value : null;
  }

  return null;
};

const reportIfDisallowed = (
  context: Rule.RuleContext,
  literalNode: import("estree").Literal | null,
  importPath: string | null,
  aliasMap: Record<string, string>
) => {
  if (!importPath || !literalNode) {
    return;
  }

  if (isAliasPath(importPath, aliasMap)) {
    return;
  }

  if (isDisallowedImport(importPath)) {
    context.report({
      node: literalNode,
      messageId: "disallowedImport",
      data: { importPath }
    });
  }
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce workspace alias imports instead of relative paths, $lib, client/, apps/, or shared/ prefixes.",
      recommended: false
    },
    messages: {
      disallowedImport:
        "Import path `{{importPath}}` is restricted. Use workspace aliases defined in tools/alias-map.json."
    },
    schema: []
  },
  create(context) {
    const aliasMap = loadAliasMap();

    return {
      ImportDeclaration(node: ImportDeclaration) {
        reportIfDisallowed(context, node.source, getLiteralValue(node), aliasMap);
      },
      ImportExpression(node: ImportExpression | any) {
        const literalNode =
          node.source && node.source.type === "Literal"
            ? (node.source as import("estree").Literal)
            : null;

        reportIfDisallowed(
          context,
          literalNode,
          getLiteralValue(node as ImportExpression),
          aliasMap
        );
      },
      CallExpression(node: CallExpression) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0
        ) {
          const importPath = getLiteralValue(node);
          const literalNode = node.arguments[0] as import("estree").Literal | null;
          reportIfDisallowed(context, literalNode, importPath, aliasMap);
        }
      }
    };
  }
};

export default rule;
