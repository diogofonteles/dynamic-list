import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppListComponent, AppListDataSource } from './app-list.component';
// import { AppListItemComponent } from './app-list-item.component';
import { DataService, User, PaginatedResponse } from './data.service';

@Component({
  selector: 'app-list-root',
  standalone: true,
  imports: [CommonModule, AppListComponent],
  template: `
    <div class="app-container">
      <h1>Angular List Component Demo</h1>
      
      <div class="examples">
        <!-- Example 1: Basic List with DataSource (Infinite Scroll) -->
        <div class="example">
          <h2>Basic List with DataSource (Infinite Scroll)</h2>
          <div class="status-info">
            <div class="progress-container">
              <div class="progress-bar" [style.width.%]="loadProgress.percent"></div>
            </div>
            <div class="progress-text">
              Loaded {{loadProgress.loaded}} of {{loadProgress.total}} items ({{loadProgress.percent}}%)
            </div>
          </div>
          <app-list
            [dataSource]="userDataSource"
            [height]="350"
            [searchEnabled]="true"
            searchPlaceholder="Search users..."
            [selectionMode]="'single'"
            [pageLoadMode]="'scrollBottom'"
            [grouped]="true"
            [pageSize]="15"
            [preloadThreshold]="80"
            groupBy="group"
            (itemClick)="onUserClick($event)"
            (selectionChanged)="onUserSelectionChanged($event)"
            (groupExpansionChanged)="onGroupExpansionChanged($event)"
            (loadProgress)="onLoadProgress($event)">
          </app-list>
        </div>

        <!-- Example 2: Non-Grouped List -->
        <div class="example">
          <h2>Non-Grouped Flat List (Infinite Scroll)</h2>
          <app-list
            [dataSource]="userDataSource"
            [height]="350"
            [grouped]="false"
            [searchEnabled]="true"
            [pageSize]="15"
            [selectionMode]="'single'"
            [preloadThreshold]="80"
            (itemClick)="onUserClick($event)">
          </app-list>
        </div>

        <!-- Example 3: Products List with Badges -->
        <div class="example">
          <h2>Products List by Category</h2>
          <app-list
            [dataSource]="productDataSource"
            [height]="350"
            [searchEnabled]="true"
            searchPlaceholder="Search products..."
            [grouped]="true"
            [pageSize]="15"
            [preloadThreshold]="80"
            groupBy="group"
            (itemClick)="onProductClick($event)">
          </app-list>
        </div>

        <!-- Example 4: Simple Array List -->
        <div class="example">
          <h2>Simple Array List with Custom Template</h2>
          <app-list
            [items]="simpleItems"
            [height]="350"
            [selectionMode]="'multiple'"
            [itemTemplate]="customItemTemplate"
            [grouped]="true"
            groupBy="category"
            (itemClick)="onItemClick($event)">
          </app-list>
        </div>
      </div>

      <!-- Event Log -->
      <div class="event-log">
        <h3>Event Log</h3>
        <div class="log-entries">
          <div *ngFor="let log of eventLog; let i = index" class="log-entry">
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Custom Item Template -->
      <ng-template #customItemTemplate let-item>
        <div class="custom-item">
          <div class="custom-icon">
            <i class="icon" [style.color]="item.color">{{ item.icon }}</i>
          </div>
          <div class="custom-content">
            <div class="custom-title" [style.fontWeight]="item.important ? 'bold' : 'normal'">
              {{ item.title }}
            </div>
            <div class="custom-description">{{ item.description }}</div>
          </div>
          <div class="custom-status" *ngIf="item.status">
            <span [class]="'status-badge ' + item.status.toLowerCase()">
              {{ item.status }}
            </span>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, sans-serif;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 40px;
    }

    .examples {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }

    .example {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      background: #f9f9f9;
    }

    .example h2 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #444;
      font-size: 18px;
    }

    .status-info {
      margin-bottom: 15px;
    }

    .progress-container {
      height: 6px;
      background-color: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 5px;
    }

    .progress-bar {
      height: 100%;
      background-color: #1976d2;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      color: #666;
      text-align: right;
    }

    .event-log {
      margin-top: 40px;
      border-top: 2px solid #eee;
      padding-top: 20px;
    }

    .event-log h3 {
      margin-bottom: 10px;
      color: #333;
    }

    .log-entries {
      height: 150px;
      overflow-y: auto;
      border: 1px solid #ddd;
      padding: 10px;
      background: white;
      font-family: monospace;
      font-size: 13px;
    }

    .log-entry {
      padding: 2px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    /* Custom item template styles */
    .custom-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 12px;
    }

    .custom-icon {
      font-size: 24px;
    }

    .custom-content {
      flex: 1;
    }

    .custom-title {
      font-size: 15px;
      color: #333;
    }

    .custom-description {
      font-size: 13px;
      color: #666;
      margin-top: 2px;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      text-transform: uppercase;
    }

    .status-badge.completed {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-badge.failed {
      background: #ffebee;
      color: #c62828;
    }
  `,
  ],
})
export class AppComponent {
  @ViewChild('customItemTemplate', { static: true })
  customItemTemplate!: TemplateRef<any>;

  eventLog: string[] = [];
  loadProgress = {
    loaded: 0,
    total: 0,
    percent: 0,
    isComplete: false,
  };

  // Data Sources
  userDataSource: AppListDataSource;
  productDataSource: AppListDataSource;

  // Simple array for demonstration
  simpleItems = [
    {
      id: 1,
      title: 'Complete Project Documentation',
      description: 'Write comprehensive docs for the new feature',
      icon: '📄',
      color: '#1976d2',
      status: 'Pending',
      important: true,
      category: 'Documentation',
    },
    {
      id: 2,
      title: 'Code Review',
      description: 'Review pull requests from team members',
      icon: '🔍',
      color: '#388e3c',
      status: 'Completed',
      category: 'Development',
    },
    {
      id: 3,
      title: 'Deploy to Production',
      description: 'Release version 2.0 to production servers',
      icon: '🚀',
      color: '#f57c00',
      status: 'Failed',
      important: true,
      category: 'DevOps',
    },
    {
      id: 4,
      title: 'Team Meeting',
      description: 'Weekly sync with development team',
      icon: '👥',
      color: '#7b1fa2',
      status: 'Pending',
      category: 'Meetings',
    },
    {
      id: 5,
      title: 'UI Design Review',
      description: 'Review new UI components',
      icon: '🎨',
      color: '#e91e63',
      status: 'Pending',
      category: 'Design',
    },
    {
      id: 6,
      title: 'Security Audit',
      description: 'Perform security audit on the codebase',
      icon: '🔒',
      color: '#f44336',
      status: 'Pending',
      category: 'DevOps',
    },
    {
      id: 7,
      title: 'API Documentation',
      description: 'Update API documentation for v2',
      icon: '📋',
      color: '#9c27b0',
      status: 'Completed',
      category: 'Documentation',
    },
  ];

  constructor(private dataService: DataService) {
    // Initialize user data source with paginação
    this.userDataSource = {
      load: (page: number, pageSize: number, search?: string) =>
        this.dataService.getUsers(page, pageSize, search),
    };

    // Initialize product data source com paginação
    this.productDataSource = {
      load: (page: number, pageSize: number, search?: string) =>
        this.dataService.getProducts(page, pageSize, search),
    };
  }

  onUserClick(event: any) {
    const itemData = event.itemData;
    this.log(`User clicked: ${itemData.name} (${itemData.email})`);
  }

  onProductClick(event: any) {
    const itemData = event.itemData;
    this.log(`Product clicked: ${itemData.text} - ${itemData.subText}`);
  }

  onItemClick(event: any) {
    const itemData = event.itemData;
    this.log(`Item clicked: ${itemData.title}`);
  }

  onUserSelectionChanged(event: any) {
    const added = event.addedItems.map((item: User) => item.name).join(', ');
    const removed = event.removedItems
      .map((item: User) => item.name)
      .join(', ');

    if (added) {
      this.log(`User selected: ${added}`);
    }
    if (removed) {
      this.log(`User deselected: ${removed}`);
    }
  }

  onGroupExpansionChanged(event: any) {
    this.log(
      `Group "${event.group}" is now ${
        event.expanded ? 'expanded' : 'collapsed'
      }`
    );
  }

  onLoadProgress(progress: any) {
    this.loadProgress = progress;
    if (
      progress.loaded > this.loadProgress.loaded &&
      progress.loaded % 15 === 0
    ) {
      this.log(
        `Loaded ${progress.loaded} of ${progress.total} items (${progress.percent}%)`
      );
    }
  }

  // Simplificado para evitar o erro
  trackByLog(index: number): number {
    return index;
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.eventLog.unshift(`[${timestamp}] ${message}`);

    // Keep only last 50 entries
    if (this.eventLog.length > 50) {
      this.eventLog = this.eventLog.slice(0, 50);
    }
  }
}
