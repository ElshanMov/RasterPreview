export interface PipelineStepParamsType {
  Page: number;
  PageSize: number;
}

export interface PipelineStepListItem {
  id: string; 
  user: string;
  pipeline: string;
  action: string;
  details: string;
  date: string;
}