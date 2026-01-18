export interface PipelineRunParamsType {
  Page: number;
  PageSize: number;
}

export interface PipelineRunListItem {
  id: string; 
  user: string;
  pipeline: string;
  progress: number;
  statusName: string;
  date: string;
}