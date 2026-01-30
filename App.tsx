import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Music, Video as VideoIcon, Gamepad2, Info, Search, Settings, 
  BatteryMedium, ChevronRight, Disc, Database, Cpu, HardDrive, 
  Zap, Activity, Terminal, Clock, Play, Pause, SkipForward, SkipBack,
  FileText, Trash2, Plus, Shuffle, Repeat, Monitor, BatteryLow, BatteryFull
} from 'lucide-react';
import { MediaItem, MemoryNote, MenuType, iPodState, SkinType } from './types';
import { 
  saveMedia, getAllMedia, saveMemory, getAllMemories, deleteMemory 
} from './services/storage';

const App: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [memories, setMemories] = useState<MemoryNote[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [alphabet, setAlphabet] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  
  const [state, setState] = useState<iPodState>({
    currentMenu: 'MAIN',
    history: [],
    selectedIndex: 0,
    currentMediaIndex: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    searchTerm: '',
    backlight: true,
    activeMemoryId: null,
    skin: 'classic',
    batteryLevel: 100,
  });

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScrollTime = useRef<number>(0);

  // Initialize and load data
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    setTimeout(() => setIsBooting(false), 2000);
    
    const load = async () => {
      const m = await getAllMedia();
      const mems = await getAllMemories();
      if (mems.length === 0) {
        const firstMem = { 
          id: 'welcome', 
          title: 'BIENVENIDO', 
          content: 'ESTE ES TU IPOD PIXEL.\n\nSIN IA. SIN NUBE.\nPURO PIXEL.\n\nGUARDA TUS MEMORIAS Y MUSICA LOCALMENTE EN TU NAVEGADOR.',
          date: new Date().toLocaleDateString()
        };
        await saveMemory(firstMem);
        mems.push(firstMem);
      }
      setMedia(m);
      setMemories(mems);
    };
    load();

    // Battery Sync
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setState(s => ({ ...s, batteryLevel: Math.round(battery.level * 100) }));
        battery.onlevelchange = () => {
          setState(s => ({ ...s, batteryLevel: Math.round(battery.level * 100) }));
        };
      });
    }

    // Preload Mechanical Click Sound
    clickAudioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=');
    
    return () => clearInterval(timer);
  }, []);

  // Theme Sync
  useEffect(() => {
    document.body.className = `skin-${state.skin} ${state.backlight ? 'backlight-on' : ''}`;
  }, [state.skin, state.backlight]);

  // Audio Playback Events
  useEffect(() => {
    const player = audioPlayerRef.current;
    if (!player) return;

    const onTimeUpdate = () => {
      setState(s => ({ ...s, currentTime: player.currentTime, duration: player.duration || 0 }));
    };
    const onEnded = () => {
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
    };

    player.addEventListener('timeupdate', onTimeUpdate);
    player.addEventListener('ended', onEnded);
    return () => {
      player.removeEventListener('timeupdate', onTimeUpdate);
      player.removeEventListener('ended', onEnded);
    };
  }, []);

  // Update Audio Source
  useEffect(() => {
    if (state.currentMediaIndex !== null && media[state.currentMediaIndex]) {
      const current = media[state.currentMediaIndex];
      const url = URL.createObjectURL(current.data);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        if (state.isPlaying) audioPlayerRef.current.play();
      }
      return () => URL.revokeObjectURL(url);
    }
  }, [state.currentMediaIndex]);

  useEffect(() => {
    if (audioPlayerRef.current) {
      if (state.isPlaying) audioPlayerRef.current.play().catch(() => {});
      else audioPlayerRef.current.pause();
    }
  }, [state.isPlaying]);

  const hapticClick = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const navigate = (to: MenuType) => {
    hapticClick();
    setState(prev => ({
      ...prev,
      history: [...prev.history, prev.currentMenu],
      currentMenu: to,
      selectedIndex: 0
    }));
  };

  const goBack = () => {
    hapticClick();
    if (state.history.length === 0) return;
    const prevMenu = state.history[state.history.length - 1];
    setState(prev => ({
      ...prev,
      currentMenu: prevMenu,
      history: prev.history.slice(0, -1),
      selectedIndex: 0
    }));
  };

  // Game: Brick Logic
  useEffect(() => {
    if (state.currentMenu !== 'GAME_BRICK' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = 2;
    let dy = -2;
    const ballRadius = 3;
    const paddleHeight = 6;
    const paddleWidth = 40;
    
    const rowCount = 5;
    const colCount = 8;
    const bWidth = 30;
    const bHeight = 10;
    const bPadding = 3;
    const bOffsetTop = 20;
    const bOffsetLeft = 10;

    const bricks: any[] = [];
    for(let c=0; c<colCount; c++) {
      bricks[c] = [];
      for(let r=0; r<rowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    let frameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Bricks
      for(let c=0; c<colCount; c++) {
        for(let r=0; r<rowCount; r++) {
          if(bricks[c][r].status === 1) {
            const bx = (c*(bWidth+bPadding))+bOffsetLeft;
            const by = (r*(bHeight+bPadding))+bOffsetTop;
            bricks[c][r].x = bx;
            bricks[c][r].y = by;
            ctx.fillStyle = "black";
            ctx.fillRect(bx, by, bWidth, bHeight);
          }
        }
      }

      // Ball (Pixelated square)
      ctx.fillStyle = "black";
      ctx.fillRect(x-ballRadius, y-ballRadius, ballRadius*2, ballRadius*2);

      // Paddle
      const paddleX = (state.selectedIndex / 50) * (canvas.width - paddleWidth);
      ctx.fillRect(paddleX, canvas.height-paddleHeight-5, paddleWidth, paddleHeight);

      // Wall Bounce
      if(x + dx > canvas.width-ballRadius || x + dx < ballRadius) dx = -dx;
      if(y + dy < ballRadius) dy = -dy;
      else if(y + dy > canvas.height-ballRadius-10) {
        if(x > paddleX && x < paddleX + paddleWidth) dy = -dy;
        else { x = canvas.width/2; y = canvas.height-30; dx=2; dy=-2; }
      }

      // Brick Collision
      for(let c=0; c<colCount; c++) {
        for(let r=0; r<rowCount; r++) {
          const b = bricks[c][r];
          if(b.status === 1) {
            if(x > b.x && x < b.x+bWidth && y > b.y && y < b.y+bHeight) {
              dy = -dy;
              b.status = 0;
            }
          }
        }
      }

      x += dx; y += dy;
      frameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameId);
  }, [state.currentMenu, state.selectedIndex]);

  // Menu Definition
  const menuItems = useMemo(() => {
    switch (state.currentMenu) {
      case 'MAIN':
        return [
          { label: 'Music', icon: <Music size={14}/>, action: () => navigate('SONGS') },
          { label: 'Memories', icon: <FileText size={14}/>, action: () => navigate('MEMORIES_LIST') },
          { label: 'Extras', icon: <Gamepad2 size={14}/>, action: () => navigate('EXTRAS') },
          { label: 'Settings', icon: <Settings size={14}/>, action: () => navigate('SETTINGS') }
        ];
      case 'SONGS':
        return [
          { label: 'Upload Song', icon: <Plus size={14}/>, action: () => fileInputRef.current?.click() },
          ...media.filter(m => m.type === 'audio').map((m, idx) => ({
            label: m.title.toUpperCase(),
            icon: <Disc size={14}/>,
            action: () => {
              setState(s => ({ ...s, currentMediaIndex: idx, isPlaying: true }));
              navigate('PLAYING');
            }
          }))
        ];
      case 'MEMORIES_LIST':
        return [
          { label: 'Add Memory', icon: <Plus size={14}/>, action: () => {
            const title = prompt("Title?");
            const content = prompt("Memory text?");
            if (title && content) {
              const m = { id: Date.now().toString(), title, content, date: new Date().toLocaleDateString() };
              saveMemory(m).then(() => setMemories(prev => [...prev, m]));
            }
          }},
          ...memories.map(m => ({
            label: m.title.toUpperCase(),
            icon: <FileText size={14}/>,
            action: () => {
              setState(s => ({ ...s, activeMemoryId: m.id }));
              navigate('MEMORY_VIEW');
            }
          }))
        ];
      case 'SETTINGS':
        return [
          { label: 'Backlight: ' + (state.backlight ? 'ON' : 'OFF'), icon: <Zap size={14}/>, action: () => setState(s => ({ ...s, backlight: !s.backlight })) },
          { label: 'Skin: ' + state.skin.toUpperCase(), icon: <Monitor size={14}/>, action: () => navigate('SKIN_PICKER') },
          { label: 'Diagnostics', icon: <Activity size={14}/>, action: () => navigate('DIAGNOSTIC') },
          { label: 'About', icon: <Info size={14}/>, action: () => navigate('ABOUT') },
          { label: 'Reset iPod', icon: <Trash2 size={14}/>, action: () => { if(confirm("Wipe all?")) { indexedDB.deleteDatabase('iPodRetroDB'); location.reload(); }} }
        ];
      case 'SKIN_PICKER':
        return [
          { label: 'Classic White', icon: <Monitor size={14}/>, action: () => setState(s => ({ ...s, skin: 'classic' })) },
          { label: 'Video Black', icon: <Monitor size={14}/>, action: () => setState(s => ({ ...s, skin: 'video' })) }
        ];
      case 'EXTRAS':
        return [
          { label: 'Brick Game', icon: <Gamepad2 size={14}/>, action: () => navigate('GAME_BRICK') },
          { label: 'Clock', icon: <Clock size={14}/>, action: () => {} },
          { label: 'Search', icon: <Search size={14}/>, action: () => {} }
        ];
      default: return [];
    }
  }, [state.currentMenu, state.backlight, state.skin, media, memories]);

  const handleWheel = (e: any) => {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    
    if (lastAngle.current !== null) {
      let diff = angle - lastAngle.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      const sensitivity = 20;
      if (Math.abs(diff) > sensitivity) {
        const now = Date.now();
        const timeDiff = now - lastScrollTime.current;
        lastScrollTime.current = now;

        hapticClick();
        const dir = diff > 0 ? 1 : -1;
        const count = menuItems.length || 50;
        
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + dir + count) % count
        }));

        // Alphabet Bubble Overlay
        if (timeDiff < 100 && menuItems.length > 5) {
          const char = menuItems[state.selectedIndex]?.label?.[0];
          if (char) setAlphabet(char);
          setTimeout(() => setAlphabet(null), 800);
        }

        lastAngle.current = angle;
      }
    } else lastAngle.current = angle;
  };

  const handleSelect = () => {
    if (menuItems[state.selectedIndex]) menuItems[state.selectedIndex].action();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const renderLCD = () => {
    if (isBooting) return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-70">
        <Disc size={48} className="animate-spin-slow mb-4" />
        <div className="text-[12px] tracking-[6px] animate-pulse">IPOD PIXEL</div>
      </div>
    );

    if (state.currentMenu === 'PLAYING') {
      const current = state.currentMediaIndex !== null ? media[state.currentMediaIndex] : null;
      const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
      return (
        <div className="flex-1 p-5 flex flex-col ghosting-text">
          <div className="flex justify-between items-center text-[10px] mb-6 font-bold">
            <Shuffle size={12} opacity={0.3}/>
            <span className="tracking-widest">NOW PLAYING</span>
            <Repeat size={12} opacity={0.3}/>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-28 h-28 border-2 border-current p-2 mb-6 flex items-center justify-center">
              <Disc size={70} className={state.isPlaying ? "animate-spin-slow" : ""} />
            </div>
            <div className="text-[14px] font-bold uppercase truncate w-full mb-1">{current?.title || 'EMPTY'}</div>
            <div className="text-[10px] opacity-60 uppercase tracking-widest">{current?.artist || 'UNKNOWN'}</div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span>{formatTime(state.currentTime)}</span>
              <span>-{formatTime(state.duration - state.currentTime)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (state.currentMenu === 'GAME_BRICK') {
      return (
        <div className="flex-1 flex flex-col">
          <div className="p-2 border-b border-current text-[10px] flex justify-between font-bold">
            <span>BRICK.EXE</span>
            <span>SCORE: 000</span>
          </div>
          <canvas ref={canvasRef} width={340} height={200} className="w-full h-full" />
        </div>
      );
    }

    if (state.currentMenu === 'ABOUT') {
      return (
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center ghosting-text">
          <HardDrive size={48} className="mb-4 opacity-40" />
          <div className="text-[14px] font-bold mb-4">PIXEL IPOD CLASSIC</div>
          <div className="text-[10px] leading-relaxed opacity-60">
            DESIGNED BY RETRO PIXEL<br/>
            ASSEMBLED IN HYPERSPACE<br/><br/>
            MODEL: A1059 (V2)<br/>
            FIRMWARE: PIXEL.4.0.1<br/>
          </div>
          <div className="mt-8 pt-4 border-t border-current/20 w-full text-[9px] font-mono engraved-text uppercase">
            "FOR ALL MY MEMORIES"
          </div>
        </div>
      );
    }

    if (state.currentMenu === 'MEMORY_VIEW') {
      const memory = memories.find(m => m.id === state.activeMemoryId);
      return (
        <div className="flex-1 p-5 flex flex-col ghosting-text overflow-hidden">
          <div className="border-b-2 border-current pb-2 mb-3 flex justify-between items-end">
            <span className="text-sm font-bold uppercase truncate pr-2">{memory?.title}</span>
            <span className="text-[10px] opacity-60 flex-shrink-0">{memory?.date}</span>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar flex-1">
            {memory?.content}
          </div>
        </div>
      );
    }

    if (state.currentMenu === 'DIAGNOSTIC') {
      return (
        <div className="flex-1 p-5 font-mono text-[9px] space-y-1 leading-tight">
          <div className="text-[11px] font-bold border-b border-current mb-2">DIAG REPORT</div>
          <div>CPU: PX-9900 @ 40MHZ</div>
          <div>RAM: 32MB TESTED OK</div>
          <div>DISK: {media.length} MEDIA ITEMS</div>
          <div>MEM: {memories.length} NOTES STORED</div>
          <div className="mt-4 opacity-50">----------------------</div>
          <div>KERNEL: RETRO_OS 1.0</div>
          <div>HAPTICS: ACTIVE</div>
          <div className="mt-2 text-[10px] animate-pulse">SYSTEM READY...</div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col ghosting-text">
        <div className="p-3 border-b border-current/20 flex justify-between items-center text-[10px] font-bold">
          <span className="uppercase tracking-widest">{state.currentMenu}</span>
          <div className="flex items-center gap-2">
            {state.isPlaying && <Play size={10} fill="currentColor"/>}
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, idx) => (
            <div 
              key={idx}
              className={`px-5 py-3 flex items-center justify-between text-xs cursor-pointer border-b border-current/5 ${state.selectedIndex === idx ? 'menu-selected' : ''}`}
              onClick={() => { setState(s => ({ ...s, selectedIndex: idx })); handleSelect(); }}
            >
              <div className="flex items-center gap-4">
                {item.icon}
                <span className="uppercase tracking-tighter">{item.label}</span>
              </div>
              <ChevronRight size={14} className={state.selectedIndex === idx ? 'opacity-100' : 'opacity-10'}/>
            </div>
          ))}
          {menuItems.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 mt-20">
              <Database size={32} className="mb-2" />
              <div className="text-[10px]">EMPTY DISK</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ipod-body">
      <div className="pixel-viewport">
        <div className="hardware-grid" />
        <div className="flicker-overlay" />
        <div className="glass-reflection" />
        
        <div className="flex justify-between items-center px-4 py-2 text-[10px] font-bold border-b border-black/10 z-10">
          <div className="flex items-center gap-1.5"><Disc size={12}/> iPod</div>
          <div className="flex items-center gap-1.5">
            {state.batteryLevel > 80 ? <BatteryFull size={14}/> : state.batteryLevel > 20 ? <BatteryMedium size={14}/> : <BatteryLow size={14}/>}
            <span>{state.batteryLevel}%</span>
          </div>
        </div>

        {renderLCD()}

        {alphabet && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[200]">
            <div className="alphabet-bubble">{alphabet}</div>
          </div>
        )}
      </div>

      <div className="wheel-area">
        <div className="wheel-ring" 
             ref={wheelRef}
             onMouseDown={() => { lastAngle.current = null; }}
             onMouseMove={(e) => { if(e.buttons === 1) handleWheel(e); }}
             onTouchMove={handleWheel}
             onMouseUp={() => lastAngle.current = null}
             onTouchEnd={() => lastAngle.current = null}>
          
          <div className="nav-label top-8" onClick={goBack}>MENU</div>
          <div className="nav-label right-8"><SkipForward size={28} /></div>
          <div className="nav-label left-8"><SkipBack size={28} /></div>
          <div className="nav-label bottom-8" onClick={() => setState(s => ({...s, isPlaying: !s.isPlaying}))}>
            {state.isPlaying ? <Pause size={28} /> : <Play size={28} />}
          </div>

          <button className="center-btn" onClick={handleSelect} />
        </div>
      </div>

      <audio ref={audioPlayerRef} />
      <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={async (e) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const item: MediaItem = { 
          id: Date.now().toString(), 
          title: file.name.toUpperCase().replace(/\.[^/.]+$/, ""), 
          artist: 'LOCAL FILE', 
          album: 'PIXEL DRIVE', 
          type: 'audio', 
          data: file, 
          fileName: file.name 
        };
        await saveMedia(item);
        setMedia(prev => [...prev, item]);
        hapticClick();
      }} />

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--lcd-text); opacity: 0.4; border-radius: 2px; }
      `}</style>
    </div>
  );
};

export default App;