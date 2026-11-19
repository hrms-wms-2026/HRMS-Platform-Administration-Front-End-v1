export interface BreadcrumbData {
  section?: string;
  parent?: { label: string; route: string };
  page: string;
}
