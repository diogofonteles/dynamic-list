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
  isLoading = signal<boolean>(false);
  isPageLoading = signal<boolean>(false);

  private _currentPage = 1;
  private _hasMoreItems = false;
  private _totalItems = 0;
  private _loadedItems = 0;
  private _isPreloading = false;
  private _items: T[] = [];
  private _groupedItems: GroupedItems<T>[] = [];

  constructor() {}

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
      this._items = [];
      this._totalItems = 0;
      this._loadedItems = 0;
    } else {
      this.isPageLoading.set(true);
      this._isPreloading = false;
    }

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

      const pageToLoad = isPageLoad ? this._currentPage + 1 : 1;

      dataSource.load(pageToLoad, pageSize, searchValue).subscribe({
        next: (response: PaginatedResponse<T>) => {
          let updatedItems: T[] = [];

          if (!isPageLoad) {
            updatedItems = [...response.data];
            this._totalItems = response.totalCount;
            this._loadedItems = response.data.length;
          } else {
            updatedItems = [...this._items, ...response.data];
            this._loadedItems += response.data.length;

            this._currentPage = pageToLoad;
          }

          this._items = updatedItems;
          this._hasMoreItems = response.hasMore;

          const groupedItems = grouped
            ? this.groupItems(this._items, groupBy, collapsedGroups)
            : [];
          this._groupedItems = groupedItems;

          this.isLoading.set(false);
          this.isPageLoading.set(false);

          const loadProgress = this.createLoadProgressEvent(
            this._loadedItems,
            this._totalItems
          );

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

          resultSubject.error(error);
        },
      });

      return resultSubject.asObservable();
    }

    return of({
      items: [],
      groupedItems: [],
      hasMoreItems: false,
      loadProgress: this.createLoadProgressEvent(0, 0),
    });
  }

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

  getItemKeyValue(item: T, keyExpr: string | Function): any {
    if (typeof keyExpr === "string") {
      return item[keyExpr];
    } else if (typeof keyExpr === "function") {
      return keyExpr(item);
    }
    return item.id || item;
  }

  isItemSelected(
    item: T,
    selectedItemKeys: any[],
    keyExpr: string | Function
  ): boolean {
    const key = this.getItemKeyValue(item, keyExpr);
    return selectedItemKeys.includes(key);
  }

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

  startPreloading(): void {
    this._isPreloading = true;
  }

  hasMoreItems(): boolean {
    return this._hasMoreItems;
  }

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
