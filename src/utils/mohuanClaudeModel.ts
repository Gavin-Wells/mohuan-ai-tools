export interface ClaudeModels {
  model: string;
  opus: string;
  sonnet: string;
  haiku: string;
}

export function selectMohuanClaudeModels(ids: string[]): ClaudeModels {
  const candidates = ids
    .flatMap((id) => {
      const match =
        /^claude-(opus|sonnet|haiku)-(\d+)(?:[.-](\d+))?(?:-(\d{8}))?$/.exec(
          id,
        );
      return match
        ? [
            {
              id,
              family: match[1],
              major: +match[2],
              minor: +(match[3] ?? 0),
              date: +(match[4] ?? 0),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.major - a.major ||
        b.minor - a.minor ||
        b.date - a.date ||
        a.id.localeCompare(b.id),
    );
  const latest = (family: string) =>
    candidates.find((item) => item.family === family)?.id;
  const model = latest("opus") ?? latest("sonnet") ?? latest("haiku");
  if (!model) throw new Error("当前 Key 没有可用的 Claude 模型");
  return {
    model,
    opus: latest("opus") ?? model,
    sonnet: latest("sonnet") ?? model,
    haiku: latest("haiku") ?? model,
  };
}
