import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PathsPageHeader from "@/components/paths/PathsPageHeader";
import PathsTabBar from "@/components/paths/PathsTabBar";
import PathsGridPanel from "@/components/paths/PathsGridPanel";
import PathsResourcesPanel from "@/components/paths/PathsResourcesPanel";
import PathsLibraryCatalogPanel from "@/components/paths/PathsLibraryCatalogPanel";
import ResourceDetailPopup from "@/components/paths/ResourceDetailPopup";
import PathDetailPopup from "@/components/paths/PathDetailPopup";
import EnrollmentFloatingBar from "@/components/paths/EnrollmentFloatingBar";
import SessionCompletionRoute from "@/components/paths/SessionCompletionRoute";
import { useSessionCompletionVisible } from "@/hooks/useSessionCompletionVisible";
import type { ResourceListItem } from "@/lib/paths/pathsResourcesApi";
import type { PathEnrollmentListItem } from "@/lib/paths/pathsEnrollmentApi";
import type { PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import {
  PathsEnrollmentProvider,
  usePathsEnrollmentStore,
} from "@/lib/paths/pathsEnrollmentStore";
import { usePathsTabStore } from "@/lib/paths/pathsTabStore";
import { PATHS_MODULE_ID } from "@/lib/paths/routes";
import { cn } from "@/lib/utils";


function PathsPageBody() {
  const { refresh: refreshEnrollments } = usePathsEnrollmentStore();
  const sessionCompletionVisible = useSessionCompletionVisible();
  const {
    activeTab,
    setActiveTab,
    isMyPathsActive,
    isPathsLibraryActive,
    isResourceLibraryActive,
    selectMyPaths,
  } = usePathsTabStore();
  const [viewingResource, setViewingResource] = useState<ResourceListItem | null>(null);
  const [resourcePopupOpen, setResourcePopupOpen] = useState(false);
  const [viewingEnrollment, setViewingEnrollment] = useState<PathEnrollmentListItem | null>(null);
  const [viewingCatalogPath, setViewingCatalogPath] = useState<PathCatalogEntry | null>(null);
  const [pathDetailPopupOpen, setPathDetailPopupOpen] = useState(false);

  const handleViewResource = (resource: ResourceListItem) => {
    setViewingResource(resource);
    setResourcePopupOpen(true);
  };

  const handleViewPathDetails = (enrollment: PathEnrollmentListItem) => {
    setViewingCatalogPath(null);
    setViewingEnrollment(enrollment);
    setPathDetailPopupOpen(true);
  };

  const handleViewCatalogPath = (path: PathCatalogEntry) => {
    setViewingEnrollment(null);
    setViewingCatalogPath(path);
    setPathDetailPopupOpen(true);
  };

  return (
    <DashboardLayout >
      <div
        data-module-owner={PATHS_MODULE_ID}
        className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8"
      >
        {sessionCompletionVisible ? (
          <SessionCompletionRoute onReturnToMyPaths={selectMyPaths} />
        ) : (
          <div
            className="flex w-full flex-col gap-6"
          >
            <PathsPageHeader />

            <div className="flex w-full flex-col gap-4">
              <PathsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

              {isMyPathsActive && <EnrollmentFloatingBar />}

              <div
                id="paths-guided-panel"
                role="tabpanel"
                aria-labelledby="paths-tab-my_paths_"
                hidden={!isMyPathsActive}
                className={cn(!isMyPathsActive && "hidden")}
              >
                <div>
                  <PathsGridPanel onViewDetails={handleViewPathDetails} />
                </div>
              </div>

              <div
                id="paths-catalog-panel"
                role="tabpanel"
                aria-labelledby="paths-tab-paths_library"
                hidden={!isPathsLibraryActive}
                className={cn(!isPathsLibraryActive && "hidden")}
              >
                <PathsLibraryCatalogPanel onViewPath={handleViewCatalogPath} />
              </div>

              <div
                id="paths-resources-panel"
                role="tabpanel"
                aria-labelledby="paths-tab-resource_library"
                hidden={!isResourceLibraryActive}
                className={cn(!isResourceLibraryActive && "hidden")}
              >
                <PathsResourcesPanel onViewResource={handleViewResource} />
              </div>
            </div>
          </div>
        )}
      </div>

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
          if (!open) {
            setViewingEnrollment(null);
            setViewingCatalogPath(null);
          }
        }}
        enrollment={viewingEnrollment}
        catalogPath={viewingCatalogPath}
        onEnrollmentsChanged={refreshEnrollments}
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
