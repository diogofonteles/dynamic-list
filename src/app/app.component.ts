import {Component, TemplateRef, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ListComponent} from './list/list.component';
import {DataService} from './services/data.service';
import {AppListDataSource, AppListItem, PageLoadMode, SelectionMode, User,} from "./list/models";

// Interface personalizada para os itens de tarefa
interface TaskItem extends AppListItem {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  category: string;
  important?: boolean;
}

@Component({
  selector: "app-list-root",
  standalone: true,
  imports: [CommonModule, ListComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent {
  @ViewChild("customItemTemplate", { static: true })
  customItemTemplate!: TemplateRef<any>;

  // Expor enums para uso no template
  protected readonly SelectionMode = SelectionMode;
  protected readonly PageLoadMode = PageLoadMode;

  eventLog: string[] = [];
  loadProgress = {
    loaded: 0,
    total: 0,
    percent: 0,
    isComplete: false,
  };

  userDataSource: AppListDataSource;
  productDataSource: AppListDataSource;

  simpleItems: TaskItem[] = [
    {
      id: 1,
      title: "Complete Project Documentation",
      description: "Write comprehensive docs for the new feature",
      icon: "📄",
      color: "#1976d2",
      status: "Pending",
      important: true,
      category: "Documentation",
    },
    {
      id: 2,
      title: "Code Review",
      description: "Review pull requests from team members",
      icon: "🔍",
      color: "#388e3c",
      status: "Completed",
      category: "Development",
    },
    {
      id: 3,
      title: "Deploy to Production",
      description: "Release version 2.0 to production servers",
      icon: "🚀",
      color: "#f57c00",
      status: "Failed",
      important: true,
      category: "DevOps",
    },
    {
      id: 4,
      title: "Team Meeting",
      description: "Weekly sync with development team",
      icon: "👥",
      color: "#7b1fa2",
      status: "Pending",
      category: "Meetings",
    },
    {
      id: 5,
      title: "UI Design Review",
      description: "Review new UI components",
      icon: "🎨",
      color: "#e91e63",
      status: "Pending",
      category: "Design",
    },
    {
      id: 6,
      title: "Security Audit",
      description: "Perform security audit on the codebase",
      icon: "🔒",
      color: "#f44336",
      status: "Pending",
      category: "DevOps",
    },
    {
      id: 7,
      title: "API Documentation",
      description: "Update API documentation for v2",
      icon: "📋",
      color: "#9c27b0",
      status: "Completed",
      category: "Documentation",
    },
  ];

  constructor(private dataService: DataService) {
    this.userDataSource = {
      load: (page: number, pageSize: number, search?: string) =>
        this.dataService.getUsers(page, pageSize, search),
    };

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
    const added = event.addedItems.map((item: User) => item.name).join(", ");
    const removed = event.removedItems
      .map((item: User) => item.name)
      .join(", ");

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
        event.expanded ? "expanded" : "collapsed"
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

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.eventLog.unshift(`[${timestamp}] ${message}`);

    if (this.eventLog.length > 50) {
      this.eventLog = this.eventLog.slice(0, 50);
    }
  }
}
