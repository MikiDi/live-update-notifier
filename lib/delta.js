function uniquifyDeltaSubjects (deltaBody) {
  const insertionDeltas = deltaBody.map(d => d.inserts).reduce((ds, d) => Array.prototype.concat.apply(ds, d));
  const deletionDeltas = deltaBody.map(d => d.deletes).reduce((ds, d) => Array.prototype.concat.apply(ds, d));
  const deltas = [...insertionDeltas, ...deletionDeltas];
  const subjects = deltas.map(d => d.subject.value);
  const uniqueSubjects = [...new Set(subjects)];
  return uniqueSubjects;
}

export {
  uniquifyDeltaSubjects
};
