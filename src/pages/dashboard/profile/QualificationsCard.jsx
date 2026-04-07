import { useState, useRef } from "react";
import {
  addQualification,
  updateQualification,
  deleteQualification,
} from "../../../api/expertApi";
import { getDocumentUrl } from "../../../utils/imageUrl";

const QUAL_TYPES = [
  { value: "LACTATION_CONSULTANT", label: "Lactation Consultant (IBCLC)" },
  { value: "BREASTFEEDING_COUNSELLOR", label: "Breastfeeding Counsellor" },
  { value: "INFANT_SLEEP_CONSULTANT", label: "Infant Sleep Consultant" },
  { value: "DOULA", label: "Doula" },
  { value: "MIDWIFE", label: "Midwife" },
  { value: "BABY_OSTEOPATH", label: "Baby Osteopath" },
  { value: "PAEDIATRIC_NUTRITIONIST", label: "Paediatric Nutritionist" },
  { value: "EARLY_YEARS_SPECIALIST", label: "Early Years Specialist" },
  { value: "POSTNATAL_PHYSIOTHERAPIST", label: "Postnatal Physiotherapist" },
  { value: "PARENTING_COACH", label: "Parenting Coach" },
  { value: "OTHER", label: "Other" },
];

const QUAL_LABEL = Object.fromEntries(
  QUAL_TYPES.map((q) => [q.value, q.label])
);

const DOC_TYPES = "application/pdf,image/jpeg,image/jpg,image/png";
const DOC_MAX = 5 * 1024 * 1024;

const EMPTY_FORM = { type: "", custom_name: "", document: null };

// ─── Small shared atoms ────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const DocBadge = ({ url }) => {
  if (!url)
    return <span className="text-xs text-gray-400 italic">No document</span>;
  const full = getDocumentUrl(url);
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <a
      href={full}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[#445446] hover:underline"
    >
      {isPdf ? (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M7 11.5h2v1H7v-1Zm0 2.5h2v1H7v-1Zm3-2.5h2v1h-2v-1Zm0 2.5h2v1h-2v-1Z" />
          <path
            fillRule="evenodd"
            d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4Zm2 0h10v16H7V4Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"
          />
        </svg>
      )}
      View document
    </a>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const QualificationsCard = ({ initialData = [] }) => {
  const [items, setItems] = useState(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [docName, setDocName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ custom_name: "", document: null });
  const [editDocName, setEditDocName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  const inputClass = (err) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      err ? "border-red-400" : "border-[#E4E7E4]"
    }`;

  // ── Add form handlers ──────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > DOC_MAX) {
      setFormError("Document must be 5 MB or smaller.");
      return;
    }
    setForm((f) => ({ ...f, document: file }));
    setDocName(file.name);
    setFormError("");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.type) {
      setFormError("Please select a qualification type.");
      return;
    }
    if (form.type === "OTHER" && !form.custom_name.trim()) {
      setFormError("Please enter the qualification name.");
      return;
    }
    setSaving(true);
    try {
      const created = await addQualification({
        type: form.type,
        custom_name:
          form.type === "OTHER" ? form.custom_name.trim() : undefined,
        document: form.document || undefined,
      });
      setItems((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setDocName("");
      setShowForm(false);
    } catch (err) {
      setFormError(
        err?.response?.data?.error || "Failed to add qualification."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setDocName("");
    setFormError("");
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > DOC_MAX) {
      setEditError("Document must be 5 MB or smaller.");
      return;
    }
    setEditForm((f) => ({ ...f, document: file }));
    setEditDocName(file.name);
    setEditError("");
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditForm({ custom_name: q.custom_name || "", document: null });
    setEditDocName("");
    setEditError("");
    setConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ custom_name: "", document: null });
    setEditDocName("");
    setEditError("");
  };

  const handleUpdate = async (e, q) => {
    e.preventDefault();
    setEditError("");
    if (q.type === "OTHER" && !editForm.custom_name.trim()) {
      setEditError("Qualification name is required.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateQualification(q.id, {
        custom_name:
          q.type === "OTHER" ? editForm.custom_name.trim() : undefined,
        document: editForm.document || undefined,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === q.id ? updated : item))
      );
      cancelEdit();
    } catch (err) {
      setEditError(
        err?.response?.data?.error || "Failed to update qualification."
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteQualification(id);
      setItems((prev) => prev.filter((q) => q.id !== id));
      setConfirmId(null);
    } catch {
      // silently ignore — item remains in list
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933] flex items-center gap-1.5">
            Qualifications{" "}
            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">
              Public
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select your qualifications and upload supporting documents for admin
            review.
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Supporting documents optional · PDF, JPG, PNG · max 5 MB
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add
          </button>
        )}
      </div>

      {/* Existing qualifications */}
      {items.length > 0 && (
        <ul className="space-y-2 mb-4">
          {items.map((q) => (
            <li key={q.id}>
              {editingId === q.id ? (
                // ── Inline edit form ───────────────────────────────────────
                <form
                  onSubmit={(e) => handleUpdate(e, q)}
                  className="border border-[#445446]/30 rounded-xl p-4 space-y-3 bg-[#F5F7F5]"
                >
                  <p className="text-xs font-medium text-[#1F2933]">
                    Editing:{" "}
                    <span className="text-[#445446]">
                      {q.type === "OTHER"
                        ? "Other"
                        : QUAL_LABEL[q.type] || q.type}
                    </span>
                  </p>

                  {editError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}

                  {q.type === "OTHER" && (
                    <div>
                      <label className="block text-xs font-medium text-[#1F2933] mb-1">
                        Qualification name
                      </label>
                      <input
                        type="text"
                        value={editForm.custom_name}
                        onChange={(e) => {
                          setEditForm((f) => ({
                            ...f,
                            custom_name: e.target.value,
                          }));
                          setEditError("");
                        }}
                        placeholder="Enter your qualification"
                        className={inputClass(
                          !editForm.custom_name.trim() && !!editError
                        )}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#1F2933] mb-1">
                      Replace document{" "}
                      <span className="font-normal text-gray-400">
                        (leave empty to keep existing · PDF, JPG, PNG · max 5
                        MB)
                      </span>
                    </label>
                    {q.document_url && !editDocName && (
                      <div className="mb-1.5">
                        <DocBadge url={q.document_url} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileRef.current?.click()}
                        className="flex-shrink-0 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-2 rounded-lg transition-colors"
                      >
                        Choose file
                      </button>
                      <span className="text-xs text-gray-500 truncate">
                        {editDocName || (q.document_url ? q.document_url.split("/").pop() : "No file chosen")}
                      </span>
                    </div>
                    <input
                      ref={editFileRef}
                      type="file"
                      accept={DOC_TYPES}
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                  </div>

                  {!q.document_url && !editForm.document && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Adding a supporting document helps admins verify this entry faster.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {editSaving && <Spinner />}
                      {editSaving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                // ── Normal display ─────────────────────────────────────────
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1F2933] truncate">
                      {q.type === "OTHER"
                        ? q.custom_name
                        : QUAL_LABEL[q.type] || q.type}
                    </p>
                    <div className="mt-0.5">
                      <DocBadge url={q.document_url} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {confirmId !== q.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(q)}
                          className="p-1.5 text-gray-400 hover:text-[#445446] hover:bg-[#445446]/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(q.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {deletingId === q.id && <Spinner />}
                          {deletingId === q.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 py-2">
          No qualifications added yet.
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="border border-[#E4E7E4] rounded-xl p-4 space-y-3 mt-2"
        >
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#1F2933] mb-1">
              Qualification type
            </label>
            <select
              value={form.type}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  type: e.target.value,
                  custom_name: "",
                }));
                setFormError("");
              }}
              className={inputClass(!form.type && !!formError)}
            >
              <option value="">Select type…</option>
              {QUAL_TYPES.map((qt) => (
                <option key={qt.value} value={qt.value}>
                  {qt.label}
                </option>
              ))}
            </select>
          </div>

          {form.type === "OTHER" && (
            <div>
              <label className="block text-xs font-medium text-[#1F2933] mb-1">
                Qualification name
              </label>
              <input
                type="text"
                value={form.custom_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, custom_name: e.target.value }));
                  setFormError("");
                }}
                placeholder="Enter your qualification"
                className={inputClass(!form.custom_name.trim() && !!formError)}
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-2 rounded-lg transition-colors"
              >
                Choose file
              </button>
              <span className="text-xs text-gray-500 truncate">
                {docName || "No file chosen"}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={DOC_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {!form.document && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Adding a supporting document helps admins verify this entry faster.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelForm}
              className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Spinner />}
              {saving ? "Adding…" : "Add Qualification"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default QualificationsCard;
