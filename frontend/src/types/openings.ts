export interface OpeningTreeNode {
  readonly eco?: string;
  readonly name?: string;
  readonly children?: Readonly<Record<string, OpeningTreeNode>>;
}

export interface Continuation {
  readonly san: string;
  readonly eco?: string;
  readonly name?: string;
  readonly hasChildren: boolean;
}

export interface ExplorerMove {
  readonly san: string;
  readonly from: import("./chess").Square;
  readonly to: import("./chess").Square;
  readonly eco?: string;
  readonly name?: string;
}
