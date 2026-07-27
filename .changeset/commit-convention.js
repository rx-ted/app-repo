export const getAddMessage = async (changeset, _options) => {
  return `chore(changeset): ${changeset.summary}`;
};

export const getVersionMessage = async (releasePlan, _options) => {
  if (releasePlan.releases.length === 0) return 'chore(release): no packages updated';
  const summary = releasePlan.releases
    .map((r) => `${r.name}@${r.newVersion}`)
    .join(', ');
  return `chore(release): ${summary}`;
};
