export interface IDocRenderer {
  readonly name: string;

  renderHtml(config: { specUrl: string; uiTitle: string }): string;
}
