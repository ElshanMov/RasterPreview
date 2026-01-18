export interface PipelinesDashboard {
  totalPipelinesCount: number;
  initialisedPipelinesCount: number;
  activatedPipelinesCount: number;
  completedPipelinesCount: number;
  failedPipelinesCount: number;
  stoppedPipelinesCount: number;
  pipelinesRate: number;
}

export interface PipelineLatest {
  id: string; 
  name: string;
  status: number;
  statusName: string;
  modeName: string;
  progress: number;
  createdAt: Date;
}

export interface PipelineParamsType {
  OrganizationId: string | undefined;
  BranchId: string | undefined;
  PipelineName: string | null;
  Page: number;
  PageSize: number;
}

export interface PipelineListItem {
  id: string; 
  name: string;
  status: number;
  statusName: string;
  scheduleInterval: string;
  dataSteward: string;
  investigationMode: string;
  geometryType: string;
  sourceSrid: number;
  sourceName: string;
  sourcePath: string;
  metadata: string;
}

export interface Pipeline {
  organizationId: string; 
  branchId: string;
  scheduleInterval: string;
  ingestionMode: string;
  executionMode: string;
  businessKeyColumns: [string]
  geometryType: string;
  sourceSrid: number;
  sourceName: string;
  sourcePath: string;
  metadata: string;
  configVersion: string;
}