import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidIBAN, electronicFormatIBAN } from "ibantools";
import { useSaveBusinessInfoMutation } from "../../../api/expertApi";

const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const ENTITY_TYPE_VALUES = ["INDIVIDUAL", "COMPANY"];

const EMPTY_FORM = {
  entity_type: "",
  legal_name: "",
  date_of_birth: "",
  address_street: "",
  address_city: "",
  address_postal_code: "",
  address_country: "",
  tin: "",
  vat_number: "",
  company_reg_number: "",
  iban: "",
  business_email: "",
  website: "",
  municipality: "",
  business_address: "",
};

const formatDate = (iso, lng = 'en') =>
  iso
    ? new Date(iso).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
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
  const { t, i18n } = useTranslation("expertDashboard");
  const lng = i18n.language;
  const [data, setData] = useState(initialData);
  const [showForm, setShowForm] = useState(!initialData);
  const [fieldErrors, setFieldErrors] = useState({});

  const [saveBusinessInfo, { isLoading: saving }] = useSaveBusinessInfoMutation();
  const [serverError, setServerError] = useState("");
  const [saved, setSaved]         = useState(false);

  const [form, setForm] = useState(
    initialData
      ? {
          entity_type: initialData.entity_type || "",
          legal_name: initialData.legal_name || "",
          date_of_birth: initialData.date_of_birth
            ? new Date(initialData.date_of_birth).toISOString().split("T")[0]
            : "",
          address_street: initialData.address_street || "",
          address_city: initialData.address_city || "",
          address_postal_code: initialData.address_postal_code || "",
          address_country: initialData.address_country || "",
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

  const inputClass = (field) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      fieldErrors[field] ? "border-red-400" : "border-[#E4E7E4]"
    }`;
  const labelClass = "block text-xs font-medium text-[#1F2933] mb-1";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setServerError("");

    const errs = {};
    if (!form.entity_type) errs.entity_type = t("profile.business.errors.entityTypeRequired");
    if (!form.legal_name.trim()) errs.legal_name = t("profile.business.errors.legalNameRequired");
    if (isIndividual && !form.date_of_birth) errs.date_of_birth = t("profile.business.errors.dobRequired");
    if (!form.address_street.trim()) errs.address_street = t("profile.business.errors.streetRequired");
    if (!form.address_city.trim()) errs.address_city = t("profile.business.errors.cityRequired");
    if (!form.address_postal_code.trim()) errs.address_postal_code = t("profile.business.errors.postalCodeRequired");
    if (!form.address_country.trim()) errs.address_country = t("profile.business.errors.countryRequired");
    if (!form.tin.trim()) errs.tin = t("profile.business.errors.tinRequired");
    if (isCompany && !form.vat_number.trim()) errs.vat_number = t("profile.business.errors.vatRequired");
    if (isCompany && !form.company_reg_number.trim()) errs.company_reg_number = t("profile.business.errors.companyRegRequired");
    if (!form.iban.trim()) {
      errs.iban = t("profile.business.errors.ibanRequired");
    } else if (!isValidIBAN(electronicFormatIBAN(form.iban.trim()) ?? "")) {
      errs.iban = t("profile.business.errors.ibanInvalid");
    }
    if (!form.business_email.trim()) errs.business_email = t("profile.business.errors.emailRequired");
    if (form.website.trim()) {
      try { new URL(form.website.trim()); } catch {
        errs.website = t("profile.business.errors.websiteInvalid");
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    try {
      const payload = {
        entity_type: form.entity_type,
        legal_name: form.legal_name.trim(),
        date_of_birth: isIndividual ? form.date_of_birth || null : null,
        address_street: form.address_street.trim(),
        address_city: form.address_city.trim(),
        address_postal_code: form.address_postal_code.trim(),
        address_country: form.address_country.trim(),
        tin: form.tin.trim(),
        vat_number: isCompany ? form.vat_number.trim() : null,
        company_reg_number: isCompany ? form.company_reg_number.trim() : null,
        iban: form.iban.trim(),
        business_email: form.business_email.trim(),
        website: form.website.trim(),
        municipality: form.municipality.trim() || null,
        business_address: form.business_address.trim() || null,
      };
      const updated = await saveBusinessInfo(payload).unwrap();
      setData(updated);
      setShowForm(false);
      setSaved(true);
      setFieldErrors({});
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setServerError(
        err?.data?.error || t("profile.business.errors.saveFailed")
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">
            {t("profile.business.title")}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("profile.business.subtitle")}
          </p>
        </div>
        {data && !showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFieldErrors({});
              setServerError("");
              setSaved(false);
            }}
            className="flex-shrink-0 ml-4 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("profile.business.editBtn")}
          </button>
        )}
      </div>

      {/* Saved success banner */}
      {saved && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-green-800">
            {t("profile.business.savedMsg")}
          </p>
        </div>
      )}

      {/* Read-only view */}
      {data && !showForm && (
        <div className="mt-4">
          <div className="px-1">
            <InfoRow
              label={t("profile.business.infoRows.entityType")}
              value={t("profile.business.entityTypes." + data.entity_type)}
            />
            <InfoRow label={t("profile.business.infoRows.legalName")} value={data.legal_name} />
            {data.entity_type === "INDIVIDUAL" && (
              <InfoRow
                label={t("profile.business.infoRows.dateOfBirth")}
                value={formatDate(data.date_of_birth, lng)}
              />
            )}
            <InfoRow label={t("profile.business.infoRows.street")} value={data.address_street} />
            <InfoRow label={t("profile.business.infoRows.city")} value={data.address_city} />
            <InfoRow label={t("profile.business.infoRows.postalCode")} value={data.address_postal_code} />
            <InfoRow label={t("profile.business.infoRows.country")} value={data.address_country} />
            <InfoRow label={t("profile.business.infoRows.tin")} value={data.tin} />
            {data.entity_type === "COMPANY" && (
              <InfoRow label={t("profile.business.infoRows.vatNumber")} value={data.vat_number} />
            )}
            {data.entity_type === "COMPANY" && (
              <InfoRow
                label={t("profile.business.infoRows.companyReg")}
                value={data.company_reg_number}
              />
            )}
            <InfoRow label={t("profile.business.infoRows.iban")} value={data.iban} />
            <InfoRow label={t("profile.business.infoRows.email")} value={data.business_email} />
            <InfoRow label={t("profile.business.infoRows.website")} value={data.website} />
            {data.municipality && (
              <InfoRow label={t("profile.business.infoRows.municipality")} value={data.municipality} />
            )}
            {data.business_address && (
              <InfoRow label={t("profile.business.infoRows.businessAddress")} value={data.business_address} />
            )}
          </div>
        </div>
      )}

      {/* Empty state prompt */}
      {!data && !showForm && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-700">
            {t("profile.business.missingMsg")}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="ml-auto flex-shrink-0 text-xs font-medium text-amber-700 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("profile.business.addNow")}
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mt-4 border border-[#E4E7E4] rounded-xl p-4 space-y-4"
        >
          {serverError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          {/* Entity type */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.entityTypeLabel")} <span className="text-red-500">*</span>
            </label>
            <select
              name="entity_type"
              value={form.entity_type}
              onChange={handleChange}
              className={inputClass("entity_type")}
            >
              <option value="">{t("profile.business.form.entityTypePlaceholder")}</option>
              {ENTITY_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t("profile.business.entityTypes." + v)}
                </option>
              ))}
            </select>
            {fieldErrors.entity_type && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.entity_type}</p>}
          </div>

          {/* Legal name */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.legalNameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="legal_name"
              value={form.legal_name}
              onChange={handleChange}
              placeholder={t("profile.business.form.legalNamePlaceholder")}
              className={inputClass("legal_name")}
            />
            {fieldErrors.legal_name && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.legal_name}</p>}
          </div>

          {/* Date of birth — individual only */}
          {isIndividual && (
            <div>
              <label className={labelClass}>
                {t("profile.business.form.dobLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className={`${inputClass("date_of_birth")} uppercase`}
              />
              {fieldErrors.date_of_birth && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.date_of_birth}</p>}
            </div>
          )}

          {/* Structured address */}
          <div>
            <label className={labelClass}>
              {isCompany ? t("profile.business.form.registeredAddress") : t("profile.business.form.primaryAddress")} <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  name="address_street"
                  value={form.address_street}
                  onChange={handleChange}
                  placeholder={t("profile.business.form.streetPlaceholder")}
                  className={inputClass("address_street")}
                />
                {fieldErrors.address_street && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.address_street}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    name="address_city"
                    value={form.address_city}
                    onChange={handleChange}
                    placeholder={t("profile.business.form.cityPlaceholder")}
                    className={inputClass("address_city")}
                  />
                  {fieldErrors.address_city && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.address_city}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    name="address_postal_code"
                    value={form.address_postal_code}
                    onChange={handleChange}
                    placeholder={t("profile.business.form.postalCodePlaceholder")}
                    className={inputClass("address_postal_code")}
                  />
                  {fieldErrors.address_postal_code && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.address_postal_code}</p>}
                </div>
              </div>
              <div>
                <input
                  type="text"
                  name="address_country"
                  value={form.address_country}
                  onChange={handleChange}
                  placeholder={t("profile.business.form.countryPlaceholder")}
                  className={inputClass("address_country")}
                />
                {fieldErrors.address_country && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.address_country}</p>}
              </div>
            </div>
          </div>

          {/* TIN */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.tinLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tin"
              value={form.tin}
              onChange={handleChange}
              placeholder={t("profile.business.form.tinPlaceholder")}
              className={inputClass("tin")}
            />
            {fieldErrors.tin && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.tin}</p>}
          </div>

          {/* VAT number — company only */}
          {isCompany && (
            <div>
              <label className={labelClass}>
                {t("profile.business.form.vatLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vat_number"
                value={form.vat_number}
                onChange={handleChange}
                placeholder={t("profile.business.form.vatPlaceholder")}
                className={inputClass("vat_number")}
              />
              {fieldErrors.vat_number && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.vat_number}</p>}
            </div>
          )}

          {/* Company reg number — company only */}
          {isCompany && (
            <div>
              <label className={labelClass}>
                {t("profile.business.form.companyRegLabel")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_reg_number"
                value={form.company_reg_number}
                onChange={handleChange}
                placeholder={t("profile.business.form.companyRegPlaceholder")}
                className={inputClass("company_reg_number")}
              />
              {fieldErrors.company_reg_number && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.company_reg_number}</p>}
            </div>
          )}

          {/* IBAN */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.ibanLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="iban"
              value={form.iban}
              onChange={handleChange}
              placeholder={t("profile.business.form.ibanPlaceholder")}
              className={inputClass("iban")}
            />
            {fieldErrors.iban && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.iban}</p>}
            <p className="mt-1.5 text-xs text-gray-400">
              {t("profile.business.form.ibanNote")}{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-200"
              >
                {t("profile.business.form.ibanPrivacyLink")}
              </a>.
            </p>
          </div>

          {/* Email + website side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {t("profile.business.form.emailLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="business_email"
                value={form.business_email}
                onChange={handleChange}
                placeholder={t("profile.business.form.emailPlaceholder")}
                className={inputClass("business_email")}
              />
              {fieldErrors.business_email && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.business_email}</p>}
            </div>
            <div>
              <label className={labelClass}>
                {t("profile.business.form.websiteLabel")} <span className="text-gray-400 font-normal">{t("profile.business.form.websiteOptional")}</span>
              </label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder={t("profile.business.form.websitePlaceholder")}
                className={inputClass("website")}
              />
              {fieldErrors.website && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.website}</p>}
            </div>
          </div>

          {/* Municipality */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.municipalityLabel")}{" "}
              <span className="text-gray-400 font-normal">
                {t("profile.business.form.municipalityHint")}
              </span>
            </label>
            <input
              type="text"
              name="municipality"
              value={form.municipality}
              onChange={handleChange}
              placeholder={t("profile.business.form.municipalityPlaceholder")}
              className={inputClass("municipality")}
            />
          </div>

          {/* Business address — optional */}
          <div>
            <label className={labelClass}>
              {t("profile.business.form.businessAddressLabel")}{" "}
              <span className="text-gray-400 font-normal">
                {t("profile.business.form.businessAddressHint")}
              </span>
            </label>
            <textarea
              name="business_address"
              value={form.business_address}
              onChange={handleChange}
              rows={3}
              placeholder={t("profile.business.form.businessAddressPlaceholder")}
              className={`${inputClass("business_address")} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {data && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFieldErrors({});
                  setServerError("");
                }}
                className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("profile.business.form.cancelBtn")}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Spinner />}
              {saving
                ? t("profile.business.form.savingBtn")
                : data
                  ? t("profile.business.form.updateBtn")
                  : t("profile.business.form.saveBtn")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BusinessInfoCard;
