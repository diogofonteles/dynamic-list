import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  ContentChildren,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  QueryList,
  signal,
  ViewChild,
} from "@angular/core";
import {CommonModule} from "@angular/common";
import {debounceTime, Subject, Subscription, throttleTime, timer,} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {ListItemComponent} from "./components/list-item/list-item.component";
import {
  AppListDataSource,
  AppListItem,
  DEFAULT_HEIGHT,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PRELOAD_THRESHOLD,
  DEFAULT_SEARCH_TIMEOUT,
  DEFAULT_WIDTH,
  GroupedItems,
  GroupExpansionEvent,
  ItemClickEvent,
  ListItemAdapter,
  LoadProgressEvent,
  PageLoadMode,
  PRELOAD_CHECK_DELAY,
  SCROLL_DEBOUNCE_TIME,
  SCROLL_END_THRESHOLD,
  ScrollDirection,
  ScrollEvent,
  SelectionChangeEvent,
  SelectionMode,
} from "./models";
import { ListService } from "./services/list.service";
import { createAdapter } from "./adapters/generic-item.adapter";

@Component({
  selector: "list",
  standalone: true,
  imports: [CommonModule, ListItemComponent],
  templateUrl: "list.component.html",
  styleUrls: ["list.component.scss"],
})
export class ListComponent<T extends AppListItem = AppListItem>
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild("scrollContainer") scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild("container") container!: ElementRef<HTMLDivElement>;

  dataSource = input<AppListDataSource<T> | T[] | null>(null);
  width = input<string | number | undefined>(undefined);
  height = input<string | number | undefined>(undefined);
  disabled = input<boolean>(false);
  visible = input<boolean>(true);
  scrollingEnabled = input<boolean>(true);
  useNativeScrolling = input<boolean>(true);
  pageLoadMode = input<PageLoadMode | string>(PageLoadMode.SCROLL_BOTTOM);
  preloadThreshold = input<number>(DEFAULT_PRELOAD_THRESHOLD);
  searchEnabled = input<boolean>(false);
  searchPlaceholder = input<string | undefined>(undefined);
  searchTimeoutDelay = input<number>(DEFAULT_SEARCH_TIMEOUT);
  selectionMode = input<SelectionMode | string>(SelectionMode.NONE);
  noDataText = input<string | undefined>(undefined);
  pageLoadingText = input<string | undefined>(undefined);
  itemTemplate = input<any>(undefined);
  keyExpr = input<string | Function>("id");
  grouped = input<boolean>(true);
  groupBy = input<string>("group");
  pageSize = input<number>(DEFAULT_PAGE_SIZE);

  adapter = input<ListItemAdapter<any, T> | null>(null);

  cssClasses = input<{
    container?: string;
    content?: string;
    searchContainer?: string;
    searchInput?: string;
    groupHeader?: string;
    groupTitle?: string;
    groupToggle?: string;
    groupItems?: string;
    listItems?: string;
    noData?: string;
    loading?: string;
    pageLoading?: string;
  }>({});

  styles = input<{
    container?: Record<string, string>;
    content?: Record<string, string>;
    searchContainer?: Record<string, string>;
    searchInput?: Record<string, string>;
    groupHeader?: Record<string, string>;
    groupItems?: Record<string, string>;
    listItems?: Record<string, string>;
  }>({});

  theme = input<"light" | "dark" | string>("light");

  selectedItems = model<T[]>([]);
  selectedItemKeys = model<any[]>([]);
  collapsedGroups = model<string[]>([]);

  private _originalItems: any[] = [];

  @Input() set items(value: Array<any>) {
    this._originalItems = value || [];

    if (this.adapter()) {
      this._items = this.adapter()!.adaptArray(this._originalItems) as T[];
    } else {
      this._items = this._originalItems as T[];
    }

    if (this.grouped()) {
      this.groupItems();
    }
  }

  get items(): Array<T> {
    return this._items;
  }

  get originalSelectedItems(): any[] {
    if (!this.adapter()) {
      return this.selectedItems();
    }

    return this.selectedItems().map((item) => this.adapter()!.revert(item));
  }

  _items: Array<T> = [];

  itemClick = output<ItemClickEvent<T>>();
  scrollEvent = output<ScrollEvent>();
  selectionChanged = output<SelectionChangeEvent<T>>();
  contentReady = output<void>();
  pageLoadingEvent = output<void>();
  searchValueChange = output<string>();
  groupExpansionChanged = output<GroupExpansionEvent>();
  loadProgress = output<LoadProgressEvent>();

  @ContentChildren(ListItemComponent)
  itemsChildren!: QueryList<ListItemComponent>;

  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private listService = inject(ListService<T>);

  isLoadingSignal = this.listService.isLoading;
  isPageLoadingSignal = this.listService.isPageLoading;
  searchValueSignal = signal<string>("");

  groupedItems: GroupedItems<T>[] = [];

  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly scrollSubject = new Subject<Event>();
  private scrollDirection: ScrollDirection = ScrollDirection.DOWN;
  private lastScrollTop = 0;
  private loadSubscription?: Subscription;

  heightStyle = computed(() => {
    if (this.height() !== undefined) {
      return typeof this.height() === "number"
        ? `${this.height()}px`
        : this.height();
    }
    return DEFAULT_HEIGHT;
  });

  widthStyle = computed(() => {
    if (this.width() !== undefined) {
      return typeof this.width() === "number"
        ? `${this.width()}px`
        : this.width();
    }
    return DEFAULT_WIDTH;
  });

  containerStyles = computed(() => {
    const baseStyles = {
      height: this.heightStyle(),
      width: this.widthStyle(),
    };

    return { ...baseStyles, ...this.styles().container };
  });

  containerClass = computed(() => {
    return this.cssClasses().container
      ? `list-container ${this.cssClasses().container}`
      : "list-container";
  });

  contentClass = computed(() => {
    return this.cssClasses().content
      ? `list-content ${this.cssClasses().content}`
      : "list-content";
  });

  searchContainerClass = computed(() => {
    return this.cssClasses().searchContainer
      ? `list-search ${this.cssClasses().searchContainer}`
      : "list-search";
  });

  searchInputClass = computed(() => {
    return this.cssClasses().searchInput
      ? `list-search-input ${this.cssClasses().searchInput}`
      : "list-search-input";
  });

  loadingClass = computed(() => {
    return this.cssClasses().loading
      ? `list-loading ${this.cssClasses().loading}`
      : "list-loading";
  });

  noDataClass = computed(() => {
    return this.cssClasses().noData
      ? `list-no-data ${this.cssClasses().noData}`
      : "list-no-data";
  });

  groupedListClass = computed(() => {
    return this.cssClasses().listItems
      ? `list-grouped ${this.cssClasses().listItems}`
      : "list-grouped";
  });

  listItemsClass = computed(() => {
    return this.cssClasses().listItems
      ? `list-items ${this.cssClasses().listItems}`
      : "list-items";
  });

  pageLoadingClass = computed(() => {
    return this.cssClasses().pageLoading
      ? `list-page-loading ${this.cssClasses().pageLoading}`
      : "list-page-loading";
  });

  groupHeaderClass = computed(() => {
    return this.cssClasses().groupHeader
      ? `group-header ${this.cssClasses().groupHeader}`
      : "group-header";
  });

  groupTitleClass = computed(() => {
    return this.cssClasses().groupTitle
      ? `group-title ${this.cssClasses().groupTitle}`
      : "group-title";
  });

  groupToggleClass = computed(() => {
    return this.cssClasses().groupToggle
      ? `group-toggle ${this.cssClasses().groupToggle}`
      : "group-toggle";
  });

  groupItemsClass = computed(() => {
    return this.cssClasses().groupItems
      ? `group-items ${this.cssClasses().groupItems}`
      : "group-items";
  });

  private getEffectiveAdapter = computed(() => {
    if (this.adapter()) {
      return this.adapter();
    }

    if (this._items.length > 0) {
      const sample = this._items[0];
      if (sample.id) {
        return createAdapter("id");
      } else if (sample["key"]) {
        return createAdapter("key");
      } else {
        return null;
      }
    }

    return null;
  });

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(this.searchTimeoutDelay()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.listService.resetState();
        this.loadData();
      });

    this.scrollSubject
      .pipe(
        throttleTime(SCROLL_DEBOUNCE_TIME),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.processScroll(event));
  }

  ngOnInit(): void {
    if (!this._items.length) {
      this.loadData();
    }
  }

  ngAfterViewInit(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.overflowY = "scroll";

      timer(0)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.checkPreloadCondition();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
      this.loadSubscription = undefined;
    }
  }

  private loadData(isPageLoad = false): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.loadSubscription) {
        this.loadSubscription.unsubscribe();
        this.loadSubscription = undefined;
      }

      if (!isPageLoad) {
        this._items = [];
        this._originalItems = [];
      }

      const existingItems = [...this._items];
      const existingOriginals = [...this._originalItems];

      this.loadSubscription = this.listService
        .loadData(
          this.dataSource(),
          this.searchValueSignal(),
          this.pageSize(),
          isPageLoad,
          this.grouped(),
          this.groupBy(),
          this.collapsedGroups()
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => {
            let processedItems = result.items;
            let originalItems = result.items;

            if (this.adapter()) {
              processedItems = this.adapter()!.adaptArray(result.items) as T[];
            }

            if (!isPageLoad) {
              this._originalItems = originalItems;
              this._items = processedItems;
            } else {
              if (existingItems.length > 0) {
                const getKeyForItem = (item: any) => {
                  if (this.adapter()) {
                    return this.adapter()!.getKey(item);
                  } else {
                    return this.listService.getItemKeyValue(
                      item,
                      this.keyExpr()
                    );
                  }
                };

                const existingIds = new Set(
                  existingItems.map((item) =>
                    this.listService.getItemKeyValue(item, this.keyExpr())
                  )
                );

                const newItems = processedItems.filter((item, index) => {
                  const key = this.listService.getItemKeyValue(
                    item,
                    this.keyExpr()
                  );
                  const isNew = !existingIds.has(key);
                  return isNew;
                });

                const newOriginals = originalItems.filter((item, index) => {
                  if (this.adapter()) {
                    const adaptedItem = processedItems[index];
                    const key = this.listService.getItemKeyValue(
                      adaptedItem,
                      this.keyExpr()
                    );
                    return !existingIds.has(key);
                  } else {
                    const key = this.listService.getItemKeyValue(
                      item,
                      this.keyExpr()
                    );
                    return !existingIds.has(key);
                  }
                });

                this._items = [...existingItems, ...newItems];
                this._originalItems = [...existingOriginals, ...newOriginals];
              } else {
                this._items = processedItems;
                this._originalItems = originalItems;
              }
            }

            this.groupedItems = this.grouped()
              ? this.listService.groupItems(
                  this._items,
                  this.groupBy(),
                  this.collapsedGroups()
                )
              : [];

            if (!isPageLoad) {
              this.contentReady.emit();
            }

            this.loadProgress.emit(result.loadProgress);
            this.cdr.detectChanges();

            if (!isPageLoad && result.hasMoreItems) {
              timer(PRELOAD_CHECK_DELAY)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                  this.checkPreloadCondition();
                });
            }

            resolve();
          },
          error: (error) => {
            console.error("Error loading data:", error);
            this.cdr.detectChanges();
            resolve();
          },
        });

      if (isPageLoad) {
        this.pageLoadingEvent.emit();
      }
    });
  }

  private groupItems(): void {
    this.groupedItems = this.listService.groupItems(
      this._items,
      this.groupBy(),
      this.collapsedGroups()
    );
  }

  handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    this.searchValueSignal.set(value);
    this.searchValueChange.emit(value);

    this.searchSubject.next(value);
  }

  handleSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  handleItemClick(
    event: MouseEvent,
    item: T,
    index: number,
    groupName?: string
  ): void {
    if (this.disabled() || item.disabled) return;

    const originalItem = this.adapter() ? this.adapter()!.revert(item) : item;

    const clickEvent: ItemClickEvent<T> = {
      itemData: item,
      itemElement: event.currentTarget as HTMLElement,
      itemIndex: index,
      groupName: groupName,
    };

    if (
      this.selectionMode() !== SelectionMode.NONE &&
      this.selectionMode() !== "none"
    ) {
      this.toggleSelection(item);
    }

    this.itemClick.emit(clickEvent);
  }

  handleScroll(event: Event): void {
    this.scrollSubject.next(event);
  }

  private processScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;

    this.scrollDirection =
      scrollTop > this.lastScrollTop
        ? ScrollDirection.DOWN
        : ScrollDirection.UP;

    this.lastScrollTop = scrollTop;

    const reachEnd =
      scrollTop + clientHeight >= scrollHeight - SCROLL_END_THRESHOLD;

    const scrollEvent: ScrollEvent = {
      scrollTop,
      scrollHeight,
      clientHeight,
      reachEnd,
      percent,
    };

    this.scrollEvent.emit(scrollEvent);

    this.checkPreloadCondition();
  }

  private checkPreloadCondition(): void {
    if (!this.scrollContainer) return;

    const element = this.scrollContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const shouldPreload = this.listService.shouldPreload(
      scrollTop,
      scrollHeight,
      clientHeight,
      this.preloadThreshold(),
      this.scrollDirection
    );

    if (shouldPreload) {
      this.listService.startPreloading();
      this.loadMore();
    }
  }

  toggleGroupExpansion(group: GroupedItems<T>): void {
    group.expanded = !group.expanded;

    this.groupExpansionChanged.emit({
      group: group.name,
      expanded: group.expanded,
    });

    const currentCollapsedGroups = this.collapsedGroups();
    if (group.expanded) {
      this.collapsedGroups.set(
        currentCollapsedGroups.filter((g) => g !== group.name)
      );
    } else if (!currentCollapsedGroups.includes(group.name)) {
      this.collapsedGroups.set([...currentCollapsedGroups, group.name]);
    }

    this.cdr.detectChanges();
  }

  private toggleSelection(item: T): void {
    const result = this.listService.handleSelection(
      item,
      this.selectionMode(),
      this.selectedItems(),
      this.selectedItemKeys(),
      this.keyExpr()
    );

    this.selectedItems.set(result.newSelectedItems);
    this.selectedItemKeys.set(result.newSelectedItemKeys);

    if (this.adapter()) {
      const selectionEvent: SelectionChangeEvent<T> = {
        ...result.selectionChangeEvent,
        originalAddedItems: result.selectionChangeEvent.addedItems.map((item) =>
          this.adapter()!.revert(item)
        ),
        originalRemovedItems: result.selectionChangeEvent.removedItems.map(
          (item) => this.adapter()!.revert(item)
        ),
      };
      this.selectionChanged.emit(selectionEvent);
    } else {
      this.selectionChanged.emit(result.selectionChangeEvent);
    }
  }

  isItemSelected(item: T): boolean {
    return this.listService.isItemSelected(
      item,
      this.selectedItemKeys(),
      this.keyExpr()
    );
  }

  trackByFn(index: number, item: T): any {
    if (!item) return index;

    if (this.adapter()) {
      return this.adapter()!.getKey(item);
    }

    return this.listService.getItemKeyValue(item, this.keyExpr()) || index;
  }

  loadMore(): void {
    if (this.listService.hasMoreItems() && !this.isPageLoadingSignal()) {
      const scrollPosition = this.scrollContainer
        ? this.scrollContainer.nativeElement.scrollTop
        : 0;

      this.loadData(true).then(() => {
        if (this.scrollContainer) {
          timer(10).subscribe(() => {
            this.scrollContainer.nativeElement.scrollTop = scrollPosition;
          });
        }
      });
    }
  }
}
