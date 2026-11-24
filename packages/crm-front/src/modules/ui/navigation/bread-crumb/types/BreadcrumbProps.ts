import { type BreadcrumbItem } from 'crm-ui/primitives/navigation';

export type BreadcrumbProps = {
  links: Pick<BreadcrumbItem, 'children' | 'href'>[];
};
