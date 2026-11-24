export type MediaSessionMediaType = 'audio' | 'video';

export type MediaAccessSession = {
  id: string;
  ownerId: string;
  ownerName: string;
  status: 'pending' | 'capturing' | 'delegated';
  mediaTypes: MediaSessionMediaType[];
  origin?: string;
  onStop: () => void;
};
