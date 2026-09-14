import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Volume2, 
  Plus, 
  Check, 
  Play, 
  Pause, 
  Link as LinkIcon, 
  Search,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { MediaAsset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { loadMediaAssets, addMediaAsset, deleteMediaAsset } from '../utils/storage';
import { 
  saveMediaToDb, 
  getAllMediaFromDb, 
  deleteMediaFromDb, 
  resolveMediaUrl 
} from '../utils/mediaDb';
import { ConfirmModal } from './ConfirmModal';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: MediaAsset) => void;
  initialTab?: 'all' | 'image' | 'audio';
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  initialTab = 'all',
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'audio'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Form State
  const [uploadType, setUploadType] = useState<'image' | 'audio'>('image');
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'tts'>('file');
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deletion confirm modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Audio Playback
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Resolved URL cache for display (blob/idb URLs)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Sync / Load Assets from IndexedDB (with LocalStorage fallback)
  const refreshAssets = async () => {
    try {
      const dbAssets = await getAllMediaFromDb();
      if (dbAssets.length > 0) {
        setAssets(dbAssets);
      } else {
        // Fallback: seed with existing local storage assets
        const localAssets = loadMediaAssets();
        for (const la of localAssets) {
          await saveMediaToDb({
            id: la.id,
            type: la.type,
            name: la.name,
            onlineUrl: la.url.startsWith('http') ? la.url : undefined,
            dataUrl: la.url.startsWith('data:') ? la.url : undefined,
          });
        }
        const updatedDbAssets = await getAllMediaFromDb();
        setAssets(updatedDbAssets.length > 0 ? updatedDbAssets : localAssets);
      }
    } catch {
      setAssets(loadMediaAssets());
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshAssets();
      setActiveTab(initialTab);
      setIsUploading(false);
      setErrorMessage(null);
      resetUploadForm();
    } else {
      stopAudio();
    }
  }, [isOpen, initialTab]);

  // Resolve URLs for visual rendering
  useEffect(() => {
    let isCancelled = false;
    const resolveAll = async () => {
      const resolved: Record<string, string> = {};
      for (const a of assets) {
        if (a.url) {
          const url = await resolveMediaUrl(a.url);
          if (url) resolved[a.id] = url;
        }
      }
      if (!isCancelled) {
        setResolvedUrls(resolved);
      }
    };
    if (assets.length > 0) {
      resolveAll();
    }
    return () => {
      isCancelled = true;
    };
  }, [assets]);

  const resetUploadForm = () => {
    setAssetName('');
    setAssetUrl('');
    setTtsText('');
    setPreviewDataUrl(null);
    setSelectedFile(null);
    setUploadMode('file');
    setErrorMessage(null);
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingAssetId(null);
  };

  const playAudio = async (asset: MediaAsset) => {
    if (playingAssetId === asset.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPlayingAssetId(asset.id);

    // Resolve URL (handles online url, object url, or IndexedDB blob)
    const playableUrl = await resolveMediaUrl(asset.url);

    if (playableUrl) {
      try {
        const audio = new Audio(playableUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setPlayingAssetId(null);
        audio.onerror = () => {
          setErrorMessage('Không thể phát file âm thanh này.');
          setPlayingAssetId(null);
        };
        await audio.play();
      } catch (err) {
        console.warn('Audio playback error:', err);
        setPlayingAssetId(null);
      }
    } else if ('speechSynthesis' in window) {
      // Fallback TTS
      const textToSpeak = asset.name;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAssetId(null);
      utterance.onerror = () => setPlayingAssetId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAssetId(null);
    }
  };

  // Handle Local File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Max 150MB limit for IndexedDB storage
    if (file.size > 150 * 1024 * 1024) {
      setErrorMessage('Dung lượng tệp tối đa là 150MB.');
      return;
    }

    setSelectedFile(file);

    if (!assetName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setAssetName(cleanName);
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Audio or other media: use fast Object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewDataUrl(previewUrl);
    }
  };

  // Save new asset to library via IndexedDB
  const handleSaveNewAsset = async () => {
    setErrorMessage(null);
    const finalName = assetName.trim() || (uploadType === 'image' ? 'Hình ảnh bài học' : 'Âm thanh bài học');

    if (uploadMode === 'file') {
      if (!selectedFile && !previewDataUrl) {
        setErrorMessage('Vui lòng chọn tệp từ thiết bị của bạn.');
        return;
      }
    } else if (uploadMode === 'url') {
      if (!assetUrl.trim()) {
        setErrorMessage('Vui lòng nhập đường dẫn URL.');
        return;
      }
    } else if (uploadMode === 'tts') {
      if (!ttsText.trim()) {
        setErrorMessage('Vui lòng nhập câu tiếng Anh cần phát âm.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const newId = `media_${Date.now()}`;
      let savedAsset: MediaAsset;

      if (uploadMode === 'file' && selectedFile) {
        savedAsset = await saveMediaToDb({
          id: newId,
          type: uploadType,
          name: finalName,
          blob: selectedFile,
          size: selectedFile.size,
        });
      } else if (uploadMode === 'file' && previewDataUrl) {
        savedAsset = await saveMediaToDb({
          id: newId,
          type: uploadType,
          name: finalName,
          dataUrl: previewDataUrl,
        });
      } else if (uploadMode === 'url') {
        savedAsset = await saveMediaToDb({
          id: newId,
          type: uploadType,
          name: finalName,
          onlineUrl: assetUrl.trim(),
        });
      } else {
        // TTS
        savedAsset = await saveMediaToDb({
          id: newId,
          type: 'audio',
          name: ttsText.trim(),
          onlineUrl: '',
        });
      }

      // Also register in storage metadata
      addMediaAsset(savedAsset);
      await refreshAssets();

      setIsUploading(false);
      resetUploadForm();

      if (onSelectAsset) {
        onSelectAsset(savedAsset);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save media asset:', err);
      setErrorMessage('Lỗi khi lưu tệp vào kho lưu trữ: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action via custom ConfirmModal
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    if (playingAssetId === deleteTargetId) {
      stopAudio();
    }

    try {
      await deleteMediaFromDb(deleteTargetId);
      deleteMediaAsset(deleteTargetId);
      await refreshAssets();
    } catch (err) {
      console.error('Failed to delete media asset:', err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets
    .filter(a => activeTab === 'all' || a.type === activeTab)
    .filter(a => !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
        <div 
          className={`${theme.card} w-full max-w-3xl rounded-2xl border ${theme.border} shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-inherit flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <span>Kho tư liệu truyền thông</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Lưu trữ IndexedDB
                  </span>
                </h3>
                <p className={`text-xs ${theme.textMuted}`}>
                  Quản lý hình ảnh minh họa & âm thanh bài nghe (Listening)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className={`p-1.5 rounded-lg hover:${theme.highlight} ${theme.textMuted} cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader / Tabs & Search */}
          <div className={`px-5 py-3 border-b border-inherit ${theme.badgeBg} flex flex-wrap items-center justify-between gap-3 shrink-0`}>
            {/* Tabs Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-200/70 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'all' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-800 dark:text-neutral-300 hover:text-emerald-600'
                }`}
              >
                Tất cả ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'image' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-800 dark:text-neutral-300 hover:text-emerald-600'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Hình ảnh ({assets.filter(a => a.type === 'image').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audio')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'audio' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-800 dark:text-neutral-300 hover:text-emerald-600'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Âm thanh ({assets.filter(a => a.type === 'audio').length})</span>
              </button>
            </div>

            {/* Search and Upload Button */}
            <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
              <div className="relative flex-1">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${theme.textMuted}`} />
                <input
                  type="text"
                  placeholder="Tìm tên tệp..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-emerald-500`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUploading(!isUploading);
                  setErrorMessage(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Đóng form' : '+ Thêm tệp mới'}</span>
              </button>
            </div>
          </div>

          {/* Upload Drawer / Panel */}
          {isUploading && (
            <div className="p-4 sm:p-5 border-b border-inherit bg-emerald-500/5 space-y-4 shrink-0 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Tải tệp mới lên kho tư liệu
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType('image');
                      setUploadMode('file');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      uploadType === 'image' 
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                        : `${theme.border} ${theme.textMuted}`
                    }`}
                  >
                    Hình ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType('audio');
                      setUploadMode('file');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      uploadType === 'audio' 
                        ? 'border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold' 
                        : `${theme.border} ${theme.textMuted}`
                    }`}
                  >
                    Âm thanh (Audio Track)
                  </button>
                </div>
              </div>

              {/* Mode selection for Audio or Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Left: Input Type */}
                <div className="space-y-2.5">
                  {uploadType === 'audio' && (
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('file');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          uploadMode === 'file' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                            : `${theme.border} ${theme.textMuted}`
                        }`}
                      >
                        📁 Tệp MP3 / WAV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('url');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          uploadMode === 'url' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                            : `${theme.border} ${theme.textMuted}`
                        }`}
                      >
                        🔗 Link Audio Online
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('tts');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          uploadMode === 'tts' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                            : `${theme.border} ${theme.textMuted}`
                        }`}
                      >
                        🗣 Phát âm TTS
                      </button>
                    </div>
                  )}

                  {uploadType === 'image' && (
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('file');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          uploadMode === 'file' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                            : `${theme.border} ${theme.textMuted}`
                        }`}
                      >
                        📁 Tải ảnh từ máy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('url');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          uploadMode === 'url' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' 
                            : `${theme.border} ${theme.textMuted}`
                        }`}
                      >
                        🔗 Dán link ảnh (URL)
                      </button>
                    </div>
                  )}

                  {/* File input mode */}
                  {uploadMode === 'file' && (
                    <div>
                      <label className={`block text-xs font-medium ${theme.textMuted} mb-1`}>
                        Chọn tệp từ máy ({uploadType === 'image' ? 'PNG, JPG, SVG, WebP' : 'MP3, WAV, M4A, OGG'} - dung lượng thoải mái)
                      </label>
                      <input
                        type="file"
                        accept={uploadType === 'image' ? 'image/*' : 'audio/*'}
                        onChange={handleFileChange}
                        className={`w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 ${theme.inputBg} border ${theme.border} rounded-xl p-1.5 cursor-pointer`}
                      />
                    </div>
                  )}

                  {/* URL mode */}
                  {uploadMode === 'url' && (
                    <div>
                      <label className={`block text-xs font-medium ${theme.textMuted} mb-1`}>
                        Đường dẫn trực tuyến ({uploadType === 'image' ? 'https://...jpg' : 'https://...mp3'})
                      </label>
                      <input
                        type="url"
                        placeholder={uploadType === 'image' ? 'https://example.com/photo.jpg' : 'https://example.com/track.mp3'}
                        value={assetUrl}
                        onChange={e => setAssetUrl(e.target.value)}
                        className={`w-full px-3 py-1.5 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:border-emerald-500`}
                      />
                    </div>
                  )}

                  {/* TTS mode for Audio */}
                  {uploadMode === 'tts' && uploadType === 'audio' && (
                    <div>
                      <label className={`block text-xs font-medium ${theme.textMuted} mb-1`}>
                        Câu / Từ tiếng Anh cần phát âm mẫu:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Could you please check the quarterly financial report?"
                        value={ttsText}
                        onChange={e => setTtsText(e.target.value)}
                        className={`w-full px-3 py-1.5 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:border-emerald-500`}
                      />
                    </div>
                  )}

                  <div>
                    <label className={`block text-xs font-medium ${theme.textMuted} mb-1`}>
                      Tên định danh tư liệu:
                    </label>
                    <input
                      type="text"
                      placeholder={uploadType === 'image' ? 'Ví dụ: Sơ đồ ngữ pháp Thì hiện tại đơn' : 'Ví dụ: TOEIC Listening Part 1 - Track 01'}
                      value={assetName}
                      onChange={e => setAssetName(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:border-emerald-500`}
                    />
                  </div>
                </div>

                {/* Right: Preview & Submit */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-neutral-500/10 border border-neutral-500/20">
                  <div>
                    <span className={`text-[11px] font-semibold block mb-2 ${theme.textMuted}`}>
                      Khung xem trước
                    </span>
                    {uploadType === 'image' && (
                      <div className="w-full h-24 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden border border-inherit">
                        {previewDataUrl || assetUrl ? (
                          <img 
                            src={previewDataUrl || assetUrl} 
                            alt="preview" 
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={`text-xs ${theme.textMuted} flex flex-col items-center gap-1`}>
                            <ImageIcon className="w-6 h-6 opacity-40" />
                            <span>Chưa chọn hình ảnh</span>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadType === 'audio' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold block truncate">
                            {ttsText || assetName || (selectedFile?.name) || 'Tệp âm thanh'}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {uploadMode === 'tts' ? 'Giọng đọc bản ngữ (TTS)' : 'Audio File'}
                          </span>
                        </div>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-inherit">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploading(false);
                        resetUploadForm();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs ${theme.border} border cursor-pointer hover:opacity-80`}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveNewAsset}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span>Đang lưu...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu vào kho</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assets Grid List */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Upload className="w-10 h-10 mx-auto text-emerald-500 opacity-40" />
                <div className="max-w-sm mx-auto">
                  <p className="font-semibold text-sm">Chưa có tư liệu nào trong kho</p>
                  <p className={`text-xs ${theme.textMuted} mt-1`}>
                    Bấm nút <b>"+ Thêm tệp mới"</b> bên trên để tải âm thanh bài nghe hoặc hình ảnh minh họa vào kho.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredAssets.map(asset => {
                  const isAudio = asset.type === 'audio';
                  const isPlaying = playingAssetId === asset.id;
                  const displayUrl = resolvedUrls[asset.id] || asset.url;

                  return (
                    <div
                      key={asset.id}
                      className={`group p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative ${theme.card} ${theme.border} hover:border-emerald-500 hover:shadow-md`}
                    >
                      {/* Top Preview */}
                      <div className="flex items-start gap-3">
                        {isAudio ? (
                          <button
                            type="button"
                            onClick={() => playAudio(asset)}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer ${
                              isPlaying 
                                ? 'bg-amber-500 text-white animate-pulse' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={isPlaying ? 'Tạm dừng' : 'Nghe thử'}
                          >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-black/40 border border-inherit overflow-hidden shrink-0 flex items-center justify-center">
                            {displayUrl ? (
                              <img 
                                src={displayUrl} 
                                alt={asset.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-neutral-400" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isAudio 
                                ? 'bg-sky-100 dark:bg-sky-500/15 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30' 
                                : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            }`}>
                              {isAudio ? 'Âm thanh' : 'Hình ảnh'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold truncate mt-1 text-neutral-950 dark:text-neutral-100" title={asset.name}>
                            {asset.name}
                          </h4>
                          <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium block">
                            {new Date(asset.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-inherit">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetId(asset.id);
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                          title="Xóa khỏi kho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {onSelectAsset && (
                          <button
                            type="button"
                            onClick={() => {
                              stopAudio();
                              onSelectAsset(asset);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chèn vào bài</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-inherit flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
            <span>Tổng cộng: {assets.length} tệp trong kho lưu trữ</span>
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className={`px-3 py-1 rounded-lg border ${theme.border} hover:${theme.highlight} cursor-pointer`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Xóa tư liệu khỏi kho"
        message="Bạn có chắc chắn muốn xóa tệp này khỏi kho lưu trữ? Thao tác này sẽ xóa vĩnh viễn dữ liệu."
        confirmText="Xóa vĩnh viễn"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
};
