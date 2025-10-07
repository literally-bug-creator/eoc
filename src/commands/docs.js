/*
 * SPDX-FileCopyrightText: Copyright (c) 2022-2025 Objectionary.com
 * SPDX-License-Identifier: MIT
 */

const fs = require("fs");
const path = require("path");
const SaxonJS = require("saxon-js");
const { XMLBuilder } = require("fast-xml-parser");

const XML_CONFIG = {
  ignoreAttributes: false,
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
};

const XMIR_ATTRIBUTES = ["author", "version", "time", "dob", "revision", "ms"];
const OBJECT_ATTRIBUTES = ["name", "base", "line", "pos"];

/**
 * Recursively reads all .xmir files from a directory.
 * @param {string} dir - Directory path
 * @return {string[]} Array of file paths
 */
function readXmirsRecursively(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readXmirsRecursively(full));
    } else if (entry.name.endsWith(".xmir")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Applies XSLT to XMIR
 * @param {String} xmir - Text of XMIR file
 * @param {String} xsl - Text of XSL file
 * @return {String} HTML document
 */
function transformDocument(xmir, xsl) {
  const html = SaxonJS.XPath.evaluate(
    `transform(
        map {
            'source-node' : parse-xml($xml),
            'stylesheet-text' : $xslt,
            'delivery-format' : 'serialized'
        }
    )?output`,
    null,
    {
      params: {
        xml: xmir,
        xslt: xsl,
      },
    },
  );
  return html;
}

/**
 * Creates documentation block from given XMIR
 * @param {String} xmir_path - path of XMIR
 * @return {String} HTML block
 */
function createXmirHtmlBlock(xmir_path) {
  try {
    const xmir = fs.readFileSync(xmir_path).toString();
    const xsl = fs
      .readFileSync(
        path.join(__dirname, "..", "resources", "xmir-transformer.xsl"),
      )
      .toString();
    return transformDocument(xmir, xsl);
  } catch (error) {
    throw new Error(
      `Error while applying XSL to XMIR: ${error.message}`,
      error,
    );
  }
}

/**
 * Generates Package HTML
 * @param {String} name - Package name
 * @param {String[]} xmir_htmls - Array of xmirs htmls
 * @param {String} css_path - CSS file path
 * @return {String} HTML of the package
 */
function generatePackageHtml(name, xmir_htmls, css_path) {
  const title = `<h1 class="package-title">Package ${name} documentation</h1>`;
  return `<!DOCTYPE html>
    <html>
      <head>
        <link href="${css_path}" rel="stylesheet" type="text/css">
        ${title}
      </head>
      <body>
        ${xmir_htmls.join("\n")}
      </body>
    </html>`;
}

/**
 * Wraps given html body
 * @param {String} html - HTML body
 * @param {String} css_path - CSS file path
 * @return {String} Ready HTML
 */
function wrapHtml(html, css_path) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="${css_path}" rel="stylesheet" type="text/css">
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

/**
 * Extracts metadata from XMIR content.
 * @param {String} xmirContent - Content of XMIR file
 * @return {Object} Metadata object with author, version, time, etc.
 */
function extractMetadataFromXmir(xmirContent) {
  const metadata = {};
  try {
    const objectMatch = xmirContent.match(/<object[^>]*>/);
    if (objectMatch) {
      const objectTag = objectMatch[0];
      for (const attr of XMIR_ATTRIBUTES) {
        const regex = new RegExp(`${attr}="(?<value>[^"]*)"`, "i");
        const match = objectTag.match(regex);
        if (match) {
          metadata[attr] = match.groups.value;
        }
      }
    }
  } catch (error) {
    console.warn("Error extracting metadata from XMIR:", error);
  }
  return metadata;
}

/**
 * Extracts object structure from XMIR content.
 * @param {String} xmirContent - Content of XMIR file
 * @return {Array} Array of object information
 */
function extractObjectsFromXmir(xmirContent) {
  const objects = [];
  try {
    const objectMatches = xmirContent.match(/<o [^>]*>/g);
    if (objectMatches) {
      for (const match of objectMatches) {
        const obj = {};
        const nameMatch = match.match(/name="(?<name>[^"]*)"/);
        const baseMatch = match.match(/base="(?<base>[^"]*)"/);
        const lineMatch = match.match(/line="(?<line>\d+)"/);
        const posMatch = match.match(/pos="(?<pos>\d+)"/);

        if (nameMatch) {
          obj.name = nameMatch.groups.name;
        }
        if (baseMatch) {
          obj.base = baseMatch.groups.base;
        }
        if (lineMatch) {
          obj.line = parseInt(lineMatch.groups.line, 10);
        }
        if (posMatch) {
          obj.pos = parseInt(posMatch.groups.pos, 10);
        }

        if (Object.keys(obj).length > 0) {
          objects.push(obj);
        }
      }
    }
  } catch (error) {
    console.warn("Error extracting objects from XMIR:", error);
  }
  return objects;
}

/**
 * Extracts processing sheets from XMIR content.
 * @param {String} xmirContent - Content of XMIR file
 * @return {Array} Array of sheet names
 */
function extractSheetsFromXmir(xmirContent) {
  const sheets = [];
  try {
    const sheetMatches = xmirContent.match(
      /<sheet>(?<content>[^<]*)<\/sheet>/g,
    );
    if (sheetMatches) {
      for (const match of sheetMatches) {
        const contentMatch = match.match(/<sheet>(?<content>[^<]*)<\/sheet>/);
        if (contentMatch && contentMatch.groups.content.trim()) {
          sheets.push(contentMatch.groups.content.trim());
        }
      }
    }
  } catch (error) {
    console.warn("Error extracting sheets from XMIR:", error);
  }
  return sheets;
}

/**
 * Extracts all XMIR components into a structured object.
 * @param {String} xmirContent - Content of XMIR file
 * @param {String} filePath - Path to the XMIR file
 * @return {Object} Complete XMIR information
 */
function parseXmirFile(xmirContent, filePath) {
  return {
    filePath,
    metadata: extractMetadataFromXmir(xmirContent),
    objects: extractObjectsFromXmir(xmirContent),
    sheets: extractSheetsFromXmir(xmirContent),
  };
}

function validatePackagesData(packagesData) {
  if (!packagesData || typeof packagesData !== "object") {
    throw new Error("Invalid packages data provided");
  }

  for (const [packageName, data] of Object.entries(packagesData)) {
    if (!data.xmirs || !Array.isArray(data.xmirs)) {
      throw new Error(`Invalid XMIR data for package: ${packageName}`);
    }
  }
}

function buildObjectElement(obj) {
  const oData = {};
  if (obj.name) {
    oData["@_name"] = obj.name;
  }
  if (obj.base) {
    oData["@_base"] = obj.base;
  }
  if (obj.line) {
    oData["@_line"] = obj.line;
  }
  if (obj.pos) {
    oData["@_pos"] = obj.pos;
  }
  return oData;
}

function buildObjectData(xmirData) {
  const objectData = {};

  if (xmirData.metadata && Object.keys(xmirData.metadata).length > 0) {
    objectData.metadata = xmirData.metadata;
  }

  if (xmirData.objects && xmirData.objects.length > 0) {
    objectData.objects = {
      o: xmirData.objects.map(buildObjectElement),
    };
  }

  if (xmirData.sheets && xmirData.sheets.length > 0) {
    objectData.sheets = {
      sheet: xmirData.sheets,
    };
  }

  return objectData;
}

function buildPackageData(packageName, xmirs) {
  return {
    "@_name": packageName,
    object: xmirs.map(buildObjectData),
  };
}

function buildEodocData(packagesData) {
  const packages = [];

  for (const [packageName, data] of Object.entries(packagesData)) {
    if (data.xmirs && data.xmirs.length > 0) {
      packages.push(buildPackageData(packageName, data.xmirs));
    }
  }

  return { eodoc: { package: packages } };
}

function generateEodocXml(packagesData) {
  validatePackagesData(packagesData);

  const eodocData = buildEodocData(packagesData);
  const builder = new XMLBuilder(XML_CONFIG);
  const xmlContent = builder.build(eodocData);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
}

/**
 * Command to generate documentation.
 * @param {Hash} opts - All options
 */
module.exports = async function (opts) {
  try {
    const input = path.resolve(opts.target, "1-parse");
    const output = path.resolve(opts.target, "docs");
    fs.mkdirSync(output, { recursive: true });
    const css = path.join(output, "styles.css");
    fs.writeFileSync(css, "");
    const packages_info = {};
    const all_xmir_htmls = [];
    const packages_xml_data = {};
    const xmirs = readXmirsRecursively(input);
    for (const xmir of xmirs) {
      const relative = path.relative(input, xmir);
      const name = path.parse(xmir).name;
      const xmir_html = createXmirHtmlBlock(xmir);
      const html_app = path.join(
        output,
        path.dirname(relative),
        `${name}.html`,
      );
      fs.mkdirSync(path.dirname(html_app), { recursive: true });
      fs.writeFileSync(html_app, wrapHtml(xmir_html, css));
      const packages = path.dirname(relative).split(path.sep).join(".");
      const html_package = path.join(output, `package_${packages}.html`);

      if (!(packages in packages_info)) {
        packages_info[packages] = {
          xmir_htmls: [],
          path: html_package,
        };
      }
      packages_info[packages].xmir_htmls.push(xmir_html);
      all_xmir_htmls.push(xmir_html);

      const xmirContent = fs.readFileSync(xmir).toString();
      const xmirData = parseXmirFile(xmirContent, xmir);

      if (!(packages in packages_xml_data)) {
        packages_xml_data[packages] = {
          xmirs: [],
        };
      }
      packages_xml_data[packages].xmirs.push(xmirData);
    }
    for (const package_name of Object.keys(packages_info)) {
      fs.mkdirSync(path.dirname(packages_info[package_name].path), {
        recursive: true,
      });
      fs.writeFileSync(
        packages_info[package_name].path,
        generatePackageHtml(
          package_name,
          packages_info[package_name].xmir_htmls,
          css,
        ),
      );
    }
    const packages = path.join(output, "packages.html");
    fs.writeFileSync(packages, generatePackageHtml("", all_xmir_htmls, css));

    const xmlSummary = generateEodocXml(packages_xml_data);
    const xmlPath = path.join(output, "summary.xml");
    fs.writeFileSync(xmlPath, xmlSummary);

    console.info(
      "Documentation generation completed in the %s directory",
      output,
    );
    console.info("XML summary generated at %s", xmlPath);
  } catch (error) {
    console.error("Error generating documentation:", error);
    throw error;
  }
};
