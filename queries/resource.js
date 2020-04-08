import { query, sparqlEscapeString } from 'mu';

async function verifyResourceAccess (resourceIds) {
  const queryString = `
SELECT ?resource
WHERE {
    ?resource mu:uuid ?id .
    VALUES ?id {
        ${resourceIds.map(sparqlEscapeString).join('\n        ')}
    }
}
  `;
  const result = await query(queryString);
  return result.results.bindings.map((b) => b.resource.value);
}

export {
  verifyResourceAccess
};
