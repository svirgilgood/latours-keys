const fs = require("fs");
const N3 = require("n3");

const parser = new N3.Parser({ format: "application/trig" });

const PREFIXES = {
  ant: "https://e2dubba.github.io/latours-keys/ontology/v1#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xml: "http://www.w3.org/XML/1998/namespace",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  schema: "http://schema.org/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  gist: "https://ontologies.semanticarts.com/gist/",
};

const createNameSpaceKeys = () => {
  const FIND_PREFIX = {};
  for (const [key, value] of Object.entries(PREFIXES)) {
    FIND_PREFIX[value] = key;
  }
  return { namespace: FIND_PREFIX, prefix: PREFIXES };
};

function splitNamespaceLocal(node) {
  const uri = node.value;
  const split =
    uri.lastIndexOf("#") > uri.lastIndexOf("/")
      ? uri.lastIndexOf("#")
      : uri.lastIndexOf("/");
  const namespace = uri.slice(0, split + 1);
  const localname = uri.slice(split + 1);

  return { namespace, localname };
}

function createStore(fileData) {
  const trigQuads = parser.parse(fileData.toString());
  return new N3.Store(trigQuads);
}

function createTableElement(store, subject, shortLong) {
  const rowElements = [];
  store.getQuads(subject).forEach((quad) => {
    rowElements.push("<tr>");
    for (let term of [quad.predicate, quad.object]) {
      if (!(term.termType === "NamedNode")) {
        rowElements.push(`  <td>${term.value}</td>`);
        continue;
      }
      const { namespace, localname } = splitNamespaceLocal(term);
      const prefix = shortLong.namespace[namespace];
      const href =
        prefix === "ant" ? `href="#${localname}"` : `href="${term.value}"`;
      rowElements.push(`  <td> <a ${href}>${prefix}:${localname}</a> </td>`);
    }
    rowElements.push("</tr>");
  });

  const { namespace, localname } = splitNamespaceLocal(subject);
  const prefix = shortLong.namespace[namespace];
  return `
<table>
  <tr>
    <th colspan="2" id=${localname}>${prefix}:${localname}</th>
  <tr>
    ${rowElements.join("\n  ")}
</table>`;
}

function buildHtml(store, shortLong) {
  const title = "Actor Network Ontology";
  let tables = [];
  store.getSubjects().forEach((subject) => {
    let table = createTableElement(store, subject, shortLong);
    tables.push(table);
  });
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>${title}</title>
  </head>
  <body>
      ${tables.join("\n")}
  </body>
  </html>
  `;
}

const cliArgs = process.argv;

const store = createStore(fs.readFileSync(cliArgs[2], "utf8"));

const shortLong = createNameSpaceKeys();
const htmlData = buildHtml(store, shortLong);

fs.writeFile("../docs/ontology/v1", htmlData, function (err) {
  if (err) return console.log(err);
  console.log("Written to File");
});
