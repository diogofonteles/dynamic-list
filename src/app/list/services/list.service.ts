import { Injectable, signal } from "@angular/core";
import { Observable, BehaviorSubject, of, timer } from "rxjs";
import { tap } from "rxjs/operators";
import {
  AppListDataSource,
  GroupedItems,
  PaginatedResponse,
  SelectionMode,
  LoadProgressEvent,
  SelectionChangeEvent,
  PageLoadMode,
  AppListItem,
} from "../models";

@Injectable({
  providedIn: "root",
})
export class ListService<T extends AppListItem = AppListItem> {
  // State signals
  isLoading = signal<boolean>(false);
  isPageLoading = signal<boolean>(false);

  // State variables
  private _currentPage = 1;
  private _hasMoreItems = false;
  private _totalItems = 0;
  private _loadedItems = 0;
  private _isPreloading = false;
  private _items: T[] = [];
  private _groupedItems: GroupedItems<T>[] = [];

  constructor() {}

  /**
   * Carrega dados da fonte de dados
   */
  loadData(
    dataSource: AppListDataSource<T> | T[] | null,
    searchValue: string = "",
    pageSize: number,
    isPageLoad: boolean = false,
    grouped: boolean = false,
    groupBy: string = "group",
    collapsedGroups: string[] = []
  ): Observable<{
    items: T[];
    groupedItems: GroupedItems<T>[];
    hasMoreItems: boolean;
    loadProgress: LoadProgressEvent;
  }> {
    if (!dataSource) {
      return of({
        items: [],
        groupedItems: [],
        hasMoreItems: false,
        loadProgress: this.createLoadProgressEvent(0, 0),
      });
    }

    if (!isPageLoad) {
      this.isLoading.set(true);
      this._currentPage = 1;
      // Limpar os itens existentes ao iniciar uma nova carga (não paginada)
      this._items = [];
      this._totalItems = 0;
      this._loadedItems = 0;
    } else {
      this.isPageLoading.set(true);
      this._isPreloading = false;
    }

    // Se for um array, processa diretamente
    if (Array.isArray(dataSource)) {
      if (!isPageLoad) {
        this._items = [...dataSource];
        this._totalItems = dataSource.length;
        this._loadedItems = dataSource.length;
        this._hasMoreItems = false;
      }

      const groupedItems = grouped
        ? this.groupItems(this._items, groupBy, collapsedGroups)
        : [];

      this.isLoading.set(false);
      this.isPageLoading.set(false);

      const loadProgress = this.createLoadProgressEvent(
        this._loadedItems,
        this._totalItems
      );

      return of({
        items: this._items,
        groupedItems,
        hasMoreItems: this._hasMoreItems,
        loadProgress,
      });
    }

    // Se for um objeto com método load
    if (typeof dataSource === "object" && dataSource.load) {
      const resultSubject = new BehaviorSubject<{
        items: T[];
        groupedItems: GroupedItems<T>[];
        hasMoreItems: boolean;
        loadProgress: LoadProgressEvent;
      }>({
        items: [],
        groupedItems: [],
        hasMoreItems: false,
        loadProgress: this.createLoadProgressEvent(0, 0),
      });

      // Carregar dados do dataSource
      const pageToLoad = isPageLoad ? this._currentPage + 1 : 1;

      dataSource.load(pageToLoad, pageSize, searchValue).subscribe({
        next: (response: PaginatedResponse<T>) => {
          let updatedItems: T[] = [];

          if (!isPageLoad) {
            // Nova carga (não é paginação)
            updatedItems = [...response.data];
            this._totalItems = response.totalCount;
            this._loadedItems = response.data.length;
          } else {
            // Paginação - anexar novos itens
            updatedItems = [...this._items, ...response.data];
            this._loadedItems += response.data.length;

            // Incrementar a página apenas após carregar dados com sucesso
            this._currentPage = pageToLoad;
          }

          // Atualizar a lista de itens
          this._items = updatedItems;
          this._hasMoreItems = response.hasMore;

          // Agrupar itens se necessário
          const groupedItems = grouped
            ? this.groupItems(this._items, groupBy, collapsedGroups)
            : [];
          this._groupedItems = groupedItems;

          // Atualizar sinais de estado
          this.isLoading.set(false);
          this.isPageLoading.set(false);

          // Criar evento de progresso
          const loadProgress = this.createLoadProgressEvent(
            this._loadedItems,
            this._totalItems
          );

          // Emitir resultado
          resultSubject.next({
            items: updatedItems,
            groupedItems,
            hasMoreItems: this._hasMoreItems,
            loadProgress,
          });
        },
        error: (error) => {
          console.error("Error loading data:", error);
          this.isLoading.set(false);
          this.isPageLoading.set(false);
          this._isPreloading = false;

          // Reportar o erro, mas não completar o subject
          resultSubject.error(error);
        },
      });

      return resultSubject.asObservable();
    }

    // Retorno padrão se nada corresponder
    return of({
      items: [],
      groupedItems: [],
      hasMoreItems: false,
      loadProgress: this.createLoadProgressEvent(0, 0),
    });
  }

  /**
   * Agrupa itens por uma propriedade específica
   */
  groupItems(
    items: T[],
    groupBy: string,
    collapsedGroups: string[]
  ): GroupedItems<T>[] {
    if (!items || items.length === 0) {
      return [];
    }

    const groups: Record<string, T[]> = {};

    for (const item of items) {
      const groupValue = item[groupBy] || "Ungrouped";
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    }

    const groupedItems = Object.keys(groups).map((groupName) => {
      return {
        name: groupName,
        expanded: !collapsedGroups.includes(groupName),
        items: groups[groupName],
      };
    });

    return groupedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gerencia a seleção de itens com base no modo de seleção
   */
  handleSelection(
    item: T,
    selectionMode: SelectionMode | string,
    selectedItems: T[],
    selectedItemKeys: any[],
    keyExpr: string | Function
  ): {
    newSelectedItems: T[];
    newSelectedItemKeys: any[];
    selectionChangeEvent: SelectionChangeEvent<T>;
  } {
    const key = this.getItemKeyValue(item, keyExpr);
    const index = selectedItemKeys.indexOf(key);

    let newSelectedItems = [...selectedItems];
    let newSelectedItemKeys = [...selectedItemKeys];
    let addedItems: T[] = [];
    let removedItems: T[] = [];

    if (selectionMode === SelectionMode.SINGLE || selectionMode === "single") {
      removedItems = selectedItems.filter(
        (i) => this.getItemKeyValue(i, keyExpr) !== key
      );
      addedItems = [item];
      newSelectedItems = [item];
      newSelectedItemKeys = [key];
    } else if (
      selectionMode === SelectionMode.MULTIPLE ||
      selectionMode === "multiple"
    ) {
      if (index > -1) {
        newSelectedItems.splice(index, 1);
        newSelectedItemKeys.splice(index, 1);
        removedItems = [item];
      } else {
        newSelectedItems.push(item);
        newSelectedItemKeys.push(key);
        addedItems = [item];
      }
    }

    return {
      newSelectedItems,
      newSelectedItemKeys,
      selectionChangeEvent: {
        addedItems,
        removedItems,
      },
    };
  }

  /**
   * Obtém o valor da chave de um item com base na expressão de chave
   */
  getItemKeyValue(item: T, keyExpr: string | Function): any {
    if (typeof keyExpr === "string") {
      return item[keyExpr];
    } else if (typeof keyExpr === "function") {
      return keyExpr(item);
    }
    return item.id || item;
  }

  /**
   * Verifica se um item está selecionado
   */
  isItemSelected(
    item: T,
    selectedItemKeys: any[],
    keyExpr: string | Function
  ): boolean {
    const key = this.getItemKeyValue(item, keyExpr);
    return selectedItemKeys.includes(key);
  }

  /**
   * Verifica se deve pré-carregar mais itens
   */
  shouldPreload(
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
    threshold: number,
    scrollDirection: string
  ): boolean {
    if (
      this.isLoading() ||
      this.isPageLoading() ||
      this._isPreloading ||
      !this._hasMoreItems
    ) {
      return false;
    }

    const scrolledPercent = ((scrollTop + clientHeight) / scrollHeight) * 100;
    return scrolledPercent >= threshold && scrollDirection === "down";
  }

  /**
   * Marca o início do pré-carregamento
   */
  startPreloading(): void {
    this._isPreloading = true;
  }

  /**
   * Verifica se há mais itens para carregar
   */
  hasMoreItems(): boolean {
    return this._hasMoreItems;
  }

  /**
   * Cria um evento de progresso de carregamento
   */
  private createLoadProgressEvent(
    loaded: number,
    total: number
  ): LoadProgressEvent {
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

    return {
      loaded,
      total,
      percent,
      isComplete: loaded >= total,
    };
  }

  /**
   * Reseta o estado do serviço
   */
  resetState(): void {
    this._currentPage = 1;
    this._hasMoreItems = false;
    this._totalItems = 0;
    this._loadedItems = 0;
    this._isPreloading = false;
    this._items = [];
    this._groupedItems = [];
  }
}
