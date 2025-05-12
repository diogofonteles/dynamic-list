import { Component, TemplateRef, input, output, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'list-item',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: 'list-item.component.html',
  styleUrls: ['list-item.component.scss'],
})
export class ListItemComponent {
  item = input<any>(null);
  index = input<number>(0);
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  template = input<TemplateRef<any> | null>(null);

  clickEvent = output<MouseEvent>();

  displayText = computed(() => {
    const currentItem = this.item();

    if (!currentItem) return '';

    if (typeof currentItem === 'string') {
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

  onClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clickEvent.emit(event);
    }
  }
}
