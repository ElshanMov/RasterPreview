export interface BranchParamsType {
  Name: string;
  Code: string;
  Page: number;
  PageSize: number;
}

export interface BranchListItem {
  id: string; 
  code: string;
  name: string;
  description: string;
}

export interface BranchSelectItem {
  id: string; 
  code: string;
  name: string;
  description: string;
}