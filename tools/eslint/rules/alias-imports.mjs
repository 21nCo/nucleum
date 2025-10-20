import {
  isAliasPath,
  isDisallowedImport,
  loadAliasMap
} from "../../alias-utils.mjs";

const getLiteralValue = (node) => {
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

const reportIfDisallowed = (context, literalNode, importPath, aliasMap) => {
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

const rule = {
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
      ImportDeclaration(node) {
        reportIfDisallowed(context, node.source, getLiteralValue(node), aliasMap);
      },
      ImportExpression(node) {
        const literalNode =
          node.source && node.source.type === "Literal" ? node.source : null;

        reportIfDisallowed(context, literalNode, getLiteralValue(node), aliasMap);
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0
        ) {
          const importPath = getLiteralValue(node);
          const literalNode = node.arguments[0]?.type === "Literal" ? node.arguments[0] : null;

          reportIfDisallowed(context, literalNode, importPath, aliasMap);
        }
      }
    };
  }
};

export default rule;
