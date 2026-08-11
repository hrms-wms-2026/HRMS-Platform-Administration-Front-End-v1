import { Component, input } from '@angular/core';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
}

@Component({
  selector: 'app-table',
  template: `
    <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
          <tr>
            @for (column of columns(); track column.key) {
              <th class="px-4 py-3 font-medium">{{ column.label }}</th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          @for (row of rows(); track $index) {
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800">
              @for (column of columns(); track column.key) {
                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ row[column.key] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Table<T> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<T[]>();
}