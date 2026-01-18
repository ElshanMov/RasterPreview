export interface OrganizationParamsType {
  Name: string;
  Code: string;
  Page: number;
  PageSize: number;
}

export interface OrganizationListItem {
  id: string; 
  parentName: string;
  typeName: string;
  code: string;
  name: string;
  metadata: string;
}

export interface OrganizationSelectItem {
  id: string; 
  value: string;
}