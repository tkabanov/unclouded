/** Bubble option set: path_page_tab_os (Path Page Tab OS) */

export const PATH_PAGE_TAB_OPTION_SET_ID = "path_page_tab_os" as const;

export const PATH_PAGE_TAB = {
  /** bTIsz */
  MY_PATHS: "my_paths_",
  /** bTItA */
  PATHS_LIBRARY: "paths_library",
} as const;

export type PathPageTabSlug = (typeof PATH_PAGE_TAB)[keyof typeof PATH_PAGE_TAB];

/** Display strings from ir/inventory.json → path_page_tab_os */
export const PATH_PAGE_TAB_LABELS: Record<PathPageTabSlug, string> = {
  my_paths_: "My Paths", // bTIsz
  paths_library: "Paths Library", // bTItA
};

export const PATH_PAGE_TAB_ORDER: readonly PathPageTabSlug[] = [
  PATH_PAGE_TAB.MY_PATHS,
  PATH_PAGE_TAB.PATHS_LIBRARY,
];
