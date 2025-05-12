/**
 * Interfaces para eventos do componente List
 */

/**
 * Interface para evento de progresso de carregamento
 */
export interface LoadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

/**
 * Interface para evento de mudança de seleção
 */
export interface SelectionChangeEvent<T = any> {
  addedItems: T[];
  removedItems: T[];
}

/**
 * Interface para evento de mudança de expansão de grupo
 */
export interface GroupExpansionEvent {
  group: string;
  expanded: boolean;
}
