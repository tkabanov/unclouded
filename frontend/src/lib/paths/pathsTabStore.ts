import { useCallback, useState } from "react";
import {
  PATH_PAGE_TAB,
  type PathPageTabSlug,
} from "@/lib/enums/pathPageTabs";

export function usePathsTabStore(
  defaultTab: PathPageTabSlug = PATH_PAGE_TAB.MY_PATHS,
) {
  const [activeTab, setActiveTab] = useState<PathPageTabSlug>(defaultTab);

  const selectMyPaths = useCallback(
    () => setActiveTab(PATH_PAGE_TAB.MY_PATHS),
    [],
  );
  const selectPathsLibrary = useCallback(
    () => setActiveTab(PATH_PAGE_TAB.PATHS_LIBRARY),
    [],
  );
  const selectResourceLibrary = useCallback(
    () => setActiveTab(PATH_PAGE_TAB.RESOURCE_LIBRARY),
    [],
  );

  return {
    activeTab,
    setActiveTab,
    selectMyPaths,
    selectPathsLibrary,
    selectResourceLibrary,
    isMyPathsActive: activeTab === PATH_PAGE_TAB.MY_PATHS,
    isPathsLibraryActive: activeTab === PATH_PAGE_TAB.PATHS_LIBRARY,
    isResourceLibraryActive: activeTab === PATH_PAGE_TAB.RESOURCE_LIBRARY,
  };
}
