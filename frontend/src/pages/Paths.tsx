import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PathsPageHeader from "@/components/paths/PathsPageHeader";
import PathsTabBar from "@/components/paths/PathsTabBar";
import PathsGridPanel from "@/components/paths/PathsGridPanel";
import PathsResourcesPanel from "@/components/paths/PathsResourcesPanel";
import ResourceDetailPopup from "@/components/paths/ResourceDetailPopup";
import PathDetailPopup from "@/components/paths/PathDetailPopup";
import EnrollmentFloatingBar from "@/components/paths/EnrollmentFloatingBar";
import SessionCompletionRoute from "@/components/paths/SessionCompletionRoute";
import { useSessionCompletionVisible } from "@/hooks/useSessionCompletionVisible";
import type { ResourceListItem } from "@/lib/paths/pathsResourcesApi";
import type { PathEnrollmentListItem } from "@/lib/paths/pathsEnrollmentApi";
import { PathsEnrollmentProvider } from "@/lib/paths/pathsEnrollmentStore";
import { usePathsTabStore } from "@/lib/paths/pathsTabStore";
import {
  PATHS_CONTENT_BUBBLE_ID,
  PATHS_GUIDED_PANEL_BUBBLE_ID,
  PATHS_GUIDED_PANEL_ROOT_BUBBLE_ID,
  PATHS_HEADER_INSTANCE_BUBBLE_ID,
  PATHS_MAIN_BUBBLE_ID,
  PATHS_MODULE_ID,
  PATHS_PAGE_BUBBLE_ID,
  PATHS_RESOURCES_PANEL_BUBBLE_ID,
  PATHS_RESOURCES_PANEL_ROOT_BUBBLE_ID,
  PATHS_SIDEBAR_INSTANCE_BUBBLE_ID,
} from "@/lib/paths/routes";
import { cn } from "@/lib/utils";

const pathsShellProps = {
  pageBubbleId: PATHS_PAGE_BUBBLE_ID,
  headerBubbleId: PATHS_HEADER_INSTANCE_BUBBLE_ID,
  sidebarBubbleId: PATHS_SIDEBAR_INSTANCE_BUBBLE_ID,
} as const;

function PathsPageBody() {
  const sessionCompletionVisible = useSessionCompletionVisible();
  const { activeTab, setActiveTab, isMyPathsActive, isPathsLibraryActive, selectMyPaths } =
    usePathsTabStore();
  const [viewingResource, setViewingResource] = useState<ResourceListItem | null>(null);
  const [resourcePopupOpen, setResourcePopupOpen] = useState(false);
  const [viewingEnrollment, setViewingEnrollment] = useState<PathEnrollmentListItem | null>(null);
  const [pathDetailPopupOpen, setPathDetailPopupOpen] = useState(false);

  const handleViewResource = (resource: ResourceListItem) => {
    setViewingResource(resource);
    setResourcePopupOpen(true);
  };

  const handleViewPathDetails = (enrollment: PathEnrollmentListItem) => {
    setViewingEnrollment(enrollment);
    setPathDetailPopupOpen(true);
  };

  return (
    <DashboardLayout {...pathsShellProps}>
      <div
        data-bubble-id={PATHS_MAIN_BUBBLE_ID}
        data-module-owner={PATHS_MODULE_ID}
        className="mx-auto w-full max-w-5xl px-4 pb-8 pt-24 md:px-8"
      >
        {sessionCompletionVisible ? (
          <SessionCompletionRoute onReturnToMyPaths={selectMyPaths} />
        ) : (
          <div
            data-bubble-id={PATHS_CONTENT_BUBBLE_ID}
            className="flex w-full flex-col gap-6"
          >
            <PathsPageHeader />
            <PathsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

            <div
              id="paths-guided-panel"
              role="tabpanel"
              data-bubble-id={PATHS_GUIDED_PANEL_BUBBLE_ID}
              aria-labelledby="paths-tab-my_paths_"
              hidden={!isMyPathsActive}
              className={cn(!isMyPathsActive && "hidden")}
            >
              <div data-bubble-id={PATHS_GUIDED_PANEL_ROOT_BUBBLE_ID}>
                <PathsGridPanel onViewDetails={handleViewPathDetails} />
              </div>
            </div>

            <div
              id="paths-resources-panel"
              role="tabpanel"
              data-bubble-id={PATHS_RESOURCES_PANEL_BUBBLE_ID}
              aria-labelledby="paths-tab-paths_library"
              hidden={!isPathsLibraryActive}
              className={cn(!isPathsLibraryActive && "hidden")}
            >
              <div data-bubble-id={PATHS_RESOURCES_PANEL_ROOT_BUBBLE_ID}>
                <PathsResourcesPanel onViewResource={handleViewResource} />
              </div>
            </div>
          </div>
        )}
      </div>

      {!sessionCompletionVisible && <EnrollmentFloatingBar />}

      <ResourceDetailPopup
        open={resourcePopupOpen}
        onOpenChange={(open) => {
          setResourcePopupOpen(open);
          if (!open) setViewingResource(null);
        }}
        resource={viewingResource}
      />

      <PathDetailPopup
        open={pathDetailPopupOpen}
        onOpenChange={(open) => {
          setPathDetailPopupOpen(open);
          if (!open) setViewingEnrollment(null);
        }}
        enrollment={viewingEnrollment}
      />
    </DashboardLayout>
  );
}

const Paths = () => (
  <PathsEnrollmentProvider>
    <PathsPageBody />
  </PathsEnrollmentProvider>
);

export default Paths;
