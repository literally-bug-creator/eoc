/*
 * SPDX-FileCopyrightText: Copyright (c) 2022-2025 Objectionary.com
 * SPDX-License-Identifier: MIT
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { runSync } = require("../helpers");

describe("docs", () => {
  const home = path.resolve("temp/test-docs");
  const parsed = path.resolve(home, "1-parse");
  const docs = path.join(home, "docs");
  beforeEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
    fs.mkdirSync(parsed, { recursive: true });
  });
  /**
   * Tests that the 'docs' command generates HTML files in the docs directory.
   * @param {Mocha.Done} done - Mocha callback signaling asynchronous completion
   */
  it("generates HTML files for files and packages", (done) => {
    const sample = path.join(parsed, "foo", "bar");
    fs.mkdirSync(sample, { recursive: true });
    const xmir1 = path.join(sample, "test1.xmir");
    fs.writeFileSync(xmir1, '<program name="test" />');
    const xmir2 = path.join(sample, "test2.xmir");
    fs.writeFileSync(xmir2, '<program name="test" />');
    runSync(["docs", "--verbose", "-s", path.resolve(home, "src"), "-t", home]);
    assert(
      fs.existsSync(docs),
      "Expected the docs directory to be created but it is missing",
    );
    const test1_html = path.join(docs, "foo/bar/test1.html");
    assert(
      fs.existsSync(test1_html),
      `Expected file ${test1_html} but it was not created`,
    );
    const test2_html = path.join(docs, "foo/bar/test2.html");
    assert(
      fs.existsSync(test2_html),
      `Expected file ${test2_html} but it was not created`,
    );
    const package_foo_bar_html = path.join(docs, "package_foo.bar.html");
    assert(
      fs.existsSync(package_foo_bar_html),
      `Expected file ${package_foo_bar_html} but it was not created`,
    );
    const packages_html = path.join(docs, "packages.html");
    assert(
      fs.existsSync(packages_html),
      `Expected file ${packages_html} but it was not created`,
    );
    const css_html = path.join(docs, "styles.css");
    assert(
      fs.existsSync(css_html),
      `Expected file ${css_html} but it was not created`,
    );
    done();
  });
  /**
   * Tests that the 'docs' command generates expected comments from XMIR to HTML.
   * @param {Mocha.Done} done - Mocha callback signaling asynchronous completion
   */
  it("generates necessary comments from XMIR to HTML", (done) => {
    const sample = path.join(parsed, "foo");
    fs.mkdirSync(sample, { recursive: true });
    const xmir1 = path.join(sample, "test1.xmir");
    fs.writeFileSync(
      xmir1,
      fs
        .readFileSync(path.join(__dirname, "..", "resources", "test1.xmir"))
        .toString(),
    );
    const xmir2 = path.join(sample, "test2.xmir");
    fs.writeFileSync(
      xmir2,
      fs
        .readFileSync(path.join(__dirname, "..", "resources", "test2.xmir"))
        .toString(),
    );
    runSync(["docs", "--verbose", "-s", path.resolve(home, "src"), "-t", home]);
    assert(
      fs.existsSync(docs),
      "Expected the docs directory to be created but it is missing",
    );
    const test1_html = path.join(docs, "foo/test1.html");
    assert(
      fs.existsSync(test1_html),
      `Expected file ${test1_html} but it was not created`,
    );
    const test1_content = fs.readFileSync(test1_html);
    assert(
      test1_content.includes("This is documentation for app"),
      `Expected documentation but it was not found in ${test1_html}`,
    );
    assert(
      test1_content.includes("First docs line"),
      `Expected documentation but it was not found in ${test1_html}`,
    );
    assert(
      test1_content.includes("Second docs line"),
      `Expected documentation but it was not found in ${test1_html}`,
    );
    const package_html = path.join(docs, "package_foo.html");
    assert(
      fs.existsSync(package_html),
      `Expected file ${package_html} but it was not created`,
    );
    const package_content = fs.readFileSync(package_html);
    assert(
      package_content.includes("This is documentation for app"),
      `Expected documentation but it was not found in ${package_html}`,
    );
    assert(
      package_content.includes("First docs line"),
      `Expected documentation but it was not found in ${package_html}`,
    );
    assert(
      package_content.includes("Second docs line"),
      `Expected documentation but it was not found in ${package_html}`,
    );
    assert(
      package_content.includes("Second test app"),
      `Expected documentation but it was not found in ${package_html}`,
    );
    const packages_html = path.join(docs, "packages.html");
    assert(
      fs.existsSync(packages_html),
      `Expected file ${packages_html} but it was not created`,
    );
    const packages_content = fs.readFileSync(packages_html);
    assert(
      packages_content.includes("This is documentation for app"),
      `Expected documentation but it was not found in ${packages_html}`,
    );
    assert(
      packages_content.includes("First docs line"),
      `Expected documentation but it was not found in ${packages_html}`,
    );
    assert(
      packages_content.includes("Second docs line"),
      `Expected documentation but it was not found in ${packages_html}`,
    );
    assert(
      packages_content.includes("Second test app"),
      `Expected documentation but it was not found in ${packages_html}`,
    );
    done();
  });
  /**
   * Tests that the 'docs' command does not generate unnecessary comments from XMIR to HTML.
   * @param {Mocha.Done} done - Mocha callback signaling asynchronous completion
   */
  it("does not generate unnecessary comment from XMIR to HTML", (done) => {
    const sample = parsed;
    fs.mkdirSync(sample, { recursive: true });
    const xmir = path.join(sample, "test.xmir");
    fs.writeFileSync(
      xmir,
      fs
        .readFileSync(path.join(__dirname, "..", "resources", "test3.xmir"))
        .toString(),
    );
    runSync(["docs", "--verbose", "-s", path.resolve(home, "src"), "-t", home]);
    assert(
      fs.existsSync(docs),
      "Expected the docs directory to be created but it is missing",
    );
    const test_html = path.join(docs, "test.html");
    assert(
      fs.existsSync(test_html),
      `Expected file ${test_html} but it was not created`,
    );
    const test_content = fs.readFileSync(test_html);
    assert(
      !test_content.includes("Not docs"),
      `Unnecessary comment found in ${test_html}`,
    );
    done();
  });

  /**
   * Tests that the 'docs' command generates XML summary file with correct structure.
   * @param {Mocha.Done} done - Mocha callback signaling asynchronous completion
   */
  it("generates XML summary with correct structure and content", (done) => {
    const sample1 = path.join(parsed, "com", "example");
    const sample2 = path.join(parsed, "org", "test");
    fs.mkdirSync(sample1, { recursive: true });
    fs.mkdirSync(sample2, { recursive: true });

    // Create XMIR files in different packages
    const xmir1 = path.join(sample1, "app.xmir");
    fs.writeFileSync(
      xmir1,
      fs
        .readFileSync(path.join(__dirname, "..", "resources", "test1.xmir"))
        .toString(),
    );
    const xmir2 = path.join(sample2, "util.xmir");
    fs.writeFileSync(
      xmir2,
      fs
        .readFileSync(path.join(__dirname, "..", "resources", "test2.xmir"))
        .toString(),
    );

    runSync(["docs", "--verbose", "-s", path.resolve(home, "src"), "-t", home]);

    // Check that summary.xml is created
    const summaryXml = path.join(docs, "summary.xml");
    assert(
      fs.existsSync(summaryXml),
      `Expected XML summary file ${summaryXml} but it was not created`,
    );

    // Read and validate XML content
    const xmlContent = fs.readFileSync(summaryXml, "utf8");

    // Basic XML structure validation
    assert(
      xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'),
      "XML should have proper declaration",
    );
    assert(
      xmlContent.includes("<eodoc>"),
      "XML should have eodoc root element",
    );
    assert(
      xmlContent.includes("</eodoc>"),
      "XML should have closing eodoc element",
    );

    // Package structure validation
    assert(
      xmlContent.includes('<package name="com.example">'),
      "XML should contain com.example package",
    );
    assert(
      xmlContent.includes('<package name="org.test">'),
      "XML should contain org.test package",
    );

    // Object structure validation
    assert(
      xmlContent.includes("<object>"),
      "XML should contain object elements",
    );
    assert(
      xmlContent.includes("<metadata>"),
      "XML should contain metadata sections",
    );
    assert(
      xmlContent.includes("<objects>"),
      "XML should contain objects sections",
    );
    assert(
      xmlContent.includes("<sheets>"),
      "XML should contain sheets sections",
    );

    // Metadata validation
    assert(
      xmlContent.includes("<author>eo-parser</author>"),
      "XML should contain author metadata",
    );
    assert(
      xmlContent.includes("<version>0.58.6</version>"),
      "XML should contain version metadata",
    );

    // Objects validation
    assert(
      xmlContent.includes('<o name="app"'),
      "XML should contain app object",
    );
    assert(
      xmlContent.includes('<o name="app2"'),
      "XML should contain app2 object",
    );

    // Sheets validation
    assert(
      xmlContent.includes("<sheet>validate-before-stars</sheet>"),
      "XML should contain processing sheets",
    );
    assert(
      xmlContent.includes("<sheet>resolve-before-stars</sheet>"),
      "XML should contain processing sheets",
    );

    // Verify proper XML escaping (no dangerous characters)
    assert(
      !xmlContent.includes("<script>"),
      "XML should not contain unescaped script tags",
    );
    assert(
      !xmlContent.includes("&lt;script&gt;") ||
        xmlContent.includes("&amp;lt;script&amp;gt;"),
      "XML should properly escape dangerous content",
    );

    done();
  });
});
