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

export interface PipelineRun {
  id: string;
  name: string;
  stageName: string;
  status: number;
  statusName: string;
  executionModeName: string;
  progress: number;
  geometryType: string;
  sourceSrid: number;
  sourceName: string;
  user: string;
  createdAt: string;
  tasks: {
    id: string;
    nextPipelineTaskId: string | null;
    stageName: string;
    details: string;
    startDate: string | null;
    endDate: string | null;
  }[];
}

export interface PipelineTask {
  id: string;
  nextPipelineTaskId: string | null;
  stageName: string;
  details: string;
  startDate: string | null;
  endDate: string | null;
}