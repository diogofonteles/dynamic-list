import {Component, computed, input, output, TemplateRef} from '@angular/core';
import { NgTemplateOutlet, NgStyle } from "@angular/common";

@Component({
  selector: "list-item",
  standalone: true,
  imports: [NgTemplateOutlet, NgStyle],
  templateUrl: "list-item.component.html",
  styleUrls: ["list-item.component.scss"],
})
export class ListItemComponent {
  item = input<any>(null);
  index = input<number>(0);
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  template = input<TemplateRef<any> | null>(null);

  cssClass = input<string | undefined>(undefined);
  contentCssClass = input<string | undefined>(undefined);
  iconCssClass = input<string | undefined>(undefined);
  textCssClass = input<string | undefined>(undefined);
  badgeCssClass = input<string | undefined>(undefined);
  styles = input<{
    item?: Record<string, string>;
    content?: Record<string, string>;
    icon?: Record<string, string>;
    text?: Record<string, string>;
    badge?: Record<string, string>;
  }>({});

  clickEvent = output<MouseEvent>();

  displayText = computed(() => {
    const currentItem = this.item();

    if (!currentItem) return "";

    if (typeof currentItem === "string") {
      return currentItem;
    }

    if (currentItem.name) {
      return currentItem.name;
    }

    if (currentItem.text) {
      return currentItem.text;
    }

    if (currentItem.title) {
      return currentItem.title;
    }

    if (currentItem.label) {
      return currentItem.label;
    }

    if (currentItem.displayText) {
      return currentItem.displayText;
    }

    return currentItem.toString();
  });

  itemClass = computed(() => {
    return this.cssClass() ? `list-item ${this.cssClass()}` : "list-item";
  });

  contentClass = computed(() => {
    return this.contentCssClass()
      ? `item-content ${this.contentCssClass()}`
      : "item-content";
  });

  iconClass = computed(() => {
    return this.iconCssClass()
      ? `item-icon ${this.iconCssClass()}`
      : "item-icon";
  });

  textClass = computed(() => {
    return this.textCssClass()
      ? `item-text ${this.textCssClass()}`
      : "item-text";
  });

  badgeClass = computed(() => {
    return this.badgeCssClass()
      ? `item-badge ${this.badgeCssClass()}`
      : "item-badge";
  });

  onClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clickEvent.emit(event);
    }
  }
}
