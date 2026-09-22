import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

for (const name of ["Navbar", "NavbarSession"]) {
  test(`${name} navigates on demand without speculative page requests`, () => {
    const source = readFileSync(new URL(`../components/layout/${name}.tsx`, import.meta.url), "utf8");
    const file = ts.createSourceFile(`${name}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let links = 0;
    const visit = (node: ts.Node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === "Link") {
        links++;
        const attribute = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(file) === "prefetch");
        assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer)
          && attribute.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword, "Every navigation Link opts out of prefetch");
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    assert.ok(links >= 3);
    assert.doesNotMatch(source, /router\.prefetch/);
    if (name === "Navbar") {
      assert.match(source, /onSelect=\{\(\) => router.push\(href\(link.href\)\)\}/);
      assert.match(source, /aria-expanded=\{isMenuOpen\}/);
    } else {
      assert.match(source, /adminEnabled && session.isAdmin/);
      assert.match(source, /onClick=\{signOut\}/);
    }
  });
}
