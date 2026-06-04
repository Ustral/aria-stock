/* ============================================================
   Reference data context — categories / suppliers / locations
   served from the backend (HQ-editable), plus a catOf() helper.
   Lets leaf components (ItemThumb, filters, forms) read live
   reference data without prop-threading.
   ============================================================ */
import React from "react";

const RefDataCtx = React.createContext({ categories: [], suppliers: [], locations: [], departments: [], catOf: () => fallbackCat("?") });

function fallbackCat(id) {
  return { id, th: id || "—", en: id || "—", color: "#8b95a4", soft: "rgba(139,149,164,0.12)", icon: "📦" };
}

export function RefDataProvider({ categories, suppliers, locations, departments, children }) {
  const value = React.useMemo(() => {
    const map = new Map((categories || []).map((c) => [c.id, c]));
    return {
      categories: categories || [],
      suppliers: suppliers || [],
      locations: locations || [],
      departments: departments || [],
      catOf: (id) => map.get(id) || fallbackCat(id),
    };
  }, [categories, suppliers, locations, departments]);
  return <RefDataCtx.Provider value={value}>{children}</RefDataCtx.Provider>;
}

export function useRefData() { return React.useContext(RefDataCtx); }
