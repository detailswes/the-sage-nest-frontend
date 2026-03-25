import { useState } from "react";
import { saveBusinessInfo } from "../../../api/expertApi";

const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const ENTITY_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "COMPANY", label: "Company / Legal Entity" },
];

const EMPTY_FORM = {
  entity_type: "",
  legal_name: "",
  date_of_birth: "",
  primary_address: "",
  tin: "",
  vat_number: "",
  company_reg_number: "",
  iban: "",
  business_email: "",
  website: "",
  municipality: "",
  business_address: "",
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-[#F0F2F0] last:border-0">
    <span className="text-xs font-medium text-gray-400 sm:w-44 flex-shrink-0">
      {label}
    </span>
    <span className="text-sm text-[#1F2933] break-words">
      {value || <span className="text-gray-300 italic">—</span>}
    </span>
  </div>
);

const BusinessInfoCard = ({ initialData = null }) => {
  const [data, setData] = useState(initialData);
  const [showForm, setShowForm] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(
    initialData
      ? {
          entity_type: initialData.entity_type || "",
          legal_name: initialData.legal_name || "",
          date_of_birth: initialData.date_of_birth
            ? new Date(initialData.date_of_birth).toISOString().split("T")[0]
            : "",
          primary_address: initialData.primary_address || "",
          tin: initialData.tin || "",
          vat_number: initialData.vat_number || "",
          company_reg_number: initialData.company_reg_number || "",
          iban: initialData.iban || "",
          business_email: initialData.business_email || "",
          website: initialData.website || "",
          municipality: initialData.municipality || "",
          business_address: initialData.business_address || "",
        }
      : EMPTY_FORM
  );

  const isIndividual = form.entity_type === "INDIVIDUAL";
  const isCompany = form.entity_type === "COMPANY";

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]";
  const labelClass = "block text-xs font-medium text-[#1F2933] mb-1";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormError("");
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.entity_type) {
      setFormError("Entity type is required.");
      return;
    }
    if (!form.legal_name.trim()) {
      setFormError("Full legal name is required.");
      return;
    }
    if (isIndividual && !form.date_of_birth) {
      setFormError("Date of birth is required for individual experts.");
      return;
    }
    if (!form.primary_address.trim()) {
      setFormError("Primary address is required.");
      return;
    }
    if (!form.tin.trim()) {
      setFormError("Tax Identification Number (TIN) is required.");
      return;
    }
    if (isCompany && !form.company_reg_number.trim()) {
      setFormError(
        "Company registration number is required for legal entities."
      );
      return;
    }
    if (!form.iban.trim()) {
      setFormError("IBAN / bank account is required.");
      return;
    }
    if (!form.business_email.trim()) {
      setFormError("Email address is required.");
      return;
    }
    if (!form.website.trim()) {
      setFormError("Website is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entity_type: form.entity_type,
        legal_name: form.legal_name.trim(),
        date_of_birth: isIndividual ? form.date_of_birth || null : null,
        primary_address: form.primary_address.trim(),
        tin: form.tin.trim(),
        vat_number: form.vat_number.trim() || null,
        company_reg_number: isCompany ? form.company_reg_number.trim() : null,
        iban: form.iban.trim(),
        business_email: form.business_email.trim(),
        website: form.website.trim(),
        municipality: form.municipality.trim() || null,
        business_address: form.business_address.trim() || null,
      };
      const updated = await saveBusinessInfo(payload);
      setData(updated);
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setFormError(
        err?.response?.data?.error || "Failed to save business information."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933] flex items-center gap-1.5">
            Business Information <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-gray-100 text-gray-500 border border-gray-200 align-middle">Internal</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Information collected for compliance purposes
          </p>
        </div>
        {data && !showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError("");
              setSaved(false);
            }}
            className="flex-shrink-0 ml-4 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Saved success banner */}
      {saved && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
          <svg
            className="w-4 h-4 text-green-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-green-800">
            Business information saved.
          </p>
        </div>
      )}

      {/* Read-only view */}
      {data && !showForm && (
        <div className="mt-4">
          <div className="px-1">
            <InfoRow
              label="Entity type"
              value={
                data.entity_type === "INDIVIDUAL"
                  ? "Individual"
                  : "Company / Legal Entity"
              }
            />
            <InfoRow label="Full legal name" value={data.legal_name} />
            {data.entity_type === "INDIVIDUAL" && (
              <InfoRow
                label="Date of birth"
                value={formatDate(data.date_of_birth)}
              />
            )}
            <InfoRow label="Primary address" value={data.primary_address} />
            <InfoRow label="TIN" value={data.tin} />
            {data.vat_number && (
              <InfoRow label="VAT number" value={data.vat_number} />
            )}
            {data.entity_type === "COMPANY" && (
              <InfoRow
                label="Company reg. number"
                value={data.company_reg_number}
              />
            )}
            <InfoRow label="IBAN / Bank account" value={data.iban} />
            <InfoRow label="Email address" value={data.business_email} />
            <InfoRow label="Website" value={data.website} />
            {data.municipality && (
              <InfoRow label="Municipality" value={data.municipality} />
            )}
            {data.business_address && (
              <InfoRow label="Business address" value={data.business_address} />
            )}
          </div>
        </div>
      )}

      {/* Empty state prompt */}
      {!data && !showForm && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <svg
            className="w-4 h-4 text-amber-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-amber-700">
            Business information is required for onboarding. Please complete
            this section.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="ml-auto flex-shrink-0 text-xs font-medium text-amber-700 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Add now
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mt-4 border border-[#E4E7E4] rounded-xl p-4 space-y-4"
        >
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {/* Entity type */}
          <div>
            <label className={labelClass}>
              Entity type <span className="text-red-500">*</span>
            </label>
            <select
              name="entity_type"
              value={form.entity_type}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select type…</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Legal name */}
          <div>
            <label className={labelClass}>
              Full legal name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="legal_name"
              value={form.legal_name}
              onChange={handleChange}
              placeholder="Individual or business name as officially registered"
              className={inputClass}
            />
          </div>

          {/* Date of birth — individual only */}
          {isIndividual && (
            <div>
              <label className={labelClass}>
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className={inputClass}
              />
            </div>
          )}

          {/* Primary address */}
          <div>
            <label className={labelClass}>
              Primary address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="primary_address"
              value={form.primary_address}
              onChange={handleChange}
              rows={3}
              placeholder={
                isCompany
                  ? "Registered business address"
                  : "Residential address"
              }
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* TIN */}
          <div>
            <label className={labelClass}>
              Tax Identification Number (TIN){" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tin"
              value={form.tin}
              onChange={handleChange}
              placeholder="CPR (Denmark), PPS (Ireland), or national equivalent"
              className={inputClass}
            />
          </div>

          {/* VAT number — optional */}
          <div>
            <label className={labelClass}>
              VAT number{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="vat_number"
              value={form.vat_number}
              onChange={handleChange}
              placeholder="Leave blank if not applicable"
              className={inputClass}
            />
          </div>

          {/* Company reg number — company only */}
          {isCompany && (
            <div>
              <label className={labelClass}>
                Enterprise / Company registration number{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_reg_number"
                value={form.company_reg_number}
                onChange={handleChange}
                placeholder="Official company registration number"
                className={inputClass}
              />
            </div>
          )}

          {/* IBAN */}
          <div>
            <label className={labelClass}>
              IBAN / Bank account <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="iban"
              value={form.iban}
              onChange={handleChange}
              placeholder="e.g. IE64IRCE92050112345678"
              className={inputClass}
            />
          </div>

          {/* Email + website side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="business_email"
                value={form.business_email}
                onChange={handleChange}
                placeholder="business@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Website <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://www.example.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Municipality — Danish experts */}
          <div>
            <label className={labelClass}>
              Municipality of residence{" "}
              <span className="text-gray-400 font-normal">
                (required for Danish experts)
              </span>
            </label>
            <input
              type="text"
              name="municipality"
              value={form.municipality}
              onChange={handleChange}
              placeholder="e.g. Copenhagen"
              className={inputClass}
            />
          </div>

          {/* Business address — optional */}
          <div>
            <label className={labelClass}>
              Business address{" "}
              <span className="text-gray-400 font-normal">
                (optional — only if different from primary address)
              </span>
            </label>
            <textarea
              name="business_address"
              value={form.business_address}
              onChange={handleChange}
              rows={3}
              placeholder="Leave blank if same as primary address"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {data && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Spinner />}
              {saving ? "Saving…" : data ? "Update" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BusinessInfoCard;
