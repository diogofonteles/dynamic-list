import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChildren,
  QueryList,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AppListItemComponent } from '../app-list-item.component';
import {AppListDataSource, GroupedItems, ItemClickEvent, ScrollEvent} from '../models/list.model';

@Component({
  selector: 'list',
  standalone: true,
  imports: [CommonModule, AppListItemComponent],
  templateUrl: 'list.component.html',
  styleUrls: ['list.component.scss'],
})
export class ListComponent
  implements OnInit, OnDestroy, AfterViewInit, OnChanges
{
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  @Input()
  get dataSource(): AppListDataSource | any[] | null {
    return this._dataSource;
  }
  set dataSource(value: AppListDataSource | any[] | null) {
    this._dataSource = value;
    this.currentPage = 1;
    this._items = [];
    this.loadData();
  }
  private _dataSource: AppListDataSource | any[] | null = null;

  @Input()
  get items(): any[] {
    return this._items;
  }
  set items(value: any[]) {
    this._items = value;
    if (this.grouped) {
      this.groupItems();
    }
  }
  _items: any[] = [];

  public height = input<string | number | undefined>();
  @Input() width: string | number | undefined;
  @Input() disabled: boolean = false;
  @Input() visible: boolean = true;

  @Input() scrollingEnabled: boolean = true;
  @Input() useNativeScrolling: boolean = true;
  @Input() pageLoadMode: 'nextButton' | 'scrollBottom' | 'none' =
    'scrollBottom';
  @Input() preloadThreshold: number = 80;

  @Input() searchEnabled: boolean = false;
  @Input() searchPlaceholder: string | undefined;
  @Input() searchTimeoutDelay: number = 500;

  @Input() selectionMode: 'single' | 'multiple' | 'none' = 'none';
  @Input() selectedItems: any[] = [];
  @Input() selectedItemKeys: any[] = [];

  @Input() noDataText: string | undefined;
  @Input() pageLoadingText: string | undefined;
  @Input() itemTemplate: any;
  @Input() keyExpr: string | Function = 'id';

  @Input() grouped: boolean = true;
  @Input() groupBy: string = 'group';
  @Input() collapsedGroups: string[] = [];

  @Input() pageSize: number = 15;

  @Output() itemClick = new EventEmitter<ItemClickEvent>();
  @Output() scrollEvent = new EventEmitter<ScrollEvent>();
  @Output() selectionChanged = new EventEmitter<{
    addedItems: any[];
    removedItems: any[];
  }>();
  @Output() contentReady = new EventEmitter<void>();
  @Output() pageLoadingEvent = new EventEmitter<void>();
  @Output() searchValueChange = new EventEmitter<string>();
  @Output() groupExpansionChanged = new EventEmitter<{
    group: string;
    expanded: boolean;
  }>();
  @Output() loadProgress = new EventEmitter<{
    loaded: number;
    total: number;
    percent: number;
    isComplete: boolean;
  }>();

  @ContentChildren(AppListItemComponent)
  itemsChildren!: QueryList<AppListItemComponent>;

  isLoadingSignal = signal<boolean>(false);
  isPageLoadingSignal = signal<boolean>(false);
  currentPage: number = 1;
  hasMoreItems: boolean = false;
  totalItems: number = 0;
  loadedItems: number = 0;
  searchValueSignal = signal<string>('');
  groupedItems: GroupedItems[] = [];
  isPreloading: boolean = false;

  heightStyle = computed(() => {
    if (this.height() !== undefined) {
      return typeof this.height() === 'number'
        ? `${this.height()}px`
        : this.height();
    }
    return '350px';
  });

  widthStyle = computed(() => {
    if (this.width !== undefined) {
      return typeof this.width === 'number' ? `${this.width}px` : this.width;
    }
    return '100%';
  });

  private loadSubscription?: Subscription;
  private searchSubscription?: Subscription;
  private searchTimeout?: any;
  private lastScrollTop: number = 0;
  private scrollDebounceTimeout?: any;
  private scrollDirection: 'up' | 'down' = 'down';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this._items.length) {
      this.loadData();
    }
  }

  ngAfterViewInit() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.overflowY = 'scroll';
    }

    setTimeout(() => {
      this.checkPreloadCondition();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['preloadThreshold'] || changes['pageSize']) {
      this.checkPreloadCondition();
    }
  }

  ngOnDestroy() {
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }
  }

  private loadData(isPageLoad = false) {
    if (!this.dataSource) return;

    if (!isPageLoad) {
      this.isLoadingSignal.set(true);
      if (Array.isArray(this.dataSource)) {
        this._items = [...this.dataSource];
        this.totalItems = this.dataSource.length;
        this.loadedItems = this.dataSource.length;
        this.hasMoreItems = false;
        this.isLoadingSignal.set(false);
        if (this.grouped) {
          this.groupItems();
        }
        this.contentReady.emit();
        this.emitLoadProgress();
      }
    } else {
      this.isPageLoadingSignal.set(true);
      this.isPreloading = false;
      this.pageLoadingEvent.emit();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    if (Array.isArray(this.dataSource)) {
      if (!isPageLoad) {
        this._items = [...this.dataSource];
        this.totalItems = this.dataSource.length;
        this.loadedItems = this.dataSource.length;
        this.hasMoreItems = false;
      } else {
        this.isPageLoadingSignal.set(false);
      }

      if (this.grouped) {
        this.groupItems();
      }

      this.isLoadingSignal.set(false);
      this.contentReady.emit();
      this.emitLoadProgress();
    } else if (typeof this.dataSource === 'object' && this.dataSource.load) {
      const currentPageSize = this.pageSize;

      this.loadSubscription = this.dataSource
        .load(this.currentPage, currentPageSize, this.searchValueSignal())
        .subscribe({
          next: (response) => {
            if (!isPageLoad) {
              this._items = response.data;
              this.totalItems = response.totalCount;
              this.loadedItems = response.data.length;
            } else {
              this._items = [...this._items, ...response.data];
              this.loadedItems += response.data.length;
            }

            this.hasMoreItems = response.hasMore;

            if (this.grouped) {
              this.groupItems();
            }

            this.isLoadingSignal.set(false);
            this.isPageLoadingSignal.set(false);
            this.contentReady.emit();
            this.emitLoadProgress();
            this.cdr.detectChanges();

            if (!isPageLoad && this.hasMoreItems) {
              setTimeout(() => {
                this.checkPreloadCondition();
              }, 100);
            }
          },
          error: (error) => {
            console.error('Error loading data:', error);
            this.isLoadingSignal.set(false);
            this.isPageLoadingSignal.set(false);
            this.isPreloading = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  private emitLoadProgress() {
    this.loadProgress.emit({
      loaded: this.loadedItems,
      total: this.totalItems,
      percent:
        this.totalItems > 0
          ? Math.round((this.loadedItems / this.totalItems) * 100)
          : 0,
      isComplete: this.loadedItems >= this.totalItems,
    });
  }

  private groupItems() {
    if (!this._items || this._items.length === 0) {
      this.groupedItems = [];
      return;
    }

    const groups: { [key: string]: any[] } = {};

    for (const item of this._items) {
      const groupValue = item[this.groupBy] || 'Ungrouped';
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    }

    this.groupedItems = Object.keys(groups).map((groupName) => {
      return {
        name: groupName,
        expanded: !this.collapsedGroups.includes(groupName),
        items: groups[groupName],
      };
    });

    this.groupedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  handleSearchInput(event: any) {
    const value = event.target.value;
    this.searchValueSignal.set(value);
    this.searchValueChange.emit(value);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.handleSearchChange(event);
    }, this.searchTimeoutDelay);
  }

  handleSearchChange(event: any) {
    this.currentPage = 1;
    this._items = [];
    this.loadData();
  }

  handleItemClick(
    event: MouseEvent,
    item: any,
    index: number,
    groupName?: string
  ) {
    if (this.disabled || item.disabled) return;

    const clickEvent: ItemClickEvent = {
      itemData: item,
      itemElement: event.currentTarget as HTMLElement,
      itemIndex: index,
      groupName: groupName,
    };

    if (this.selectionMode !== 'none') {
      this.toggleSelection(item);
    }

    this.itemClick.emit(clickEvent);
  }

  handleScroll(event: any) {
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }

    this.scrollDebounceTimeout = setTimeout(() => {
      const element = event.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;

      this.scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';
      this.lastScrollTop = scrollTop;

      const reachEnd = scrollTop + clientHeight >= scrollHeight - 20;

      const scrollEvent: ScrollEvent = {
        scrollTop,
        scrollHeight,
        clientHeight,
        reachEnd,
        percent,
      };

      this.scrollEvent.emit(scrollEvent);

      this.checkPreloadCondition();
    }, 50);
  }

  private checkPreloadCondition() {
    if (
      !this.scrollContainer ||
      this.isLoadingSignal() ||
      this.isPageLoadingSignal() ||
      this.isPreloading ||
      !this.hasMoreItems
    ) {
      return;
    }

    const element = this.scrollContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const scrolledPercent = ((scrollTop + clientHeight) / scrollHeight) * 100;

    if (
      scrolledPercent >= this.preloadThreshold &&
      this.scrollDirection === 'down'
    ) {
      this.isPreloading = true;
      this.loadMore();
    }
  }

  toggleGroupExpansion(group: GroupedItems) {
    group.expanded = !group.expanded;

    this.groupExpansionChanged.emit({
      group: group.name,
      expanded: group.expanded,
    });

    if (group.expanded) {
      this.collapsedGroups = this.collapsedGroups.filter(
        (g) => g !== group.name
      );
    } else if (!this.collapsedGroups.includes(group.name)) {
      this.collapsedGroups.push(group.name);
    }

    this.cdr.detectChanges();
  }

  private toggleSelection(item: any) {
    const key = this.getItemKeyValue(item);
    const index = this.selectedItemKeys.indexOf(key);

    if (this.selectionMode === 'single') {
      const previousSelected = [...this.selectedItems];
      this.selectedItems = [item];
      this.selectedItemKeys = [key];
      this.selectionChanged.emit({
        addedItems: [item],
        removedItems: previousSelected.filter(
          (i) => this.getItemKeyValue(i) !== key
        ),
      });
    } else if (this.selectionMode === 'multiple') {
      if (index > -1) {
        this.selectedItems.splice(index, 1);
        this.selectedItemKeys.splice(index, 1);
        this.selectionChanged.emit({
          addedItems: [],
          removedItems: [item],
        });
      } else {
        this.selectedItems.push(item);
        this.selectedItemKeys.push(key);
        this.selectionChanged.emit({
          addedItems: [item],
          removedItems: [],
        });
      }
    }
  }

  private getItemKeyValue(item: any): any {
    if (typeof this.keyExpr === 'string') {
      return item[this.keyExpr];
    } else if (typeof this.keyExpr === 'function') {
      return this.keyExpr(item);
    }
    return item.id || item;
  }

  isItemSelected(item: any): boolean {
    const key = this.getItemKeyValue(item);
    return this.selectedItemKeys.includes(key);
  }

  trackByFn(index: number, item: any): any {
    if (!item) return index;
    if (typeof this.keyExpr === 'string') {
      return item[this.keyExpr] || index;
    } else if (typeof this.keyExpr === 'function') {
      return this.keyExpr(item) || index;
    }
    return item.id || index;
  }

  loadMore() {
    if (this.hasMoreItems && !this.isPageLoadingSignal()) {
      this.currentPage++;
      this.loadData(true);
    }
  }
}
