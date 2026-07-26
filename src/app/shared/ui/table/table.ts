import { Component, input } from '@angular/core';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
}

@Component({
  selector: 'app-table',
  template: `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            @for (column of columns(); track column.key) {
              <th class="px-4 py-3 font-medium">{{ column.label }}</th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @for (row of rows(); track $index) {
            <tr class="hover:bg-slate-50">
              @for (column of columns(); track column.key) {
                <td class="px-4 py-3 text-slate-700">{{ row[column.key] }}</td>
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