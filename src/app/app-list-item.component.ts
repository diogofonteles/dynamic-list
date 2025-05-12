import { Component, TemplateRef, input, output, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="app-list-item" 
         [class.selected]="selected()"
         [class.disabled]="disabled()"
         (click)="onClick($event)">
      
      @if (template()) {
        <ng-container [ngTemplateOutlet]="template()!" [ngTemplateOutletContext]="{ $implicit: item() }"></ng-container>
      } @else {
        <div class="item-content">
          @if (item()?.icon) {
            <div class="item-icon">
              <i class="icon">{{ item().icon }}</i>
            </div>
          }
          
          <div class="item-text">
            <div class="item-main-text">{{ displayText() }}</div>
            @if (item()?.subText) {
              <div class="item-sub-text">{{ item().subText }}</div>
            }
          </div>
          
          @if (item()?.badge) {
            <div class="item-badge">
              <span class="badge">{{ item().badge }}</span>
            </div>
          }
          
          @if (item()?.showChevron) {
            <div class="item-chevron">
              <i class="icon chevron-right"></i>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
    .app-list-item {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s ease;
      border-bottom: 1px solid #eee;
    }

    .app-list-item:hover:not(.disabled) {
      background-color: #f5f5f5;
    }

    .app-list-item.selected {
      background-color: #e3f2fd;
    }

    .app-list-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .item-content {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 12px;
    }

    .item-icon {
      font-size: 18px;
      color: #666;
    }

    .item-text {
      flex: 1;
      min-width: 0;
    }

    .item-main-text {
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-sub-text {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-badge .badge {
      display: inline-block;
      background: #1976d2;
      color: white;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 11px;
      min-width: 18px;
      text-align: center;
    }

    .item-chevron {
      font-size: 16px;
      color: #999;
    }

    .icon {
      font-style: normal;
    }

    .icon.chevron-right::before {
      content: '›';
      font-family: sans-serif;
      font-weight: bold;
    }
  `,
  ],
})
export class AppListItemComponent {
  item = input<any>(null);
  index = input<number>(0);
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  template = input<TemplateRef<any> | null>(null);

  clickEvent = output<MouseEvent>();

  // Computed signal para o texto exibido
  displayText = computed(() => {
    const currentItem = this.item();

    if (!currentItem) return '';

    if (typeof currentItem === 'string') {
      return currentItem;
    }

    // Para User objects
    if (currentItem.name) {
      return currentItem.name;
    }

    // Para Product objects
    if (currentItem.text) {
      return currentItem.text;
    }

    // Fallback para tentar outras propriedades comuns
    if (currentItem.title) {
      return currentItem.title;
    }

    if (currentItem.label) {
      return currentItem.label;
    }

    if (currentItem.displayText) {
      return currentItem.displayText;
    }

    // Se não encontrar nenhuma propriedade adequada
    return currentItem.toString();
  });

  onClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clickEvent.emit(event);
    }
  }
}
