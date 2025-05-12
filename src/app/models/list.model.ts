import {Observable} from "rxjs";
import {PaginatedResponse} from "../data.service";

export interface GroupedItems {
    name: string;
    expanded: boolean;
    items: any[];
}

export interface AppListDataSource {
    load: (
        page: number,
        pageSize: number,
        search?: string
    ) => Observable<PaginatedResponse<any>>;
    totalCount?: number;
    pageSize?: number;
}

export interface AppListItem {
    id?: string;
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

export interface ItemClickEvent {
    itemData: any;
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