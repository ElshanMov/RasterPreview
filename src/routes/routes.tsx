import DashboardPage from "../pages/dashboard/DashboardPage";
import NotFound from "../pages/not-found/NotFoundPage";
import PipelineRunsPage from "../pages/run/PipelineRunsPage";
import PipelineStepsPage from "../pages/step/PipelineStepsPage";
import PipelinesPage from "../pages/pipeline/PipelinesPage";
import PipelineUploader from "../pages/pipeline/parts/PipelineUploader"
import RastersPage from "../pages/raster/RastersPage";
import RasterUploader from "../pages/raster/RasterUploader";
import RasterMapPage from "../pages/raster-map/RasterMapPage";
export const privateRoutes = [
    { path: `/`, element: <DashboardPage />, permission: '*' },
    { path: `/pipelines`, element: <PipelinesPage />, permission: '*' },
    { path: `/pipelines/new`, element: <PipelineUploader />, permission: '*' },
    { path: `/pipelines/:pipelineId/runs`, element: <PipelineRunsPage />, permission: '*' },
    { path: `/pipelines/runs/:pipelineRunId/steps`, element: <PipelineStepsPage />, permission: '*' },
    { path: `/rasters`, element: <RastersPage />, permission: '*' },
    { path: `/rasters/new`, element: <RasterUploader />, permission: '*' },
    { path: `/raster-map`, element: <RasterMapPage />, permission: '*' },
    { path: `/*`, element: <NotFound />, permission: '*' },
];

export const publicRoutes = [
    { path: `/`, element: `/` },
    { path: '/login', element: `/` },
];