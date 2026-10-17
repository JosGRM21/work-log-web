import type { WorkStatus } from '../../shared/types.js';

export interface StatusVisualConfig {
  label: string;
  pillClass: string;
  dotClass: string;
  glowColor: string;
  nodeRing: string;
  ping: boolean;
}

export const STATUS_CONFIG: Record<WorkStatus, StatusVisualConfig> = {
  pending: {
    label: 'Por realizar',
    pillClass: 'bg-black/60 text-[#e8eaed] border-white/15',
    dotClass: 'bg-[#9aa0a6]',
    glowColor: 'from-white/[0.06]',
    nodeRing: 'ring-white/10',
    ping: false,
  },
  in_progress: {
    label: 'En curso',
    pillClass:
      'bg-[#081836]/90 text-[#8ab4f8] border-[#4285F4]/35 shadow-[0_0_15px_rgba(66,133,244,0.15)]',
    dotClass: 'bg-[#4285F4] shadow-[0_0_8px_#4285F4]',
    glowColor: 'from-[#1a73e8]/25',
    nodeRing: 'ring-[#4285F4]/25',
    ping: true,
  },
  completed: {
    label: 'Terminado',
    pillClass:
      'bg-[#062014]/90 text-[#81c995] border-[#34a853]/35 shadow-[0_0_15px_rgba(52,168,83,0.15)]',
    dotClass: 'bg-[#34a853] shadow-[0_0_8px_#34a853]',
    glowColor: 'from-[#34a853]/15',
    nodeRing: 'ring-[#34a853]/25',
    ping: false,
  },
};
