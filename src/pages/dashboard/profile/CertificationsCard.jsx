import { useState, useRef } from "react";
import {
  addCertification,
  updateCertification,
  deleteCertification,
} from "../../../api/expertApi";
import { getDocumentUrl } from "../../../utils/imageUrl";

const DOC_TYPES = "application/pdf,image/jpeg,image/jpg,image/png";
const DOC_MAX = 5 * 1024 * 1024;

const EMPTY_FORM = { name: "", document: null };

const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const DocBadge = ({ url }) => {
  if (!url)
    return <span className="text-xs text-gray-400 italic">No document</span>;
  return (
    <a
      href={getDocumentUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[#445446] hover:underline"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
        />
      </svg>
      View document
    </a>
  );
};

const CertificationsCard = ({ initialData = [] }) => {
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
  const [editForm, setEditForm] = useState({ name: "", document: null });
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
    if (!form.name.trim()) {
      setFormError("Certification name is required.");
      return;
    }
    setSaving(true);
    try {
      const created = await addCertification({
        name: form.name.trim(),
        document: form.document || undefined,
      });
      setItems((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setDocName("");
      setShowForm(false);
    } catch (err) {
      setFormError(
        err?.response?.data?.error || "Failed to add certification."
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

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, document: null });
    setEditDocName("");
    setEditError("");
    setConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", document: null });
    setEditDocName("");
    setEditError("");
  };

  const handleUpdate = async (e, c) => {
    e.preventDefault();
    setEditError("");
    if (!editForm.name.trim()) {
      setEditError("Certification name is required.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateCertification(c.id, {
        name: editForm.name.trim(),
        document: editForm.document || undefined,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === c.id ? updated : item))
      );
      cancelEdit();
    } catch (err) {
      setEditError(
        err?.response?.data?.error || "Failed to update certification."
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteCertification(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      setConfirmId(null);
    } catch {
      /* keep item */
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933] flex items-center gap-1.5">
            Certifications{" "}
            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">
              Public
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Additional training or certifications that build parent trust.
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

      {items.length > 0 && (
        <ul className="space-y-2 mb-4">
          {items.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                // ── Inline edit form ───────────────────────────────────────
                <form
                  onSubmit={(e) => handleUpdate(e, c)}
                  className="border border-[#445446]/30 rounded-xl p-4 space-y-3 bg-[#F5F7F5]"
                >
                  {editError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#1F2933] mb-1">
                      Certification name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, name: e.target.value }));
                        setEditError("");
                      }}
                      placeholder="e.g. First Aid Certificate"
                      className={inputClass(
                        !editForm.name.trim() && !!editError
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1F2933] mb-1">
                      Replace document{" "}
                      <span className="font-normal text-gray-400">
                        (leave empty to keep existing · PDF, JPG, PNG · max 5
                        MB)
                      </span>
                    </label>
                    {c.document_url && !editDocName && (
                      <div className="mb-1.5">
                        <DocBadge url={c.document_url} />
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
                        {editDocName || (c.document_url ? c.document_url.split("/").pop() : "No file chosen")}
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

                  {!c.document_url && !editForm.document && (
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
                      {c.name}
                    </p>
                    <div className="mt-0.5">
                      <DocBadge url={c.document_url} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {confirmId !== c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
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
                          onClick={() => setConfirmId(c.id)}
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
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {deletingId === c.id && <Spinner />}
                          {deletingId === c.id ? "Removing…" : "Remove"}
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
          No certifications added yet.
        </p>
      )}

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
              Certification name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setFormError("");
              }}
              placeholder="e.g. First Aid Certificate"
              className={inputClass(!form.name.trim() && !!formError)}
            />
          </div>
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
              {saving ? "Adding…" : "Add Certification"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CertificationsCard;
