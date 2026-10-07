import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  FolderPlus,
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Folder,
  FileText,
  Download,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  Database,
  Archive,
} from 'lucide-react';
import { AppDatabase } from '../types';
import {
  initAuth,
  googleSignIn,
  logoutGoogleDrive,
  getAccessToken,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  downloadDriveFileText,
  deleteDriveFile,
  DriveFileItem,
} from '../googleDrive';
import { generateCompleteFolderZipBlob } from '../downloadPackage';
import { formatDate } from '../utils';

interface GoogleDriveViewProps {
  db: AppDatabase;
  onRestoreDatabase: (newDb: AppDatabase) => void;
  onShowToast: (text: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  db,
  onRestoreDatabase,
  onShowToast,
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id?: string; name: string }[]>([
    { id: undefined, name: 'My Google Drive' },
  ]);

  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mandatory Explicit Confirmation Modal State for Mutating/Destructive Google Drive Operations
  const [driveConfirmModal, setDriveConfirmModal] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, accessToken) => {
        setGoogleUser(u);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadFiles = async (overrideToken?: string, folderId = currentFolderId, query = searchQuery) => {
    const activeToken = overrideToken || token || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingFiles(true);
    setErrorMsg('');
    try {
      const items = await listDriveFiles(activeToken, query, folderId);
      setFiles(items);
    } catch (err: any) {
      console.error('Failed to list Google Drive files:', err);
      setErrorMsg(err?.message || 'Failed to load files from Google Drive.');
      if (String(err?.message || '').includes('401')) {
        setNeedsAuth(true);
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!needsAuth && token) {
      loadFiles(token, currentFolderId, searchQuery);
    }
  }, [needsAuth, token, currentFolderId]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
        setNeedsAuth(false);
        onShowToast(`Connected to Google Drive as ${result.user.email}`);
        await loadFiles(result.accessToken, currentFolderId, searchQuery);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setErrorMsg(err?.message || 'Google Sign-In failed or popup was closed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogleDrive();
    setToken(null);
    setGoogleUser(null);
    setNeedsAuth(true);
    setFiles([]);
    onShowToast('Disconnected from Google Drive.');
  };

  const handleNavigateFolder = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setFolderBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = folderBreadcrumbs[index];
    setCurrentFolderId(target.id);
    setFolderBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // Create Folder (with confirmation)
  const handleRequestCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    setDriveConfirmModal({
      title: `Create Folder "${cleanName}" in Google Drive?`,
      description: `This will create a new folder named "${cleanName}" inside "${
        folderBreadcrumbs[folderBreadcrumbs.length - 1].name
      }" in your Google Drive.`,
      confirmLabel: 'Create Folder',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          await createDriveFolder(activeToken, cleanName, currentFolderId);
          setNewFolderName('');
          onShowToast(`Folder "${cleanName}" created in Google Drive.`);
          await loadFiles(activeToken);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to create folder.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
        }
      },
    });
  };

  // Upload Full Database Backup JSON to Google Drive (with confirmation)
  const handleRequestUploadDatabaseBackup = () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `SOL_Cleaning_Materials_Backup_${dateStamp}.json`;

    setDriveConfirmModal({
      title: `Upload Database Backup "${fileName}" to Google Drive?`,
      description: `This will upload your complete SOL Cleaning Materials JSON database (${db.quotations.length} quotations, ${db.suppliers.length} suppliers, ${db.products.length} products) to "${
        folderBreadcrumbs[folderBreadcrumbs.length - 1].name
      }" in your Google Drive.`,
      confirmLabel: 'Confirm Upload to Drive',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          const jsonContent = JSON.stringify(db, null, 2);
          await uploadFileToDrive(
            activeToken,
            fileName,
            'application/json',
            jsonContent,
            currentFolderId
          );
          onShowToast(`Uploaded ${fileName} to Google Drive!`);
          await loadFiles(activeToken);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to upload database backup.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
        }
      },
    });
  };

  // Upload Complete System Folder Package (.ZIP) to Google Drive (with confirmation)
  const handleRequestUploadCompleteZip = () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `SOL_CLEANING_MATERIALS_COMPLETE_FOLDER_${dateStamp}.zip`;

    setDriveConfirmModal({
      title: `Upload Complete System Package "${fileName}" to Google Drive?`,
      description: `This will bundle all system files (JSON backups, 7 Excel/CSV reports, and complete React/TypeScript source code) into "${fileName}" and upload it to "${
        folderBreadcrumbs[folderBreadcrumbs.length - 1].name
      }" in your Google Drive.`,
      confirmLabel: 'Confirm ZIP Upload to Drive',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          const { blob, fileName: zipName } = await generateCompleteFolderZipBlob(db);
          await uploadFileToDrive(
            activeToken,
            zipName,
            'application/zip',
            blob,
            currentFolderId
          );
          onShowToast(`Uploaded ${zipName} to Google Drive!`);
          await loadFiles(activeToken);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to upload ZIP package to Google Drive.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
        }
      },
    });
  };

  // Upload Local File from Computer to Google Drive (with confirmation)
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDriveConfirmModal({
      title: `Upload "${file.name}" to Google Drive?`,
      description: `Are you sure you want to upload "${file.name}" (${(file.size / 1024).toFixed(
        1
      )} KB) to "${folderBreadcrumbs[folderBreadcrumbs.length - 1].name}" in your Google Drive?`,
      confirmLabel: 'Upload File',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          await uploadFileToDrive(
            activeToken,
            file.name,
            file.type || 'application/octet-stream',
            file,
            currentFolderId
          );
          onShowToast(`Uploaded "${file.name}" to Google Drive.`);
          await loadFiles(activeToken);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to upload file.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
          e.target.value = '';
        }
      },
    });
  };

  // Restore App Database from a JSON file in Google Drive (with confirmation)
  const handleRequestRestoreFromDriveJson = (file: DriveFileItem) => {
    setDriveConfirmModal({
      title: `Restore System Database from "${file.name}"?`,
      description: `This will download "${file.name}" from your Google Drive and replace the current local application database with its records.`,
      confirmLabel: 'Confirm Restore',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          const text = await downloadDriveFileText(activeToken, file.id);
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.quotations) && Array.isArray(parsed.products)) {
            onRestoreDatabase(parsed as AppDatabase);
            onShowToast(`Database restored from Google Drive file "${file.name}"!`);
          } else {
            setErrorMsg(
              `File "${file.name}" is not a valid SOL Cleaning Materials database backup JSON.`
            );
          }
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to restore JSON from Google Drive.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
        }
      },
    });
  };

  // Delete a File/Folder from Google Drive (Mandatory Confirmation Dialog)
  const handleRequestDeleteDriveFile = (file: DriveFileItem) => {
    setDriveConfirmModal({
      title: `Delete "${file.name}" from Google Drive?`,
      description: `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      isDanger: true,
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        setIsUploading(true);
        try {
          await deleteDriveFile(activeToken, file.id);
          onShowToast(`Deleted "${file.name}" from Google Drive.`);
          await loadFiles(activeToken);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to delete file from Google Drive.');
        } finally {
          setIsUploading(false);
          setDriveConfirmModal(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Google Drive Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8B0000]/10 border border-[#8B0000]/30 flex items-center justify-center text-[#8B0000]">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Google Drive Cloud Storage & Backup Hub
            </h2>
            <p className="text-xs text-neutral-500">
              Sync SOL Cleaning Materials backups, complete ZIP packages, supplier quotations, and spreadsheets directly with your Google Drive
            </p>
          </div>
        </div>

        {!needsAuth && googleUser && (
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <div className="font-bold text-neutral-900">{googleUser.displayName || 'Google User'}</div>
              <div className="font-mono text-[11px] text-emerald-700">{googleUser.email}</div>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignOut}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Drive</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg text-xs text-red-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="font-bold underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Official Sign in with Google View when not authenticated */}
      {needsAuth ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center max-w-xl mx-auto my-6 space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
            <Cloud className="w-7 h-7 text-[#8B0000]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-neutral-900">
              Connect Your Google Drive Account
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
              Sign in with Google to browse your Google Drive folders, upload complete SOL Cleaning Materials ZIP packages, save JSON database backups, or attach quotation documents.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={handleGoogleLogin}
              className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-full shadow-sm font-medium text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                <div className="gsi-material-button-icon w-5 h-5">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-semibold">
                  {isLoggingIn ? 'Connecting to Google Drive...' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Cloud Backup & Upload Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#8B0000] uppercase">
                  <Archive className="w-4 h-4" />
                  <span>1. Upload Complete System Folder (.ZIP)</span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Bundles all JSON backups, 7 Excel/CSV reports, and complete React/TS source code into one ZIP file and saves it to your current Google Drive folder.
                </p>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRequestUploadCompleteZip}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Save Complete Folder (.ZIP) to Google Drive</span>
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-900 uppercase">
                  <Database className="w-4 h-4 text-[#D4AF37]" />
                  <span>2. Cloud Database Backup (.JSON)</span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Saves a live snapshot of all quotations, suppliers, products, inventory stock movements, and audit logs to Google Drive.
                </p>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRequestUploadDatabaseBackup}
                className="w-full py-2.5 px-4 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Backup Database JSON to Google Drive</span>
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-900 uppercase">
                  <FolderPlus className="w-4 h-4 text-neutral-700" />
                  <span>3. Create Folder or Upload File</span>
                </div>
                <form onSubmit={handleRequestCreateFolder} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New Drive folder name..."
                    className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={isUploading || !newFolderName.trim()}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    + Folder
                  </button>
                </form>
              </div>

              <label className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#8B0000]" />
                <span>Upload Local PDF / Excel / Image to Drive</span>
                <input
                  type="file"
                  onChange={handleLocalFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Google Drive File Browser Table */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              {/* Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                {folderBreadcrumbs.map((bc, idx) => (
                  <React.Fragment key={bc.id || 'root'}>
                    {idx > 0 && <span className="text-neutral-400">/</span>}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`px-2 py-1 rounded hover:bg-neutral-100 cursor-pointer ${
                        idx === folderBreadcrumbs.length - 1
                          ? 'text-[#8B0000] font-extrabold'
                          : 'text-neutral-600'
                      }`}
                    >
                      {bc.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    loadFiles( undefined, currentFolderId, searchQuery);
                  }}
                  className="relative"
                >
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files in Drive..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </form>
                <button
                  type="button"
                  onClick={() => loadFiles()}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-3 px-4">File / Folder Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Last Modified</th>
                    <th className="py-3 px-4 text-right">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {isLoadingFiles ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-neutral-500">
                        Loading files from Google Drive...
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-neutral-500">
                        No files found in this Google Drive folder.
                      </td>
                    </tr>
                  ) : (
                    files.map((f) => {
                      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
                      const isJsonBackup =
                        f.name.toLowerCase().endsWith('.json') ||
                        f.mimeType === 'application/json';
                      return (
                        <tr key={f.id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 font-semibold text-neutral-900">
                            {isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleNavigateFolder(f)}
                                className="inline-flex items-center gap-2 text-[#8B0000] hover:underline cursor-pointer"
                              >
                                <Folder className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                                <span>{f.name}</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <FileText className="w-4 h-4 text-neutral-500" />
                                <span>{f.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                            {isFolder ? 'Folder' : f.mimeType}
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-600">
                            {f.modifiedTime ? formatDate(f.modifiedTime.split('T')[0]) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-neutral-600">
                            {f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {isJsonBackup && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestRestoreFromDriveJson(f)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  title="Restore App Database from this JSON Backup"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Restore DB</span>
                                </button>
                              )}
                              {f.webViewLink && (
                                <a
                                  href={f.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Open</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteDriveFile(f)}
                                className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete from Google Drive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Mandatory User Confirmation Dialog for Mutating / Destructive Google Drive Operations */}
      {driveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  driveConfirmModal.isDanger ? 'text-red-600' : 'text-[#8B0000]'
                }`}
              />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {driveConfirmModal.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  {driveConfirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-neutral-200">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setDriveConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={driveConfirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer ${
                  driveConfirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#8B0000] hover:bg-[#6E0000]'
                }`}
              >
                {isUploading ? 'Processing...' : driveConfirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
