// src/pages/ClassesPage.tsx
import { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { uploadStudentsCsv, getClasses } from "../api/client";

export default function ClassesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);

  // load classes from backend
  useEffect(() => {
    const run = async () => {
      try {
        setClassesLoading(true);
        setClassesError(null);
        const cls = await getClasses();
        setClasses(cls);
      } catch (err: any) {
        console.error(err);
        setClassesError(err.message || "Failed to load classes");
      } finally {
        setClassesLoading(false);
      }
    };
    run();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Pick a students_master.csv file first.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploadLoading(true);

    try {
      const res = await uploadStudentsCsv(selectedFile);
      setUploadSuccess(`Uploaded ${res.rows} students. File saved on backend.`);

      // refresh classes list after upload
      const cls = await getClasses();
      setClasses(cls);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Upload students_master.csv card */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        <h2 className="text-lg font-semibold mb-1">
          Upload students_master.csv
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          This will replace the master student roster used for matching and
          class dashboards.
        </p>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex-1">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block text-sm text-slate-200"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required columns: student_id, name, email, phone, class_id
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploadLoading}
            className="px-4 py-2 text-xs rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600"
          >
            {uploadLoading ? "Uploading..." : "Save master file"}
          </button>
        </div>

        {uploadError && (
          <p className="mt-2 text-xs text-red-400 font-semibold">
            {uploadError}
          </p>
        )}
        {uploadSuccess && (
          <p className="mt-2 text-xs text-emerald-400 font-semibold">
            {uploadSuccess}
          </p>
        )}
      </div>

      {/* Classes list */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        <h2 className="text-lg font-semibold mb-2">Classes</h2>
        <p className="text-xs text-slate-400 mb-3">
          Pick a class to view its students, uploads, unmatched records, and
          summary.
        </p>

        {classesLoading && (
          <p className="text-xs text-slate-400">Loading classes...</p>
        )}
        {classesError && (
          <p className="text-xs text-red-400">{classesError}</p>
        )}

        {!classesLoading && classes.length === 0 && !classesError && (
          <p className="text-xs text-slate-400">
            No classes found. Upload a students_master.csv first.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {classes.map((cls) => (
            <Link
              key={cls.class_id}
              to={`/classes/${encodeURIComponent(cls.class_id)}`}
              className="block rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3 hover:border-blue-500 hover:bg-slate-900 transition"
            >
              <div className="text-sm font-semibold">{cls.class_id}</div>
              <div className="text-[11px] text-slate-400">
                {cls.total_students} students
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
