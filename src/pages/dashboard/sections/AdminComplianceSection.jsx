import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetParentComplianceListQuery } from "../../../api/adminApi";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const FILTER_KEYS = [
  { key: "all",           tKey: "legalCompliance.filter.all" },
  { key: "non_compliant", tKey: "legalCompliance.filter.nonCompliant" },
];

const ComplianceBadge = ({ ok }) => {
  const { t } = useTranslation("adminDashboard");
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      {t("legalCompliance.badge.upToDate")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      {t("legalCompliance.badge.needsUpdate")}
    </span>
  );
};

const AdminComplianceSection = () => {
  const { t } = useTranslation("adminDashboard");

  // UI state — drives query args
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [page,        setPage]        = useState(1);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryParams = { page, filter, ...(search.trim() ? { search: search.trim() } : {}) };
  const { data: result, isLoading, isFetching } = useGetParentComplianceListQuery(queryParams);

  const rows = result?.data ?? [];
  const total              = result?.total ?? 0;
  const pages              = result?.pages ?? 1;
  const currentPage        = result?.page  ?? page;
  const currentPpVersion   = result?.current_pp_version  ?? null;
  const currentTcVersion   = result?.current_tc_version  ?? null;

  const loading = isLoading || isFetching;

  const handleFilter = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (e) => { setSearchInput(e.target.value); setPage(1); };

  const nonCompliantCount = rows.filter((p) => !p.compliant).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t("legalCompliance.pageTitle")}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-0.5">{t("legalCompliance.pageSubtitle")}</p>
        </div>
        {/* Current versions */}
        <div className="flex items-center gap-2 text-xs">
          {currentPpVersion && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dfe2d7]/40 border border-[#c5ceba] text-[#5e6d5b] font-medium">
              Privacy Policy:
              <span className="text-[#445446] font-semibold">{currentPpVersion}</span>
            </span>
          )}
          {currentTcVersion && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dfe2d7]/40 border border-[#c5ceba] text-[#5e6d5b] font-medium">
              Terms & Conditions:
              <span className="text-[#445446] font-semibold">{currentTcVersion}</span>
            </span>
          )}
        </div>
      </div>

      {/* Filters — unified box */}
      <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={t("legalCompliance.searchPlaceholder")}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#c5ceba] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
            />
          </div>
          <div className="inline-flex items-center border border-[#c5ceba] rounded-xl p-1 gap-0.5">
            {FILTER_KEYS.map(({ key, tKey }) => (
              <button
                key={key}
                onClick={() => handleFilter(key)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  filter === key
                    ? "bg-[#445446] text-white shadow-sm"
                    : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
                }`}
              >
                {t(tKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stat */}
      {!loading && filter === "all" && (
        <div className="mb-4 flex items-center gap-4 text-sm">
          <span className="text-[#5e6d5b]">
            <span className="font-semibold text-[#445446]">{total}</span>{" "}
            {t("legalCompliance.summary.parent", { count: total })}
          </span>
          {nonCompliantCount > 0 && (
            <span className="font-medium text-red-600">
              {t("legalCompliance.summary.nonCompliant", { count: nonCompliantCount })}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#445446]">
              {filter === "non_compliant" ? t("legalCompliance.allCompliant") : t("legalCompliance.noParents")}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#445446] border-b border-[#3a4a3b]">
                {[
                  t("legalCompliance.col.parent"),
                  t("legalCompliance.col.privacyPolicy"),
                  t("legalCompliance.col.terms"),
                  t("legalCompliance.col.overall"),
                  "",
                ].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-white uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe2d7]">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-[#dfe2d7]/50 transition-colors">
                  {/* Parent */}
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#1F2933]">{p.name || "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t("legalCompliance.joined", { date: formatDate(p.created_at) })}
                    </p>
                  </td>
                  {/* PP */}
                  <td className="px-5 py-3.5">
                    <ComplianceBadge ok={p.pp_compliant} />
                    <p className="text-xs text-gray-400 mt-1.5">
                      {p.pp_version
                        ? t("legalCompliance.accepted", { version: p.pp_version, date: formatDate(p.pp_accepted_at) })
                        : t("legalCompliance.neverAccepted")}
                    </p>
                    {!p.pp_compliant && currentPpVersion && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {t("legalCompliance.current", { version: currentPpVersion })}
                      </p>
                    )}
                  </td>
                  {/* TC */}
                  <td className="px-5 py-3.5">
                    <ComplianceBadge ok={p.tc_compliant} />
                    <p className="text-xs text-gray-400 mt-1.5">
                      {p.tc_version
                        ? t("legalCompliance.accepted", { version: p.tc_version, date: formatDate(p.tc_accepted_at) })
                        : t("legalCompliance.neverAccepted")}
                    </p>
                    {!p.tc_compliant && currentTcVersion && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {t("legalCompliance.current", { version: currentTcVersion })}
                      </p>
                    )}
                  </td>
                  {/* Overall */}
                  <td className="px-5 py-3.5">
                    <ComplianceBadge ok={p.compliant} />
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/dashboard/admin/parents/${p.id}`}
                      className="text-xs font-medium text-[#445446] hover:underline"
                    >
                      {t("legalCompliance.viewProfile")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {t("legalCompliance.pagination.page", { page: currentPage, pages })}{" "}·{" "}
            {total} {t("legalCompliance.pagination.result", { count: total })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("legalCompliance.pagination.previous")}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage === pages}
              className="px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("legalCompliance.pagination.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplianceSection;
