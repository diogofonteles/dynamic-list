export interface LoadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

export interface SelectionChangeEvent<T = any> {
  addedItems: T[];
  removedItems: T[];
  originalAddedItems?: any[];
  originalRemovedItems?: any[];
}

export interface GroupExpansionEvent {
  group: string;
  expanded: boolean;
}
