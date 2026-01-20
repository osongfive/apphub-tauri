import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, Edit3, Settings2, AppWindow, Settings, Check, X, Loader2 } from "lucide-react";

// -- TYPES --
type AppData = {
  id: string;
  name: string;
  path: string;
  category: string;
};

// -- THEMES CONFIG --
const THEMES = [
  { id: 'default', name: 'Cyber Blue', color: 'bg-[#38bdf8]' },
  { id: 'pink', name: 'Sakura', color: 'bg-[#fb7185]' },
  { id: 'green', name: 'Forest', color: 'bg-[#34d399]' },
  { id: 'purple', name: 'Nebula', color: 'bg-[#c084fc]' },
];

// -- GLOBAL CACHE --
const iconCache = new Map<string, string>();

// -- COMPONENT: App Icon --
const AppIcon = ({ path, className }: { path: string, className?: string }) => {
  const [iconSrc, setIconSrc] = useState<string | null>(() => iconCache.get(path) || null);
  const [isLoaded, setIsLoaded] = useState(!!iconSrc);

  useEffect(() => {
    if (iconSrc) return;

    let isMounted = true;
    invoke<string | null>("get_app_icon", { appPath: path })
      .then((result) => {
        if (isMounted && result) {
          iconCache.set(path, result);
          setIconSrc(result);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [path, iconSrc]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <AppWindow 
        className={`text-slate-500 absolute transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`} 
        size={32} 
      />
      {iconSrc && (
        <img 
          src={iconSrc} 
          alt="App Icon" 
          className={`object-contain w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apps, setApps] = useState<AppData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; app: AppData | null }>({ x: 0, y: 0, app: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ path: "", name: "", category: "" });

  useEffect(() => {
    const savedTheme = localStorage.getItem('apphub-theme') || 'default';
    setTheme(savedTheme);

    const initApp = async () => {
      try {
        const installedApps = await invoke<AppData[]>("get_installed_apps");
        setApps(installedApps);
        
        // Wait for 1.2 seconds to ensure the user sees the logo and the DOM is ready
        setTimeout(() => {
          setIsLoading(false);
        }, 1200);
      } catch (error) {
        console.error("Failed to load apps", error);
        setIsLoading(false);
      }
    };

    initApp();

    const closeMenu = () => setContextMenu({ x: 0, y: 0, app: null });
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const setTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('apphub-theme', themeId);
    if (themeId === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  };

  const handleLaunch = (path: string) => invoke("launch_app", { path });
  
  const handleContextMenu = (e: React.MouseEvent, app: AppData) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, app });
  };

  const handleEditClick = () => {
    if (contextMenu.app) {
      setEditForm({ ...contextMenu.app });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    setApps(apps.map(a => a.path === editForm.path ? { ...a, category: editForm.category } : a));
    setIsEditing(false);
    await invoke("save_app_config", { path: editForm.path, category: editForm.category });
  };

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || app.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(apps.map(a => a.category))).sort()];
  }, [apps]);

  return (
    <div className="flex h-screen bg-surface text-slate-200 selection:bg-primary selection:text-surface overflow-hidden font-sans transition-colors duration-500 relative">
      
      {/* --- LOADING SCREEN --- */}
      {/* z-[999] ensures it is absolutely on top of everything. */}
      {/* pointer-events-none is ONLY applied when hidden, so it doesn't block clicks after loading. */}
      <div 
        className={`fixed inset-0 bg-surface z-[999] flex flex-col items-center justify-center transition-opacity duration-1000 ease-out 
        ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <h2 className="mt-8 text-2xl font-bold tracking-tight text-white animate-pulse">AppHub</h2>
        <p className="text-slate-500 mt-2 text-sm font-medium">Initializing Workspace...</p>
      </div>

      {/* --- MAIN APP CONTENT --- */}
      {/* The main app is technically "there" but invisible while loading. */}
      {/* We delay the transition slightly (delay-200) so the loading screen starts fading first. */}
      <div className={`flex w-full h-full transition-all duration-1000 delay-200 ease-out transform ${isLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        
        {/* Sidebar */}
        <aside className="w-64 bg-surface-highlight/30 backdrop-blur-md border-r border-slate-700/30 p-6 flex flex-col gap-6 shrink-0 h-full relative z-20">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary shadow-lg shadow-primary/20"></div>
            <h1 className="text-xl font-bold tracking-tight">AppHub</h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categories</p>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-4 py-3 rounded-smooth transition-all duration-300 ease-out 
                  ${selectedCategory === cat 
                    ? "bg-primary text-surface font-semibold shadow-lg shadow-primary/25 translate-x-1" 
                    : "hover:bg-slate-700/30 hover:text-white"
                  }`}
              >
                {cat}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-smooth hover:bg-slate-700/30 text-slate-400 hover:text-white transition-all"
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 flex flex-col h-full overflow-hidden relative z-10">
          <header className="flex justify-between items-center mb-8 shrink-0">
            <div>
              <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Library</h2>
              <p className="text-slate-400">{apps.length} apps installed</p>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-80 bg-surface-highlight rounded-smooth border border-transparent focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300 shadow-sm"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredApps.map((app, index) => (
                <div
                  key={app.path}
                  onClick={() => handleLaunch(app.path)}
                  onContextMenu={(e) => handleContextMenu(e, app)}
                  className="group relative bg-surface-highlight/50 p-5 rounded-smooth border border-slate-700/30 hover:border-primary/50 cursor-pointer transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 opacity-0 animate-slide-up"
                  style={{ 
                    animationDelay: `${Math.min(index * 30, 500)}ms`, // Slightly increased max delay for smoother stagger
                    animationFillMode: 'both'
                  }} 
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 rounded-smooth transition-opacity duration-500" />
                  <div className="flex flex-col items-center gap-4 text-center relative z-10">
                    <div className="p-3 bg-surface rounded-2xl group-hover:bg-surface-highlight transition-colors duration-300 shadow-inner w-16 h-16 flex items-center justify-center">
                      <AppIcon path={app.path} className="w-10 h-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="w-full">
                      <h3 className="font-bold text-sm truncate w-full" title={app.name}>{app.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1 block">
                        {app.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* --- MODALS --- */}
      {contextMenu.app && (
        <div 
          className="fixed bg-surface-highlight border border-slate-600 rounded-xl shadow-2xl py-2 w-40 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleEditClick} className="w-full text-left px-4 py-2 hover:bg-primary hover:text-surface text-sm font-medium flex items-center gap-2">
            <Edit3 size={14} /> Edit App
          </button>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-surface border border-slate-700 p-8 rounded-smooth w-[30rem] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Settings2 className="text-primary" /> Appearance
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Color Theme</p>
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 
                        ${currentTheme === theme.id 
                          ? "border-primary bg-primary/10 ring-1 ring-primary" 
                          : "border-slate-700 bg-surface-highlight hover:border-slate-500"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${theme.color} shadow-lg`}></div>
                      <span className="font-medium">{theme.name}</span>
                      {currentTheme === theme.id && <Check size={16} className="ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsEditing(false)}>
          <div className="bg-surface border border-slate-700 p-8 rounded-smooth w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings2 className="text-primary" /> Edit {editForm.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold tracking-wider block mb-1">Category</label>
                <input 
                  type="text" 
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  className="w-full bg-surface-highlight border border-slate-700 rounded-lg px-3 py-2 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-surface font-bold rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;