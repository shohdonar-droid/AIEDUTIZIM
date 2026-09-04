import { useState, useEffect, useRef } from 'react';
import { storage, db } from '../../lib/firebase';
import { 
  ref, 
  listAll, 
  getMetadata, 
  getDownloadURL, 
  deleteObject, 
  uploadBytesResumable
} from 'firebase/storage';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { 
  HardDrive, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  File, 
  Folder, 
  Trash2, 
  Download, 
  UploadCloud, 
  RefreshCw, 
  Search, 
  User, 
  FileArchive, 
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

interface StorageFile {
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  uploaderName: string;
  uploaderId: string;
  uploaderRole: string;
  downloadUrl: string;
}

interface UserStorageAllocation {
  id: string;
  name: string;
  role: string;
  email: string;
  fileCount: number;
  totalSize: number;
}

export default function AdminStorage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterFolder, setFilterFolder] = useState('all');
  const [sortBy, setSortBy] = useState('dateDesc');
  
  // Storage Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Status Notification Info
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Maximum Capacity limit for visualization (Firebase Free Tier is 5 GB)
  const MAX_STORAGE_CAPACITY = 5 * 1024 * 1024 * 1024; // 5 GB in Bytes

  // Seed / fallback files to keep dashboard immersive if the bucket is empty
  const SEED_FILES: StorageFile[] = [
    {
      name: "oliy-ta'lim-tizimi-loyihasi.pdf",
      fullPath: "siteContent/oliy-ta'lim-tizimi-loyihasi.pdf",
      size: 15420000, // 14.7 MB
      contentType: "application/pdf",
      timeCreated: "2026-05-10T12:00:20.000Z",
      updated: "2026-05-10T12:00:20.000Z",
      uploaderName: "Elyorbek Alimov",
      uploaderId: "admin_elyorbek",
      uploaderRole: "admin",
      downloadUrl: "https://example.com/mock-oliy-talim-tizimi.pdf"
    },
    {
      name: "bosh-banner-background.jpg",
      fullPath: "siteContent/bosh-banner-background.jpg",
      size: 4520000, // 4.3 MB
      contentType: "image/jpeg",
      timeCreated: "2026-06-01T08:30:15.000Z",
      updated: "2026-06-01T08:30:15.000Z",
      uploaderName: "Elyorbek Alimov",
      uploaderId: "admin_elyorbek",
      uploaderRole: "admin",
      downloadUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
    },
    {
      name: "talabalar-reytingi-kirish-darsi.mp4",
      fullPath: "siteContent/talabalar-reytingi-kirish-darsi.mp4",
      size: 112500000, // 107.2 MB
      contentType: "video/mp4",
      timeCreated: "2026-06-11T14:45:00.000Z",
      updated: "2026-06-11T14:45:00.000Z",
      uploaderName: "Dots. Karimov S.A.",
      uploaderId: "teacher_karimov",
      uploaderRole: "teacher",
      downloadUrl: "https://example.com/mock-dars.mp4"
    },
    {
      name: "kurs_ishlari_shabloni.docx",
      fullPath: "siteContent/kurs_ishlari_shabloni.docx",
      size: 2150000, // 2.05 MB
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      timeCreated: "2026-06-12T09:12:44.000Z",
      updated: "2026-06-12T09:12:44.000Z",
      uploaderName: "Toshpo'latov F.H.",
      uploaderId: "student_toshpulatov",
      uploaderRole: "student",
      downloadUrl: "https://example.com/mock-template.docx"
    },
    {
      name: "audio_tushuntirish_maqola.mp3",
      fullPath: "siteContent/audio_tushuntirish_maqola.mp3",
      size: 18400000, // 17.5 MB
      contentType: "audio/mpeg",
      timeCreated: "2026-06-10T10:20:00.000Z",
      updated: "2026-06-10T10:20:00.000Z",
      uploaderName: "Fozilov J.M.",
      uploaderId: "staff_fozilov",
      uploaderRole: "staff",
      downloadUrl: "https://example.com/mock-audio.mp3"
    }
  ];

  useEffect(() => {
    fetchUsersAndStorage();
  }, []);

  const fetchUsersAndStorage = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Users from Firestore to correlate emails, names, roles
      let fetchedUsers: any[] = [];
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        fetchedUsers = usersSnap.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Firestore users reading failed:", err);
      }

      // 2. Fetch Files from Firebase Storage
      const scannedFiles: StorageFile[] = [];
      const foldersToScan = ['', 'siteContent', 'banners', 'certificates', 'materials'];
      
      for (const folder of foldersToScan) {
        try {
          const folderRef = ref(storage, folder);
          const listRes = await listAll(folderRef);
          
          for (const item of listRes.items) {
            // Skip duplicating root files if they show up in both root and custom subfolders
            if (scannedFiles.some(f => f.fullPath === item.fullPath)) {
              continue;
            }

            try {
              const meta = await getMetadata(item);
              const url = await getDownloadURL(item);
              
              // Guess or read uploader info
              let uploaderName = "Tizim / Ma'muriyat";
              let uploaderId = "system";
              let uploaderRole = "admin";

              if (meta.customMetadata?.uploaderName) {
                uploaderName = meta.customMetadata.uploaderName;
                uploaderId = meta.customMetadata.uploaderId || "unknown";
                uploaderRole = meta.customMetadata.uploaderRole || "user";
              } else if (meta.customMetadata?.userId) {
                const associatedUser = fetchedUsers.find(u => u.uid === meta.customMetadata?.userId);
                if (associatedUser) {
                  uploaderName = associatedUser.displayName || associatedUser.email || "Foydalanuvchi";
                  uploaderId = associatedUser.uid;
                  uploaderRole = associatedUser.role || "student";
                }
              } else if (item.fullPath.includes('certificates/')) {
                uploaderName = "Sertifikatlar Generatori";
                uploaderId = "system_certs";
                uploaderRole = "system";
              }

              scannedFiles.push({
                name: item.name,
                fullPath: item.fullPath,
                size: meta.size,
                contentType: meta.contentType || 'application/octet-stream',
                timeCreated: meta.timeCreated || meta.updated || new Date().toISOString(),
                updated: meta.updated || new Date().toISOString(),
                uploaderName,
                uploaderId,
                uploaderRole,
                downloadUrl: url
              });
            } catch (err) {
              console.warn(`Failed reading metadata for ${item.fullPath}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Folder scan failed for directory "${folder}":`, err);
        }
      }

      // Merged array is just scannedFiles without SEED_FILES
      const merged: StorageFile[] = [...scannedFiles];

      // Sort by creation time desc
      merged.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
      setFiles(merged);

      if (isManualRefresh) {
        showStatus('success', "Ma'lumotlar muvaffaqiyatli yangilandi");
      }
    } catch (err: any) {
      console.error("Storage monitor fetch error:", err);
      showStatus('error', "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Helper formats
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    const type = contentType.toLowerCase();
    if (type.includes('image/')) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    if (type.includes('video/')) return <Video className="h-5 w-5 text-indigo-500" />;
    if (type.includes('audio/')) return <Music className="h-5 w-5 text-pink-500" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-rose-500" />;
    if (type.includes('word') || type.includes('officedocument.word') || type.includes('docx') || type.includes('doc')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gzip')) {
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    }
    return <File className="h-5 w-5 text-slate-400" />;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showStatus('success', "Fayl ssilkasi nusxalandi!");
    } catch (err) {
      showStatus('error', "Nusxalashda xatolik yuz berdi");
    }
  };

  // File delete handler
  const handleDeleteFile = async (file: StorageFile) => {
    if (!window.confirm(`"${file.name}" faylini o'chirishni tasdiqlaysizmi? Bu amal ortga qaytarilmasdir.`)) {
      return;
    }

    try {
      const fileRef = ref(storage, file.fullPath);
      await deleteObject(fileRef);
      setFiles(prev => prev.filter(f => f.fullPath !== file.fullPath));
      showStatus('success', "Fayl Firebase Storagedan o'chirildi.");
    } catch (err: any) {
      console.error("Delete failed:", err);
      showStatus('error', `O'chirishda xatolik: ${err.message || "Huquqlar yetarli emas"}`);
    }
  };

  // Upload Logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const ext = file.name.split('.').pop() || '';
      const customPath = `siteContent/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const storageRef = ref(storage, customPath);
      
      // Attach metadata identifying current admin user
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploaderId: user?.uid || "unauthenticated",
          uploaderName: user?.displayName || user?.email || "Super Admin",
          uploaderRole: user?.role || "admin",
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(prog);
        }, 
        (error) => {
          console.error("Upload error details:", error);
          setUploadError(`Yuklash muvaffaqiyatsiz tugadi: ${error.message}`);
          setIsUploading(false);
          showStatus('error', "Faylni yuklashda xatolik yuz berdi");
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadSuccess(`"${file.name}" fayli muvaffaqiyatli yuklandi`);
          setIsUploading(false);
          showStatus('success', "Yangi fayl tizimga qo'shildi!");

          // Add newly uploaded file info to the visual state instantly
          const newFileObj: StorageFile = {
            name: file.name,
            fullPath: customPath,
            size: file.size,
            contentType: file.type,
            timeCreated: new Date().toISOString(),
            updated: new Date().toISOString(),
            uploaderName: user?.displayName || user?.email || "Super Admin",
            uploaderId: user?.uid || "admin",
            uploaderRole: user?.role || "admin",
            downloadUrl: url
          };

          setFiles(prev => [newFileObj, ...prev]);
        }
      );
    } catch (err: any) {
      console.error("Upload process error:", err);
      setUploadError(err.message || "Yuklashda mantiqiy xatolik");
      setIsUploading(false);
    }
  };

  // Process data for charts
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const averageSize = files.length > 0 ? totalSize / files.length : 0;
  const storagePercentage = Math.min((totalSize / MAX_STORAGE_CAPACITY) * 100, 100);

  // Group by Folders
  const folderGrouping: { [key: string]: number } = {};
  files.forEach(f => {
    const parts = f.fullPath.split('/');
    const folder = parts.length > 1 ? parts[0] : 'ildiz (root)';
    folderGrouping[folder] = (folderGrouping[folder] || 0) + f.size;
  });

  const folderChartData = Object.keys(folderGrouping).map(key => ({
    name: key,
    value: Math.round(folderGrouping[key] / (1024 * 1024) * 100) / 100 // Convert to MB
  }));

  // Group by File MIME types
  const mimeGrouping: { [key: string]: { size: number; count: number } } = {
    'Rasmlar (Images)': { size: 0, count: 0 },
    'Hujjatlar (Docs)': { size: 0, count: 0 },
    'Videolar (Videos)': { size: 0, count: 0 },
    'Audiolar (Audios)': { size: 0, count: 0 },
    'Arxivlar (Zip)': { size: 0, count: 0 },
    'Boshqalar (Other)': { size: 0, count: 0 },
  };

  files.forEach(f => {
    const type = f.contentType.toLowerCase();
    if (type.includes('image/')) {
      mimeGrouping['Rasmlar (Images)'].size += f.size;
      mimeGrouping['Rasmlar (Images)'].count += 1;
    } else if (type.includes('video/')) {
      mimeGrouping['Videolar (Videos)'].size += f.size;
      mimeGrouping['Videolar (Videos)'].count += 1;
    } else if (type.includes('audio/')) {
      mimeGrouping['Audiolar (Audios)'].size += f.size;
      mimeGrouping['Audiolar (Audios)'].count += 1;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('tar')) {
      mimeGrouping['Arxivlar (Zip)'].size += f.size;
      mimeGrouping['Arxivlar (Zip)'].count += 1;
    } else if (type.includes('pdf') || type.includes('word') || type.includes('document') || type.includes('docx') || type.includes('text') || type.includes('xls') || type.includes('sheet')) {
      mimeGrouping['Hujjatlar (Docs)'].size += f.size;
      mimeGrouping['Hujjatlar (Docs)'].count += 1;
    } else {
      mimeGrouping['Boshqalar (Other)'].size += f.size;
      mimeGrouping['Boshqalar (Other)'].count += 1;
    }
  });

  const mimeChartData = Object.keys(mimeGrouping)
    .map(key => ({
      name: key,
      Hajmi_MB: Math.round(mimeGrouping[key].size / (1024 * 1024) * 100) / 100,
      Soni: mimeGrouping[key].count
    }))
    .filter(d => d.Hajmi_MB > 0 || d.Soni > 0);

  // Group by Users
  const userGrouping: { [key: string]: { size: number; count: number; name: string; role: string } } = {};
  files.forEach(f => {
    const uid = f.uploaderId;
    if (!userGrouping[uid]) {
      userGrouping[uid] = {
        size: 0,
        count: 0,
        name: f.uploaderName,
        role: f.uploaderRole
      };
    }
    userGrouping[uid].size += f.size;
    userGrouping[uid].count += 1;
  });

  const userChartData = Object.keys(userGrouping).map(key => ({
    uid: key,
    name: userGrouping[key].name,
    role: userGrouping[key].role,
    Total_MB: Math.round(userGrouping[key].size / (1024 * 1024) * 100) / 100,
    count: userGrouping[key].count
  })).sort((a, b) => b.Total_MB - a.Total_MB);

  // Filter & Search logic for Explorer
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.uploaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.contentType.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesType = true;
    if (filterType !== 'all') {
      const type = f.contentType.toLowerCase();
      if (filterType === 'image') matchesType = type.includes('image/');
      else if (filterType === 'video') matchesType = type.includes('video/');
      else if (filterType === 'audio') matchesType = type.includes('audio/');
      else if (filterType === 'pdf') matchesType = type.includes('pdf');
      else if (filterType === 'document') matchesType = type.includes('word') || type.includes('docx') || type.includes('sheet') || type.includes('excel');
    }

    let matchesFolder = true;
    if (filterFolder !== 'all') {
      const parts = f.fullPath.split('/');
      const folder = parts.length > 1 ? parts[0] : 'ildiz (root)';
      matchesFolder = folder === filterFolder;
    }

    return matchesSearch && matchesType && matchesFolder;
  });

  // Sort files based on user preference
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'dateDesc') {
      return new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime();
    }
    if (sortBy === 'dateAsc') {
      return new Date(a.timeCreated).getTime() - new Date(b.timeCreated).getTime();
    }
    if (sortBy === 'sizeDesc') {
      return b.size - a.size;
    }
    if (sortBy === 'sizeAsc') {
      return a.size - b.size;
    }
    return 0;
  });

  // Extract folder listing for filters
  const uniqueFolders = Array.from(new Set(files.map(f => {
    const parts = f.fullPath.split('/');
    return parts.length > 1 ? parts[0] : 'ildiz (root)';
  })));

  // Color Palette
  const COLORS = ['#3B82F6', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B'];

  if (loading) {
    return (
      <div id="storage-loading" className="flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest font-mono">Storage ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div id="storage-monitoring-container" className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-xs text-blue-600 font-bold tracking-widest uppercase">Tizim Resurslari</span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-1">
            <HardDrive className="h-7 w-7 text-blue-600 shrink-0" />
            STORAGE MONITORING (FAYLLAR MONITORINGI)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Firebase Cloud Storage xotirasi, fayllar kesimi va foydalanuvchilar ulushi tahlili.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="storage-refresh-btn"
            onClick={() => fetchUsersAndStorage(true)}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-2xl bg-white border border-gray-150 text-slate-600 font-black text-xs uppercase tracking-widest hover:text-slate-800 hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Yangilanmoqda..." : "Yangilash"}
          </button>
        </div>
      </div>

      {/* Real-time Toast Alerts */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-8 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-100' :
              'bg-blue-50 text-blue-800 border-blue-100'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />}
            {statusMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="h-5 w-5 text-blue-600 shrink-0" />}
            <span className="text-xs font-bold leading-normal">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Cards Grid */}
      <div id="storage-stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Files Card */}
        <div id="card-total-files" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100/40">
            <Folder className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block mb-1">Jami Fayllar</span>
            <span className="text-3xl font-black text-slate-800 font-mono tracking-tight">{files.length}</span>
            <span className="text-[10px] font-bold text-blue-600 block mt-1">Skanerlangan barcha fayllar</span>
          </div>
        </div>

        {/* Total Size Card */}
        <div id="card-total-size" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100/40">
            <HardDrive className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block mb-1">Ishlatilgan Xotira</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatBytes(totalSize)}</span>
            <span className="text-[10px] font-bold text-emerald-600 block mt-1">Haqiqiy foydalanilgan xajm</span>
          </div>
        </div>

        {/* Average Size Card */}
        <div id="card-avg-size" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100/40">
            <Info className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block mb-1">O'rtacha fayl hajmi</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatBytes(averageSize)}</span>
            <span className="text-[10px] font-bold text-amber-600 block mt-1">Har bir fayl o'rtachasi</span>
          </div>
        </div>

        {/* Quota Progress Radial / Usage Percentage Card */}
        <div id="card-storage-percent" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Storage bandlik darajasi</span>
            <span className="text-xs font-black text-blue-600 font-mono">{storagePercentage.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-tight font-mono">
            <span>Limit: {formatBytes(MAX_STORAGE_CAPACITY)}</span>
            <span>Qolgan: {formatBytes(Math.max(MAX_STORAGE_CAPACITY - totalSize, 0))}</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts Section */}
      <div id="storage-visuals-row" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pie Chart - Storage by Files Folder */}
        <div id="chart-by-folder" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="border-b border-gray-50 pb-4 mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kataloglar kesimida (Folders)</h3>
            <p className="text-xs text-slate-400 mt-1">Firebase Storage papkalari egallagan umumiy hajm (MBda)</p>
          </div>
          <div className="h-72 w-full">
            {folderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={folderChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {folderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} MB`, 'Hajmi']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300">
                Grafik uchun ma'lumotlar mavjud emas
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart - Storage allocation by format/mime types */}
        <div id="chart-by-type" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="border-b border-gray-50 pb-4 mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fayl turlari kesimida (Formats)</h3>
            <p className="text-xs text-slate-400 mt-1">Kengaytma va formatlar egallagan jami hajm (MB)</p>
          </div>
          <div className="h-72 w-full">
            {mimeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mimeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value, name) => [name === 'Soni' ? `${value} ta` : `${value} MB`, name === 'Soni' ? 'Fayllar' : 'Hajmi']} />
                  <Legend />
                  <Bar dataKey="Hajmi_MB" name="Hajmi (MB)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Soni" name="Soni (Dona)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300">
                Grafik uchun ma'lumotlar mavjud emas
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Usability Pattern - Real-time Drag and Drop Uploader Panel */}
      <div 
        id="storage-drag-uploader" 
        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
      >
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest mb-1">YANGI FAYL JUKLASH</h3>
          <p className="text-xs text-slate-400 mb-6">Xotiraga yangi rasm, hujjat yoki video yuklang. U sizning hisobingizga biriktiriladi.</p>

          <div
            id="drag-and-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/50 scale-102 scale-100' 
                : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden" 
              id="storage-hidden-file-input"
            />
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition border border-blue-100/20">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-sm font-extrabold text-slate-700">Faylni shu yerga tortib tashlang yoki</p>
            <p className="text-xs text-blue-600 font-bold mt-1 hover:underline">Kompyuterdan tanlang</p>
            <span className="text-[10px] text-slate-400 mt-4 tracking-tight">Maksimal tavsiya etilgan fayl hajmi: 100 MB</span>
          </div>

          {/* Upload Progress Loader */}
          {isUploading && (
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-xs font-black text-slate-500 font-mono">
                <span className="animate-pulse">FAYL STORAGEGA YUKLANMOQDA...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {uploadSuccess}
            </div>
          )}
        </div>
      </div>

      {/* Grid of User-by-User Allocation List */}
      <div id="storage-users-allocation" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
        <div className="border-b border-gray-50 pb-4 mb-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Foydalanuvchilar kesimida xotira (Uploader Split)</h3>
          <p className="text-xs text-slate-400 mt-1">Har bir faol uploader (foydalanuvchi/role) tomonidan yuklangan va band qilingan jami xotira</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                <th className="pb-3 font-black">Foydalanuvchi (Uploader)</th>
                <th className="pb-3 font-black">Roli / Kategoriya</th>
                <th className="pb-3 font-black">Fayllar Soni</th>
                <th className="pb-3 font-black">Band qilgan hajmi</th>
                <th className="pb-3 font-black">Hajm ulushi (Total % )</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {userChartData.map((row, idx) => {
                const uPct = totalSize > 0 ? (userGrouping[row.uid].size / totalSize) * 100 : 0;
                return (
                  <tr key={row.uid || idx} className="text-xs text-slate-600 hover:bg-slate-50/40">
                    <td className="py-4 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase text-xs">
                        {row.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 leading-none">{row.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">ID: {row.uid}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        row.role === "admin" || row.role === "system" ? "bg-red-50 text-red-500" :
                        row.role === "teacher" ? "bg-cyan-50 text-cyan-600" :
                        row.role === "staff" ? "bg-blue-50 text-blue-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="py-4 font-mono font-bold text-slate-700">{row.count} ta</td>
                    <td className="py-4 font-mono font-black text-slate-800">{formatBytes(userGrouping[row.uid].size)}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${uPct}%` }}></div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500">{uPct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explorer: Files List & Detailed Table */}
      <div id="storage-explorer-panel" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col space-y-6">
        
        {/* File Explorer Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-50 pb-5">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fayllar ombori explorer (Explorer)</h3>
            <p className="text-xs text-slate-400 mt-1">Skanerlangan barcha fayllarni izlash, filtrlash, yuklab olish va o'chirish boshqaruvi.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="storage-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fayllardan qidirish..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-400 w-56 font-bold"
              />
            </div>

            {/* Folder filter */}
            <select
              id="storage-folder-filter"
              value={filterFolder}
              onChange={(e) => setFilterFolder(e.target.value)}
              className="border border-slate-200 rounded-2xl px-4 py-2 text-xs bg-white text-slate-600 font-extrabold focus:outline-none"
            >
              <option value="all">Barcha Kataloglar</option>
              {uniqueFolders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              id="storage-type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-2xl px-4 py-2 text-xs bg-white text-slate-600 font-extrabold focus:outline-none"
            >
              <option value="all">Barcha formatlar</option>
              <option value="image">Rasmlar (Images)</option>
              <option value="video">Videolar (Videos)</option>
              <option value="audio">Audiolar (Audios)</option>
              <option value="pdf">PDF Hujjatlar</option>
              <option value="document">Matnli Hujjatlar (Word/Excel)</option>
            </select>

            {/* Sort Filter */}
            <select
              id="storage-sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-2xl px-4 py-2 text-xs bg-white text-slate-600 font-extrabold focus:outline-none"
            >
              <option value="dateDesc">Yangi yuklanganlar (Newest)</option>
              <option value="dateAsc">Eski yuklanganlar (Oldest)</option>
              <option value="sizeDesc">Eng katta fayllar (Largest first)</option>
              <option value="sizeAsc">Eng kichik fayllar (Smallest first)</option>
            </select>
          </div>
        </div>

        {/* Files Explorer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                <th className="pb-3 font-black">Fayl Nomi</th>
                <th className="pb-3 font-black">Katalog (Folder)</th>
                <th className="pb-3 font-black">MIME Turi</th>
                <th className="pb-3 font-black">Fayl Hajmi</th>
                <th className="pb-3 font-black">Yuklagan Shaxs</th>
                <th className="pb-3 font-black text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-sans">
              {sortedFiles.length > 0 ? (
                sortedFiles.map((file, idx) => (
                  <tr key={file.fullPath || idx} className="text-xs text-slate-600 hover:bg-slate-50/40">
                    {/* Item Name */}
                    <td className="py-4 font-bold flex items-center gap-3 max-w-sm">
                      <div className="shrink-0 w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-100">
                        {getFileIcon(file.contentType)}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
                          Kiritildi: {new Date(file.timeCreated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    {/* Folder path */}
                    <td className="py-4">
                      <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        {file.fullPath.split('/').length > 1 ? file.fullPath.split('/')[0] : 'ildiz (root)'}
                      </span>
                    </td>
                    {/* Content Type */}
                    <td className="py-4 font-mono text-[10px] text-slate-500 font-semibold">{file.contentType}</td>
                    {/* File Size */}
                    <td className="py-4 font-mono font-extrabold text-slate-800">{formatBytes(file.size)}</td>
                    {/* Owner/Uploader */}
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{file.uploaderName}</span>
                      </div>
                    </td>
                    {/* Actions buttons */}
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Copy URL */}
                        <button
                          id={`copy-url-btn-${idx}`}
                          onClick={() => copyToClipboard(file.downloadUrl)}
                          title="Ssilkadan nusxa olish"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {/* Download */}
                        <a
                          id={`download-link-${idx}`}
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer noreferrer"
                          title="Yuklab olish / Ko'rish"
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {/* Delete */}
                        <button
                          id={`delete-file-btn-${idx}`}
                          onClick={() => handleDeleteFile(file)}
                          title="Faylni o'chirish"
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest font-mono">
                    <p>Qidiruv shartlariga mos fayllar topilmadi.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
