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
import { Observable, Subscription } from 'rxjs';
import { AppListItemComponent } from './app-list-item.component';
import { PaginatedResponse } from './data.service';

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

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, AppListItemComponent],
  template: `
    <div class="app-list-container" #container
         [class.scrollable]="scrollingEnabled"
         [style.height]="heightStyle()"
         [style.width]="widthStyle()">
      
      <!-- Search Box -->
      @if (searchEnabled) {
        <div class="app-list-search">
          <input 
            type="text" 
            class="app-list-search-input"
            [placeholder]="searchPlaceholder || 'Search...'"
            [value]="searchValueSignal()"
            (input)="handleSearchInput($event)"
            (change)="handleSearchChange($event)">
        </div>
      }

      <!-- List Content -->
      <div class="app-list-content" 
           #scrollContainer
           (scroll)="handleScroll($event)"
           [class.native-scroll]="useNativeScrolling">
        
        <!-- Loading Indicator -->
        @if (isLoadingSignal() && !isPageLoadingSignal() && _items.length === 0) {
          <div class="app-list-loading">
            <div class="loading-indicator">
              <div class="loading-spinner"></div>
              <div class="loading-text">Loading...</div>
            </div>
          </div>
        }

        <!-- No Data -->
        @if (!isLoadingSignal() && !isPageLoadingSignal() && _items.length === 0) {
          <div class="app-list-no-data">
            {{ noDataText || 'No data to display' }}
          </div>
        }

        <!-- Grouped Items -->
        @if (!isLoadingSignal() && grouped && groupedItems.length > 0) {
          <div class="app-list-grouped">
            @for (group of groupedItems; track group.name) {
              <!-- Group Header -->
              <div class="group-header" (click)="toggleGroupExpansion(group)">
                <div class="group-title">{{ group.name }}</div>
                <div class="group-toggle">
                  @if (group.expanded) {
                    <span>▼</span>
                  } @else {
                    <span>▶</span>
                  }
                </div>
              </div>
              
              <!-- Group Items -->
              @if (group.expanded) {
                <div class="group-items">
                  @for (item of group.items; track trackByFn($index, item)) {
                    <app-list-item
                      [item]="item"
                      [index]="$index"
                      [selected]="isItemSelected(item)"
                      [disabled]="item.disabled || disabled"
                      [template]="item.template || itemTemplate"
                      (clickEvent)="handleItemClick($event, item, $index, group.name)">
                    </app-list-item>
                  }
                </div>
              }
            }
          </div>
        }

        <!-- Flat Items (no grouping) -->
        @if (!isLoadingSignal() && !grouped && _items.length > 0) {
          <div class="app-list-items">
            @for (item of _items; track trackByFn($index, item)) {
              <app-list-item
                [item]="item"
                [index]="$index"
                [selected]="isItemSelected(item)"
                [disabled]="item.disabled || disabled"
                [template]="item.template || itemTemplate"
                (clickEvent)="handleItemClick($event, item, $index)">
              </app-list-item>
            }
          </div>
        }

        <!-- Page Loading -->
        @if (isPageLoadingSignal()) {
          <div class="app-list-page-loading">
            <div class="loading-indicator">
              <div class="loading-spinner"></div>
              <div class="loading-text">{{ pageLoadingText || 'Loading more...' }}</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
    .app-list-container {
      width: 100%;
      height: 350px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #ddd;
      background: white;
      position: relative;
    }

    .app-list-search {
      padding: 8px;
      border-bottom: 1px solid #eee;
      z-index: 2;
      flex-shrink: 0;  /* Impede que a caixa de busca encolha */
    }

    .app-list-search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    .app-list-content {
      flex: 1 1 auto;
      overflow-y: scroll;
      position: relative;
      scroll-behavior: smooth;
      min-height: 0;  /* Importante para o scrolling em flexbox */
    }

    .app-list-content.native-scroll {
      overflow-y: scroll;
    }

    .app-list-loading,
    .app-list-no-data,
    .app-list-page-loading {
      padding: 20px;
      text-align: center;
      color: #666;
    }

    .loading-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #1976d2;
      border-radius: 50%;
      animation: spinner 0.8s linear infinite;
    }

    .loading-text {
      display: inline-block;
      font-size: 14px;
    }

    @keyframes spinner {
      to {transform: rotate(360deg);}
    }

    .app-list-items, .app-list-grouped {
      display: flex;
      flex-direction: column;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #eee;
      font-weight: 500;
      cursor: pointer;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .group-header:hover {
      background-color: #eeeeee;
    }

    .group-title {
      font-size: 14px;
      color: #555;
    }

    .group-toggle {
      font-size: 12px;
      color: #777;
    }

    .group-items {
      background-color: white;
    }

    .app-list-page-loading {
      padding: 15px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
      background-color: #fafafa;
    }

    :host {
      display: block;
    }

    /* Estilização da barra de rolagem */
    .app-list-content::-webkit-scrollbar {
      width: 8px;
    }

    .app-list-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .app-list-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    .app-list-content::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `,
  ],
})
export class AppListComponent
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
    this.currentPage = 1; // Reset page when data source changes
    this._items = []; // Limpar items ao trocar o dataSource
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
  @Input() preloadThreshold: number = 80; // 80% da visualização

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

  @Input() pageSize: number = 15; // 15 itens por página

  // Event Emitters
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

  // Estados internos convertidos para signals
  isLoadingSignal = signal<boolean>(false);
  isPageLoadingSignal = signal<boolean>(false);
  currentPage: number = 1;
  hasMoreItems: boolean = false;
  totalItems: number = 0;
  loadedItems: number = 0;
  searchValueSignal = signal<string>('');
  groupedItems: GroupedItems[] = [];
  isPreloading: boolean = false;

  // Computed signals para estilos
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
    // Garantir que a barra de rolagem seja visível
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.overflowY = 'scroll';
    }

    // Iniciar com a verificação de preload após o componente ser inicializado
    setTimeout(() => {
      this.checkPreloadCondition();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['preloadThreshold'] || changes['pageSize']) {
      // Se as configurações de preload ou pageSize mudarem, verificar novamente
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
      this.isPreloading = false; // Reset preloading flag
      this.pageLoadingEvent.emit();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    if (Array.isArray(this.dataSource)) {
      // Simple array data source
      if (!isPageLoad) {
        this._items = [...this.dataSource];
        this.totalItems = this.dataSource.length;
        this.loadedItems = this.dataSource.length;
        this.hasMoreItems = false;
      } else {
        // Se for um array simples, não tem paginação
        this.isPageLoadingSignal.set(false);
      }

      if (this.grouped) {
        this.groupItems();
      }

      this.isLoadingSignal.set(false);
      this.contentReady.emit();
      this.emitLoadProgress();
    } else if (typeof this.dataSource === 'object' && this.dataSource.load) {
      // Observable data source with pagination
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

            // Verificar se precisa précarregar mais dados mesmo após a carga inicial
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

    // Agrupar itens
    const groups: { [key: string]: any[] } = {};

    for (const item of this._items) {
      const groupValue = item[this.groupBy] || 'Ungrouped';
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    }

    // Converter para o formato de grupos
    this.groupedItems = Object.keys(groups).map((groupName) => {
      return {
        name: groupName,
        expanded: !this.collapsedGroups.includes(groupName), // Expandido por padrão
        items: groups[groupName],
      };
    });

    // Ordenar grupos por nome
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
    // Reset para a primeira página e recarregar dados
    this.currentPage = 1;
    this._items = []; // Limpar itens existentes
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

    // Handle selection
    if (this.selectionMode !== 'none') {
      this.toggleSelection(item);
    }

    this.itemClick.emit(clickEvent);
  }

  handleScroll(event: any) {
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }

    // Debounce scroll event to improve performance
    this.scrollDebounceTimeout = setTimeout(() => {
      const element = event.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      // Calcular percentual de scroll
      const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;

      // Determinar direção do scroll
      this.scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';
      this.lastScrollTop = scrollTop;

      // Considerar chegada ao fim com threshold
      const reachEnd = scrollTop + clientHeight >= scrollHeight - 20;

      const scrollEvent: ScrollEvent = {
        scrollTop,
        scrollHeight,
        clientHeight,
        reachEnd,
        percent,
      };

      this.scrollEvent.emit(scrollEvent);

      // Verificar se deve pré-carregar mais dados
      this.checkPreloadCondition();
    }, 50); // 50ms debounce
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

    // Calcular percentual visualizado
    const scrolledPercent = ((scrollTop + clientHeight) / scrollHeight) * 100;

    // Se o usuário já visualizou X% do conteúdo e está scrollando para baixo
    if (
      scrolledPercent >= this.preloadThreshold &&
      this.scrollDirection === 'down'
    ) {
      this.isPreloading = true; // Sinalizar que está pré-carregando
      this.loadMore();
    }
  }

  toggleGroupExpansion(group: GroupedItems) {
    group.expanded = !group.expanded;

    // Emit event
    this.groupExpansionChanged.emit({
      group: group.name,
      expanded: group.expanded,
    });

    // Update collapsedGroups array
    if (group.expanded) {
      this.collapsedGroups = this.collapsedGroups.filter(
        (g) => g !== group.name
      );
    } else if (!this.collapsedGroups.includes(group.name)) {
      this.collapsedGroups.push(group.name);
    }

    // Forçar detecção de mudanças para atualizar view
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

  // Função para obter a chave do item
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

  // Função de tracking para @for
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
