export const PipelineStatus = {
    Initializing: 0,
    Initialized: 1,
    Activated: 2,
    Failed: 3,
    Completed: 4,
    Stopped: 5
} as const;

export const PipelineMode = {
    Auto: 0,
    Manual: 1
} as const;

export const PipelineStage = {
    Initialized: 0,
    Bronze: 1,
    Silver: 2,
    Gold: 3,
    SpatialAnalysis: 4
} as const;

export type PipelineStage = typeof PipelineStage[keyof typeof PipelineStage];
export type PipelineStatus = typeof PipelineStatus[keyof typeof PipelineStatus];
export type PipelineMode = typeof PipelineMode[keyof typeof PipelineMode];