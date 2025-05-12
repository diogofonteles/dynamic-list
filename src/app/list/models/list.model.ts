import {Observable} from "rxjs";

export interface GroupedItems<T = any> {
  name: string;
  expanded: boolean;
  items: T[];
}

export interface AppListDataSource<T = any> {
  load: (
    page: number,
    pageSize: number,
    search?: string
  ) => Observable<PaginatedResponse<T>>;
  totalCount?: number;
  pageSize?: number;
}

export interface AppListItem {
  id?: string | number;
  text?: string;
  name?: string;
  visible?: boolean;
  disabled?: boolean;
  badge?: string;
  icon?: string;
  showChevron?: boolean;
  template?: any;
  group?: string;
  [key: string]: any;
}

export interface ItemClickEvent<T = any> {
  itemData: T;
  itemElement: HTMLElement;
  itemIndex: number;
  groupName?: string;
}

export interface ScrollEvent {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    reachEnd: boolean;
    percent: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
    badge?: string;
    showChevron?: boolean;
    subText?: string;
    icon?: string;
    group?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    totalCount: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
}
export interface ListItemAdapter<T, R extends AppListItem = AppListItem> {
  adapt(sourceItem: T): R;
  adaptArray(sourceItems: T[]): R[];
  revert(listItem: R): T;
  getKey(item: T | R): string | number;
}