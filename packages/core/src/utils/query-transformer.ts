/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

type ASTNode = QueryNode | PhraseNode | OperatorNode;

type QueryNode = {
  type: "query";
  children: ASTNode[];
};

type PhraseNode = {
  type: "phrase";
  value: string[];
};

type OperatorNode = {
  type: "AND" | "OR" | "NOT";
};

const INVALID_QUERY_REGEX = /[!"#$%&'()*+,\-./:;<>=?@[\\\]^_`{|}~§]/;
function escapeSQLString(str: string): string {
  if (str.startsWith('"') && str.endsWith('"')) {
    const innerStr = str.slice(1, -1).replace(/"/g, '""');
    return `"${innerStr}"`;
  }

  const hasInvalidSymbol = INVALID_QUERY_REGEX.test(str);
  const isWildcard =
    str.startsWith("*") ||
    str.endsWith("*") ||
    str.startsWith("%") ||
    str.endsWith("%");
  if (hasInvalidSymbol || isWildcard) {
    return `"${str}"`;
  }

  // if (isWildcard) {
  //   return str.replace(/(.+?)(\*?$)/gm, (_, text, end) => {
  //     return `${escapeSQLString(text)}${end}`;
  //   });
  // }

  // if (str.includes("-")) {
  //   return `"${str.replace(/"/g, '""')}"`;
  // }

  return str.replace(/"/g, '""');
}

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let buffer = "";
  let isQuoted = false;

  for (let i = 0; i < query.length; ++i) {
    const char = query[i];
    if (char === '"') {
      isQuoted = !isQuoted;
    }
    if (char === " " && !isQuoted) {
      if (buffer.length > 0) {
        tokens.push(buffer);
        buffer = "";
      }
    } else {
      buffer += char;
    }
  }
  if (buffer.length > 0) tokens.push(buffer);

  return tokens;
}

function parseTokens(tokens: string[]): QueryNode {
  const ast: QueryNode = { type: "query", children: [] };
  let currentPhrase: string[] = [];

  for (const token of tokens) {
    if (token === "AND" || token === "OR" || token === "NOT") {
      if (currentPhrase.length > 0) {
        ast.children.push({ type: "phrase", value: currentPhrase });
        currentPhrase = [];
      }
      ast.children.push({ type: token });
    } else {
      currentPhrase.push(token);
    }
  }

  if (currentPhrase.length > 0) {
    ast.children.push({ type: "phrase", value: currentPhrase });
  }

  return ast;
}

function transformAST(ast: QueryNode): QueryNode {
  const transformedAST: QueryNode = { ...ast, children: [] };
  let lastWasPhrase = false;

  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i];

    if (child.type === "phrase") {
      if (lastWasPhrase) {
        transformedAST.children.push({ type: "AND" });
      }
      const transformedPhrase = child.value.map(escapeSQLString);
      transformedAST.children.push({
        type: "phrase",
        value: transformedPhrase
      });
      lastWasPhrase = true;
    } else if (
      child.type === "AND" ||
      child.type === "OR" ||
      child.type === "NOT"
    ) {
      if (
        lastWasPhrase &&
        i + 1 < ast.children.length &&
        ast.children[i + 1].type === "phrase"
      ) {
        transformedAST.children.push(child);
        lastWasPhrase = false;
      }
    }
  }

  return transformedAST;
}

function generateSQL(ast: QueryNode): string {
  return ast.children
    .map((child) => {
      if (child.type === "phrase") {
        return child.value.join(" AND ");
      }
      if (child.type === "AND" || child.type === "OR" || child.type === "NOT") {
        return child.type;
      }
      return "";
    })
    .join(" ");
}

export function transformQuery(query: string) {
  const tokens = tokenize(query);
  const largeTokens = tokens.filter(
    (token) => token.length >= 3 || token === "OR"
  );
  return {
    query: generateSQL(transformAST(parseTokens(largeTokens))),
    tokens: tokenizeAst(transformAST(parseTokens(tokens)))
  };
}

interface QueryTokens {
  andTokens: string[];
  orTokens: string[];
  notTokens: string[];
}

function tokenizeAst(ast: QueryNode): QueryTokens {
  const result: QueryTokens = {
    andTokens: [],
    orTokens: [],
    notTokens: []
  };

  let isNextNot = false;
  let isNextOr = false;

  for (let i = 0; i < ast.children.length; i++) {
    const node = ast.children[i];

    if (node.type === "NOT") {
      isNextNot = true;
      continue;
    }

    if (node.type === "OR") {
      isNextOr = true;
      continue;
    }

    if (node.type === "phrase") {
      // Handle each word in the phrase
      for (const word of node.value) {
        if (
          result.orTokens.includes(word) ||
          result.andTokens.includes(word) ||
          result.notTokens.includes(word)
        ) {
          isNextOr = false;
          isNextNot = false;
          continue;
        }
        if (isNextOr) {
          result.orTokens.push(word);
        } else if (isNextNot) {
          result.notTokens.push(word);
        } else {
          result.andTokens.push(word);
        }
      }

      isNextOr = false;
      isNextNot = false;
    }
  }

  return result;
}
