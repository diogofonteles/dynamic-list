import {
  Component,
  Input,
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
  model,
  output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subscription } from "rxjs";
import { ListItemComponent } from "./components/list-item/list-item.component";
import {
  AppListDataSource,
  GroupedItems,
  ItemClickEvent,
  ScrollEvent,
} from "./models/list.model";

@Component({
  selector: "list",
  standalone: true,
  imports: [CommonModule, ListItemComponent],
  templateUrl: "list.component.html",
  styleUrls: ["list.component.scss"],
})
export class ListComponent
  implements OnInit, OnDestroy, AfterViewInit, OnChanges
{
  @ViewChild("scrollContainer") scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild("container") container!: ElementRef<HTMLDivElement>;

  dataSource = input<AppListDataSource | any[] | null>(null);
  width = input<string | number | undefined>(undefined);
  height = input<string | number | undefined>(undefined);
  disabled = input<boolean>(false);
  visible = input<boolean>(true);
  scrollingEnabled = input<boolean>(true);
  useNativeScrolling = input<boolean>(true);
  pageLoadMode = input<"nextButton" | "scrollBottom" | "none">("scrollBottom");
  preloadThreshold = input<number>(80);
  searchEnabled = input<boolean>(false);
  searchPlaceholder = input<string | undefined>(undefined);
  searchTimeoutDelay = input<number>(500);
  selectionMode = input<"single" | "multiple" | "none">("none");
  selectedItems = model<any[]>([]);
  selectedItemKeys = model<any[]>([]);
  noDataText = input<string | undefined>(undefined);
  pageLoadingText = input<string | undefined>(undefined);
  itemTemplate = input<any>(undefined);
  keyExpr = input<string | Function>("id");
  grouped = input<boolean>(true);
  groupBy = input<string>("group");
  collapsedGroups = model<string[]>([]);
  pageSize = input<number>(15);

  @Input() set items(value: any[]) {
    this._items = value;
    if (this.grouped()) {
      this.groupItems();
    }
  }

  get items(): any[] {
    return this._items;
  }

  _items: any[] = [];

  itemClick = output<ItemClickEvent>();
  scrollEvent = output<ScrollEvent>();
  selectionChanged = output<{
    addedItems: any[];
    removedItems: any[];
  }>();
  contentReady = output<void>();
  pageLoadingEvent = output<void>();
  searchValueChange = output<string>();
  groupExpansionChanged = output<{
    group: string;
    expanded: boolean;
  }>();
  loadProgress = output<{
    loaded: number;
    total: number;
    percent: number;
    isComplete: boolean;
  }>();

  @ContentChildren(ListItemComponent)
  itemsChildren!: QueryList<ListItemComponent>;

  isLoadingSignal = signal<boolean>(false);
  isPageLoadingSignal = signal<boolean>(false);
  currentPage: number = 1;
  hasMoreItems: boolean = false;
  totalItems: number = 0;
  loadedItems: number = 0;
  searchValueSignal = signal<string>("");
  groupedItems: GroupedItems[] = [];
  isPreloading: boolean = false;

  heightStyle = computed(() => {
    if (this.height() !== undefined) {
      return typeof this.height() === "number"
        ? `${this.height()}px`
        : this.height();
    }
    return "350px";
  });

  widthStyle = computed(() => {
    if (this.width() !== undefined) {
      return typeof this.width() === "number"
        ? `${this.width()}px`
        : this.width();
    }
    return "100%";
  });

  private loadSubscription?: Subscription;
  private searchSubscription?: Subscription;
  private searchTimeout?: any;
  private lastScrollTop: number = 0;
  private scrollDebounceTimeout?: any;
  private scrollDirection: "up" | "down" = "down";

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this._items.length) {
      this.loadData();
    }
  }

  ngAfterViewInit() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.overflowY = "scroll";
    }

    setTimeout(() => {
      this.checkPreloadCondition();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["preloadThreshold"] || changes["pageSize"]) {
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
    const dataSourceValue = this.dataSource();
    if (!dataSourceValue) return;

    if (!isPageLoad) {
      this.isLoadingSignal.set(true);
      if (Array.isArray(dataSourceValue)) {
        this._items = [...dataSourceValue];
        this.totalItems = dataSourceValue.length;
        this.loadedItems = dataSourceValue.length;
        this.hasMoreItems = false;
        this.isLoadingSignal.set(false);
        if (this.grouped()) {
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

    if (Array.isArray(dataSourceValue)) {
      if (!isPageLoad) {
        this._items = [...dataSourceValue];
        this.totalItems = dataSourceValue.length;
        this.loadedItems = dataSourceValue.length;
        this.hasMoreItems = false;
      } else {
        this.isPageLoadingSignal.set(false);
      }

      if (this.grouped()) {
        this.groupItems();
      }

      this.isLoadingSignal.set(false);
      this.contentReady.emit();
      this.emitLoadProgress();
    } else if (typeof dataSourceValue === "object" && dataSourceValue.load) {
      const currentPageSize = this.pageSize();

      this.loadSubscription = dataSourceValue
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

            if (this.grouped()) {
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
            console.error("Error loading data:", error);
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
    const groupByValue = this.groupBy();

    for (const item of this._items) {
      const groupValue = item[groupByValue] || "Ungrouped";
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    }

    this.groupedItems = Object.keys(groups).map((groupName) => {
      return {
        name: groupName,
        expanded: !this.collapsedGroups().includes(groupName),
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
    }, this.searchTimeoutDelay());
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
    if (this.disabled() || item.disabled) return;

    const clickEvent: ItemClickEvent = {
      itemData: item,
      itemElement: event.currentTarget as HTMLElement,
      itemIndex: index,
      groupName: groupName,
    };

    if (this.selectionMode() !== "none") {
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

      this.scrollDirection = scrollTop > this.lastScrollTop ? "down" : "up";
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
      scrolledPercent >= this.preloadThreshold() &&
      this.scrollDirection === "down"
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

  private toggleSelection(item: any) {
    const key = this.getItemKeyValue(item);
    const currentSelectedItemKeys = this.selectedItemKeys();
    const index = currentSelectedItemKeys.indexOf(key);
    const currentSelectedItems = this.selectedItems();

    if (this.selectionMode() === "single") {
      const previousSelected = [...currentSelectedItems];
      this.selectedItems.set([item]);
      this.selectedItemKeys.set([key]);
      this.selectionChanged.emit({
        addedItems: [item],
        removedItems: previousSelected.filter(
          (i) => this.getItemKeyValue(i) !== key
        ),
      });
    } else if (this.selectionMode() === "multiple") {
      if (index > -1) {
        const newSelectedItems = [...currentSelectedItems];
        const newSelectedItemKeys = [...currentSelectedItemKeys];
        newSelectedItems.splice(index, 1);
        newSelectedItemKeys.splice(index, 1);
        this.selectedItems.set(newSelectedItems);
        this.selectedItemKeys.set(newSelectedItemKeys);
        this.selectionChanged.emit({
          addedItems: [],
          removedItems: [item],
        });
      } else {
        this.selectedItems.set([...currentSelectedItems, item]);
        this.selectedItemKeys.set([...currentSelectedItemKeys, key]);
        this.selectionChanged.emit({
          addedItems: [item],
          removedItems: [],
        });
      }
    }
  }

  private getItemKeyValue(item: any): any {
    const keyExprValue = this.keyExpr();
    if (typeof keyExprValue === "string") {
      return item[keyExprValue];
    } else if (typeof keyExprValue === "function") {
      return keyExprValue(item);
    }
    return item.id || item;
  }

  isItemSelected(item: any): boolean {
    const key = this.getItemKeyValue(item);
    return this.selectedItemKeys().includes(key);
  }

  trackByFn(index: number, item: any): any {
    if (!item) return index;
    const keyExprValue = this.keyExpr();
    if (typeof keyExprValue === "string") {
      return item[keyExprValue] || index;
    } else if (typeof keyExprValue === "function") {
      return keyExprValue(item) || index;
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
