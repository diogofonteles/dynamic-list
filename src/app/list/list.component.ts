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
  SimpleChanges,
  signal,
  computed,
  input,
  model,
  output,
  inject,
  DestroyRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  Subscription,
  Subject,
  debounceTime,
  fromEvent,
  Observable,
  takeUntil,
  of,
  timer,
  BehaviorSubject,
  throttleTime,
  tap,
} from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ListItemComponent } from "./components/list-item/list-item.component";
import {
  AppListDataSource,
  GroupedItems,
  ItemClickEvent,
  ScrollEvent,
  AppListItem,
  PaginatedResponse,
  // Enums
  SelectionMode,
  PageLoadMode,
  ScrollDirection,
  // Constantes
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DEFAULT_PRELOAD_THRESHOLD,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SEARCH_TIMEOUT,
  SCROLL_DEBOUNCE_TIME,
  SCROLL_END_THRESHOLD,
  PRELOAD_CHECK_DELAY,
  // Interfaces de eventos
  LoadProgressEvent,
  SelectionChangeEvent,
  GroupExpansionEvent,
} from "./models";
import { ListService } from "./services/list.service";

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

  // Input signals
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

  // Model signals (two-way binding)
  selectedItems = model<T[]>([]);
  selectedItemKeys = model<any[]>([]);
  collapsedGroups = model<string[]>([]);

  // Backward compatibility for items
  @Input() set items(value: Array<T>) {
    this._items = value || [];
    if (this.grouped()) {
      this.groupItems();
    }
  }

  get items(): Array<T> {
    return this._items;
  }

  _items: Array<T> = [];

  // Output signals
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

  // DI
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private listService = inject(ListService<T>);

  // State signals (agora usando signals do serviço)
  isLoadingSignal = this.listService.isLoading;
  isPageLoadingSignal = this.listService.isPageLoading;
  searchValueSignal = signal<string>("");

  // State variables
  groupedItems: GroupedItems<T>[] = [];

  // RxJS subjects
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly scrollSubject = new Subject<Event>();
  private scrollDirection: ScrollDirection = ScrollDirection.DOWN;
  private lastScrollTop = 0;
  private loadSubscription?: Subscription;

  // Computed styles
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

  constructor() {
    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(this.searchTimeoutDelay()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        // Resetar o estado do serviço quando uma nova busca for realizada
        this.listService.resetState();
        this.loadData();
      });

    // Setup scroll throttling
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

      // Use RxJS instead of setTimeout
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
      // Cancelar qualquer carregamento de dados em andamento
      if (this.loadSubscription) {
        this.loadSubscription.unsubscribe();
        this.loadSubscription = undefined;
      }

      // Se não for carregamento de página (paginação), resetar o estado
      if (!isPageLoad) {
        this._items = [];
      }

      // Guardar uma cópia dos itens atuais antes de carregar mais
      const existingItems = [...this._items];

      // Usar o serviço para carregar dados
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
            if (!isPageLoad) {
              // Se não for paginação, substituir os itens
              this._items = result.items;
            } else {
              // Para paginação, manter os itens existentes e adicionar os novos
              if (existingItems.length > 0) {
                // Se já temos itens, verificamos que os novos itens do serviço incluem os existentes mais os novos
                const existingIds = new Set(
                  existingItems.map((item) =>
                    this.listService.getItemKeyValue(item, this.keyExpr())
                  )
                );

                // Filtrar apenas os itens novos que não estão na lista existente
                const newItems = result.items.filter(
                  (item) =>
                    !existingIds.has(
                      this.listService.getItemKeyValue(item, this.keyExpr())
                    )
                );

                // Manter os itens existentes e adicionar apenas os novos
                this._items = [...existingItems, ...newItems];
              } else {
                // Se não temos itens, usamos os do serviço
                this._items = result.items;
              }
            }

            // Atualizar os grupos
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

            resolve(); // Resolver a promessa quando o carregamento for concluído
          },
          error: (error) => {
            console.error("Error loading data:", error);
            this.cdr.detectChanges();
            resolve(); // Resolver a promessa mesmo em caso de erro
          },
        });

      if (isPageLoad) {
        this.pageLoadingEvent.emit();
      }
    });
  }

  private groupItems(): void {
    // Usar o serviço para agrupar itens
    this.groupedItems = this.listService.groupItems(
      this._items,
      this.groupBy(),
      this.collapsedGroups()
    );
  }

  handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    // Valor de pesquisa alterado - precisamos redefinir o estado
    this.searchValueSignal.set(value);
    this.searchValueChange.emit(value);

    // Use RxJS subject para debouncing
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
    // Use RxJS subject for throttling
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

    // Usar o serviço para verificar se deve pré-carregar
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
    // Usar o serviço para gerenciar a seleção
    const result = this.listService.handleSelection(
      item,
      this.selectionMode(),
      this.selectedItems(),
      this.selectedItemKeys(),
      this.keyExpr()
    );

    this.selectedItems.set(result.newSelectedItems);
    this.selectedItemKeys.set(result.newSelectedItemKeys);
    this.selectionChanged.emit(result.selectionChangeEvent);
  }

  isItemSelected(item: T): boolean {
    // Usar o serviço para verificar se um item está selecionado
    return this.listService.isItemSelected(
      item,
      this.selectedItemKeys(),
      this.keyExpr()
    );
  }

  trackByFn(index: number, item: T): any {
    if (!item) return index;

    return this.listService.getItemKeyValue(item, this.keyExpr()) || index;
  }

  loadMore(): void {
    if (this.listService.hasMoreItems() && !this.isPageLoadingSignal()) {
      // Armazenar a posição atual de scroll para restaurar após o carregamento
      const scrollPosition = this.scrollContainer
        ? this.scrollContainer.nativeElement.scrollTop
        : 0;

      this.loadData(true).then(() => {
        // Restaurar a posição de scroll depois que a lista for atualizada
        if (this.scrollContainer) {
          // Usar um timer para garantir que a renderização dos novos itens foi concluída
          timer(10).subscribe(() => {
            this.scrollContainer.nativeElement.scrollTop = scrollPosition;
          });
        }
      });
    }
  }
}
