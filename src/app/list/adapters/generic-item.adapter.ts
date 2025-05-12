import { AppListItem, ListItemAdapter } from "../models/list.model";

export class GenericItemAdapter<
  T extends Record<string, any>,
  R extends AppListItem = AppListItem
> implements ListItemAdapter<T, R>
{
  constructor(
    private keyProperty: keyof T,
    private propertyMappings: Record<
      keyof R,
      keyof T | ((item: T) => any)
    > = {} as any,
    private idProperty?: keyof T
  ) {}

  adapt(sourceItem: T): R {
    if (!sourceItem) {
      return {} as R;
    }

    const result = {} as R;
    const keys = Object.keys(this.propertyMappings) as Array<keyof R>;

    result.id = sourceItem[this.idProperty || this.keyProperty] as any;

    keys.forEach((targetKey) => {
      const sourceKey = this.propertyMappings[targetKey];

      if (typeof sourceKey === "function") {
        result[targetKey] = (sourceKey as (item: T) => any)(sourceItem);
      } else if (sourceKey && sourceItem[sourceKey as keyof T] !== undefined) {
        result[targetKey] = sourceItem[sourceKey as keyof T] as any;
      }
    });

    return result;
  }

  adaptArray(sourceItems: T[]): R[] {
    if (!sourceItems || !Array.isArray(sourceItems)) {
      return [];
    }

    return sourceItems.map((item) => this.adapt(item));
  }

  revert(listItem: R): T {
    if (!listItem) {
      return {} as T;
    }

    const result = {} as T;
    const invertedMap = this.getInvertedMap();

    Object.keys(invertedMap).forEach((key) => {
      const targetKey = invertedMap[key];
      if (listItem[key as keyof R] !== undefined) {
        result[targetKey as keyof T] = listItem[key as keyof R] as any;
      }
    });

    if (listItem.id !== undefined) {
      result[this.idProperty || this.keyProperty] = listItem.id as any;
    }

    return result;
  }

  getKey(item: T | R): string | number {
    if (!item) {
      return "";
    }

    if ("id" in item && item.id !== undefined) {
      return item.id as string | number;
    }

    if ((item as T)[this.keyProperty] !== undefined) {
      return (item as T)[this.keyProperty] as unknown as string | number;
    }

    return "";
  }

  private getInvertedMap(): Record<string, keyof T> {
    const invertedMap: Record<string, keyof T> = {};

    Object.keys(this.propertyMappings).forEach((key) => {
      const value = this.propertyMappings[key as keyof R];
      if (typeof value !== "function" && value) {
        invertedMap[key] = value as keyof T;
      }
    });

    return invertedMap;
  }
}

export function createAdapter<
  T extends Record<string, any>,
  R extends AppListItem = AppListItem
>(
  keyProperty: keyof T,
  mappings: Record<keyof R, keyof T | ((item: T) => any)> = {} as any,
  idProperty?: keyof T
): ListItemAdapter<T, R> {
  return new GenericItemAdapter<T, R>(keyProperty, mappings, idProperty);
}
