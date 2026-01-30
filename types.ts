
export type MediaType = 'audio' | 'video';
export type SkinType = 'classic' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  type: MediaType;
  data: Blob;
  fileName: string;
}

export interface MemoryNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type MenuType = 
  | 'MAIN' 
  | 'MUSIC' 
  | 'VIDEOS'
  | 'SONGS' 
  | 'PLAYING' 
  | 'SETTINGS' 
  | 'ABOUT' 
  | 'SEARCH' 
  | 'EXTRAS' 
  | 'GAME_BRICK'
  | 'MEMORIES_LIST'
  | 'MEMORY_VIEW'
  | 'DIAGNOSTIC'
  | 'SKIN_PICKER';

export interface iPodState {
  currentMenu: MenuType;
  history: MenuType[];
  selectedIndex: number;
  currentMediaIndex: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  searchTerm: string;
  backlight: boolean;
  activeMemoryId: string | null;
  skin: SkinType;
  batteryLevel: number;
}
