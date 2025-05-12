# Dynamic List Component

This component provides a dynamic, reusable, and highly customizable list for Angular applications.

## Key Features

- Scroll and button pagination
- Item grouping
- Integrated search
- Item selection (single or multiple)
- Style customization
- Data adapter support for any structure
- Custom templates
- Performance optimized with computed signals

## Basic Usage

```html
<list
  [dataSource]="data"
  [grouped]="true" 
  [groupBy]="'department'"
  [selectionMode]="SelectionMode.MULTIPLE"
  [(selectedItems)]="selectedUsers"
  (itemClick)="onItemClick($event)">
</list>
```

## CSS Customization

The component allows complete CSS customization through the following properties:

```html
<list
  [dataSource]="data"
  [cssClasses]="{
    container: 'my-custom-container',
    content: 'my-custom-content',
    searchContainer: 'my-search-box',
    listItems: 'my-items'
  }"
  [styles]="{
    container: { background: '#f5f5f5', border: '1px solid #ddd' },
    searchInput: { fontSize: '16px', padding: '12px' }
  }"
  [theme]="'dark'">
</list>
```

## Data Adapter

To work with existing data structures, you can use adapters:

```typescript
import { Component, OnInit } from '@angular/core';
import { createAdapter, ListItemAdapter } from './list/adapters/generic-item.adapter';
import { AppListItem } from './list/models';

// Your existing data model
interface Customer {
  code: number;
  fullName: string;
  category: string;
  status: 'active' | 'inactive';
  address: {
    city: string;
    state: string;
  }
}

@Component({
  selector: 'app-customers',
  template: `
    <list 
      [dataSource]="customers"
      [adapter]="customerAdapter"
      [grouped]="true"
      [groupBy]="'group'"
      (itemClick)="onCustomerClick($event)">
    </list>
  `
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  customerAdapter: ListItemAdapter<Customer, AppListItem>;

  constructor() {
    // Create an adapter to convert Customer -> AppListItem
    this.customerAdapter = createAdapter<Customer>('code', {
      // Property mapping
      id: 'code',
      name: 'fullName',
      group: (item) => item.category,
      badge: (item) => item.status === 'active' ? 'Active' : 'Inactive',
      disabled: (item) => item.status === 'inactive',
      subText: (item) => `${item.address.city}/${item.address.state}`
    });
  }

  ngOnInit() {
    // Load customers
    this.loadCustomers();
  }

  onCustomerClick(event) {
    // event.itemData is the adapted AppListItem
    console.log('List item:', event.itemData);
    
    // To access the original Customer object:
    const originalCustomer = this.customerAdapter.revert(event.itemData);
    console.log('Original customer:', originalCustomer);
  }
}
```

## Custom Templates

You can use custom templates for each item's content:

```html
<list [dataSource]="products" [itemTemplate]="productTemplate">
</list>

<ng-template #productTemplate let-product>
  <div class="product-card">
    <img [src]="product.image" class="product-image">
    <div class="product-info">
      <h3>{{product.name}}</h3>
      <p class="price">$ {{product.price | number:'1.2-2'}}</p>
    </div>
  </div>
</ng-template>
```

## Theme Support

The component supports light and dark themes:

```html
<list [dataSource]="data" [theme]="'dark'"></list>
```

To implement custom themes, you can extend the CSS classes:

```scss
// styles.scss
.list-container.theme-dark {
  background-color: #333;
  color: #fff;
  
  .list-item {
    border-bottom: 1px solid #555;
    
    &:hover:not(.disabled) {
      background-color: #444;
    }
    
    &.selected {
      background-color: #1e88e5;
    }
  }
}
```

## Performance Optimizations

This component has been optimized for performance using:

1. **Computed Signals**: Instead of using methods directly in templates (which would cause multiple executions during change detection), we use Angular's computed signals for derived values.

2. **Throttling and Debouncing**: Scroll events are throttled and searches are debounced to avoid excessive operations.

3. **TrackBy**: Implementation of item tracking to improve list rendering efficiency.

4. **Memoization**: Calculated values are memoized until their dependencies change. 